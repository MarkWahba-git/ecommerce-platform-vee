import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@vee/db';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const item = await db.wishlist.upsert({
      where: {
        customerId_productId: { customerId, productId },
      },
      update: {},
      create: { customerId, productId },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('[Wishlist Add Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await params;
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    await db.wishlist.delete({
      where: {
        customerId_productId: { customerId, productId },
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[Wishlist Remove Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
