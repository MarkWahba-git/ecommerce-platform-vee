import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { shippingService } from '@vee/core';
import type { PackageInfo } from '@vee/core';

/**
 * POST /api/shipping
 * Create a DHL shipment for an order.
 *
 * Body: {
 *   orderId: string;
 *   packages: PackageInfo[];
 * }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json() as {
      orderId: string;
      packages: PackageInfo[];
    };

    const { orderId, packages } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing required field: orderId' }, { status: 400 });
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({ error: 'At least one package is required' }, { status: 400 });
    }

    const result = await shippingService.createShipment(orderId, packages);

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error('[POST /api/shipping]', err);

    if (err instanceof Error && err.message.includes('not found')) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create shipment' },
      { status: 500 },
    );
  }
}
