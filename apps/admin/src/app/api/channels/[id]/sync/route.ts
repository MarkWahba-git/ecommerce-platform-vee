import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@vee/db';
import {
  syncInventoryQueue,
  importOrdersQueue,
  pushFulfillmentQueue,
  reconciliationQueue,
} from '@vee/core';

type SyncType = 'inventory' | 'orders' | 'fulfillment' | 'reconciliation';

const VALID_SYNC_TYPES: SyncType[] = ['inventory', 'orders', 'fulfillment', 'reconciliation'];

/**
 * POST /api/channels/[id]/sync
 * Enqueue a sync job for the given marketplace.
 *
 * Body: { type: 'inventory' | 'orders' | 'fulfillment' | 'reconciliation'; orderId?: string; since?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: marketplaceId } = await params;

  try {
    // Verify the marketplace exists
    const marketplace = await db.marketplace.findUnique({
      where: { id: marketplaceId },
      select: { id: true, name: true, type: true, isActive: true },
    });

    if (!marketplace) {
      return NextResponse.json({ error: 'Marketplace not found' }, { status: 404 });
    }

    if (!marketplace.isActive) {
      return NextResponse.json({ error: 'Marketplace is not active' }, { status: 422 });
    }

    const body = await req.json() as { type: SyncType; orderId?: string; since?: string };
    const { type, orderId, since } = body;

    if (!type || !VALID_SYNC_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid sync type. Must be one of: ${VALID_SYNC_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    let jobId: string;
    const jobOptions = {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5000 },
    };

    switch (type) {
      case 'inventory': {
        const job = await syncInventoryQueue.add(
          `sync-inventory:${marketplaceId}`,
          { marketplaceId },
          jobOptions,
        );
        jobId = job.id ?? '';
        break;
      }

      case 'orders': {
        const job = await importOrdersQueue.add(
          `import-orders:${marketplaceId}`,
          { marketplaceId, since },
          jobOptions,
        );
        jobId = job.id ?? '';
        break;
      }

      case 'fulfillment': {
        if (!orderId) {
          return NextResponse.json(
            { error: 'orderId is required for fulfillment sync' },
            { status: 400 },
          );
        }

        const job = await pushFulfillmentQueue.add(
          `push-fulfillment:${orderId}`,
          { orderId },
          jobOptions,
        );
        jobId = job.id ?? '';
        break;
      }

      case 'reconciliation': {
        const job = await reconciliationQueue.add(
          `reconciliation:${marketplaceId}`,
          { marketplaceId },
          { ...jobOptions, jobId: `reconciliation:${marketplaceId}` },
        );
        jobId = job.id ?? '';
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
    }

    return NextResponse.json({
      queued: true,
      jobId,
      type,
      marketplaceId,
      marketplace: { id: marketplace.id, name: marketplace.name, type: marketplace.type },
    });
  } catch (err) {
    console.error(`[POST /api/channels/${marketplaceId}/sync]`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to queue sync job' },
      { status: 500 },
    );
  }
}
