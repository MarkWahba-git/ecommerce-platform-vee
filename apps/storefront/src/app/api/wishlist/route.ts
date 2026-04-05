import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@vee/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const customerId = cookieStore.get('customerId')?.value;

    if (!customerId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const items = await db.wishlist.findMany({
      where: { customerId },
      include: {
        product: {
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            basePrice: true,
            compareAtPrice: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('[Wishlist Error]', error);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
