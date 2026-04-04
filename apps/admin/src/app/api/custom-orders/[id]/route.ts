import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { customOrderService } from '@vee/core';

/** GET /api/custom-orders/[id] — Get a single custom order request with customer info */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const request = await customOrderService.getById(id);

    if (!request) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('[Admin Custom Order GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** PATCH /api/custom-orders/[id] — Update status, quote fields, or admin notes */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as {
      status?: string;
      quotedPrice?: number;
      quotedDays?: number;
      adminNotes?: string;
      action?: string;
    };

    // Dedicated action: convert to order
    if (body.action === 'convert-to-order') {
      const order = await customOrderService.convertToOrder(id);
      return NextResponse.json(order);
    }

    if (!body.status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const updated = await customOrderService.updateStatus(id, body.status, {
      quotedPrice: body.quotedPrice,
      quotedDays: body.quotedDays,
      adminNotes: body.adminNotes,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Admin Custom Order PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
