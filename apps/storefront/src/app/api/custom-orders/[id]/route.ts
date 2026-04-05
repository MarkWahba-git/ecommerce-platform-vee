import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-helpers';
import { customOrderService } from '@vee/core';

/** GET /api/custom-orders/[id] — Get a single custom order detail for the authenticated customer */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const request = await customOrderService.getById(id);

    if (!request || request.customerId !== session.customerId) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(request);
  } catch (error) {
    console.error('[Custom Order GET]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

/** POST /api/custom-orders/[id] — Customer actions (e.g. approve-proof) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await customOrderService.getById(id);

    if (!existing || existing.customerId !== session.customerId) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const body = await request.json() as { action?: string };

    if (body.action === 'approve-proof') {
      const updated = await customOrderService.approveProof(id);
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Unbekannte Aktion' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[Custom Order POST]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
