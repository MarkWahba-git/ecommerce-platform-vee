import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shippingService } from '@vee/core';
import type { PackageInfo } from '@vee/core';

/**
 * POST /api/shipping/batch
 * Create DHL shipments for multiple orders in a single request.
 * Individual order failures are returned in the results array
 * rather than aborting the entire batch.
 *
 * Body: {
 *   orderIds: string[];
 *   defaultPackage?: PackageInfo;   // used for all orders unless overridden
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      orderIds: string[];
      defaultPackage?: PackageInfo;
    };

    const { orderIds, defaultPackage } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds must be a non-empty array' },
        { status: 400 },
      );
    }

    if (orderIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 orders per batch request' },
        { status: 400 },
      );
    }

    const results = await shippingService.batchCreateShipments(orderIds, defaultPackage);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      total: results.length,
      succeeded: successCount,
      failed: failureCount,
      results,
    });
  } catch (err) {
    console.error('[POST /api/shipping/batch]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Batch shipment creation failed' },
      { status: 500 },
    );
  }
}
