import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-helpers';
import { customOrderService } from '@vee/core';

/** GET /api/custom-orders — List the authenticated customer's custom order requests */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const result = await customOrderService.list({ customerId: session.customerId });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Custom Orders GET]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

/** POST /api/custom-orders — Submit a new custom order request */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const { description, attachments } = body as {
      description?: string;
      attachments?: string[];
    };

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { error: 'Beschreibung ist erforderlich' },
        { status: 400 },
      );
    }

    const customOrder = await customOrderService.submit(session.customerId, {
      description: description.trim(),
      attachments,
    });

    return NextResponse.json(customOrder, { status: 201 });
  } catch (error) {
    console.error('[Custom Orders POST]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
