import { NextRequest, NextResponse } from 'next/server';
import { db } from '@vee/db';
import { importOrdersQueue, EtsyConnector } from '@vee/core';
import type { EtsyWebhookPayload } from '@vee/shared';

// Required for raw body access in Next.js App Router
export const runtime = 'nodejs';

const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5_000 },
};

/** Resolve the event type from the payload — Etsy uses either "event_type" or "webhook_resource". */
function resolveEventType(body: EtsyWebhookPayload): string | null {
  return (body.event_type ?? body.webhook_resource ?? null) as string | null;
}

/** Persist an AuditLog entry for every incoming webhook. */
async function auditWebhookEvent(
  action: string,
  entityId: string | undefined,
  changes: unknown,
  ipAddress: string | null,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action,
        entityType: 'webhook',
        entityId: entityId ?? undefined,
        changes: changes as Record<string, unknown>,
        ipAddress: ipAddress ?? undefined,
      },
    });
  } catch (err) {
    // Non-fatal: audit logging must not block the 200 response
    console.error('[Etsy webhook] Failed to write audit log:', err);
  }
}

export async function POST(req: NextRequest) {
  // ── 1. Read raw body as Buffer ──────────────────────────────────────────────
  const rawBody = Buffer.from(await req.arrayBuffer());

  // ── 2. Extract and verify signature ───────────────────────────────────────
  const signature = req.headers.get('x-etsy-signature') ?? '';

  if (!signature) {
    return NextResponse.json({ error: 'Missing X-Etsy-Signature header' }, { status: 401 });
  }

  // Find the active Etsy marketplace to get the connector
  const marketplace = await db.marketplace.findFirst({
    where: { type: 'ETSY', isActive: true },
    select: { id: true },
  });

  if (!marketplace) {
    console.warn('[Etsy webhook] No active Etsy marketplace found');
    return NextResponse.json({ error: 'Etsy marketplace not configured' }, { status: 503 });
  }

  const connector = new EtsyConnector(marketplace.id);
  const isValid = connector.verifyWebhook(rawBody, signature);

  if (!isValid) {
    console.warn('[Etsy webhook] Signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 3. Parse body ──────────────────────────────────────────────────────────
  let body: EtsyWebhookPayload;
  try {
    body = JSON.parse(rawBody.toString('utf-8')) as EtsyWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventType = resolveEventType(body);
  const resourceId = body.resource_id != null ? String(body.resource_id) : undefined;
  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip');

  console.info(`[Etsy webhook] Received event: ${eventType ?? 'unknown'} (resource: ${resourceId ?? 'n/a'})`);

  // ── 4. Audit log (fire-and-forget) ────────────────────────────────────────
  void auditWebhookEvent(
    'etsy_webhook',
    resourceId,
    { eventType, marketplaceId: marketplace.id, ...body },
    ipAddress,
  );

  // ── 5. Dispatch to queues based on event type ─────────────────────────────
  try {
    switch (eventType) {
      case 'receipt.created': {
        // New order — queue an import so channel-sync creates it via orderService
        await importOrdersQueue.add(
          `etsy:receipt.created:${resourceId ?? Date.now()}`,
          {
            marketplaceId: marketplace.id,
            // Import only from slightly before now to catch this new receipt
            since: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          JOB_OPTIONS,
        );
        break;
      }

      case 'receipt.updated': {
        // Order update — re-import to pick up status changes
        await importOrdersQueue.add(
          `etsy:receipt.updated:${resourceId ?? Date.now()}`,
          {
            marketplaceId: marketplace.id,
            since: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          JOB_OPTIONS,
        );
        break;
      }

      case 'listing.updated': {
        // Update the local MarketplaceListing.channelData to reflect the remote state
        if (resourceId) {
          await db.marketplaceListing.updateMany({
            where: {
              marketplaceId: marketplace.id,
              externalListingId: resourceId,
            },
            data: {
              channelData: body as Record<string, unknown>,
              lastSyncedAt: new Date(),
              syncError: null,
            },
          });
          console.info(`[Etsy webhook] listing.updated: refreshed channelData for listing ${resourceId}`);
        }
        break;
      }

      case 'listing.deactivated': {
        // Mark the listing as deactivated in our DB
        if (resourceId) {
          await db.marketplaceListing.updateMany({
            where: {
              marketplaceId: marketplace.id,
              externalListingId: resourceId,
            },
            data: {
              status: 'deactivated',
              lastSyncedAt: new Date(),
            },
          });
          console.info(`[Etsy webhook] listing.deactivated: listing ${resourceId} marked deactivated`);
        }
        break;
      }

      case 'shop.updated': {
        // No automated action — log for admin awareness
        console.info(`[Etsy webhook] shop.updated: shop settings changed for marketplace ${marketplace.id}`);
        break;
      }

      default: {
        console.info(`[Etsy webhook] Unhandled event type: ${eventType ?? 'unknown'}`);
        break;
      }
    }
  } catch (err) {
    // Processing errors must not prevent the 200 — we already acknowledge receipt
    console.error(`[Etsy webhook] Error processing event ${eventType ?? 'unknown'}:`, err);
  }

  // ── 6. Acknowledge immediately ────────────────────────────────────────────
  return NextResponse.json({ received: true });
}
