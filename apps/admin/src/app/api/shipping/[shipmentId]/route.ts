import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shippingService } from '@vee/core';
import { db } from '@vee/db';

interface RouteContext {
  params: Promise<{ shipmentId: string }>;
}

/**
 * GET /api/shipping/[shipmentId]
 * Return shipment details including latest tracking status.
 */
export async function GET(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { shipmentId } = await ctx.params;

    // Refresh tracking status before returning
    const trackingResult = await shippingService.trackShipment(shipmentId);

    const shipment = await db.shipment.findUniqueOrThrow({
      where: { id: shipmentId },
    });

    return NextResponse.json({
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl: shipment.trackingUrl,
      status: shipment.status,
      shippedAt: shipment.shippedAt,
      deliveredAt: shipment.deliveredAt,
      createdAt: shipment.createdAt,
      tracking: trackingResult,
    });
  } catch (err) {
    console.error('[GET /api/shipping/[shipmentId]]', err);

    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to retrieve shipment' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/shipping/[shipmentId]
 * Cancel a shipment.
 */
export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { shipmentId } = await ctx.params;

    await shippingService.cancelShipment(shipmentId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/shipping/[shipmentId]]', err);

    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    if (err instanceof Error && err.message.includes('cannot be cancelled')) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to cancel shipment' },
      { status: 500 },
    );
  }
}
