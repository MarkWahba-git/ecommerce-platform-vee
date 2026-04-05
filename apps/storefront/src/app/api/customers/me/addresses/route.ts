import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@vee/db';
import { addressSchema } from '@vee/shared';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const addresses = await db.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('[Addresses Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const body = await request.json();
    const data = addressSchema.parse(body);

    const address = await db.address.create({
      data: { customerId, ...data },
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    console.error('[Address Create Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
