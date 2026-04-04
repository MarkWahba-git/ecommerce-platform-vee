import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@vee/db';
import { addressSchema } from '@vee/shared';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const existing = await db.address.findUnique({ where: { id } });
    if (!existing || existing.customerId !== customerId) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    const body = await request.json();
    const data = addressSchema.partial().parse(body);

    const address = await db.address.update({
      where: { id },
      data,
    });

    return NextResponse.json({ address });
  } catch (error) {
    console.error('[Address Update Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const existing = await db.address.findUnique({ where: { id } });
    if (!existing || existing.customerId !== customerId) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }

    await db.address.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[Address Delete Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
