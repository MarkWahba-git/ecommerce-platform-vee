import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';
import { WishlistClient } from './WishlistClient';

export const metadata: Metadata = { title: 'Wunschliste' };

export default async function WishlistPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const items = await db.wishlist.findMany({
    where: { customerId: session.customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          basePrice: true,
          compareAtPrice: true,
          type: true,
          images: { where: { isPrimary: true }, take: 1, select: { url: true, altText: true } },
        },
      },
    },
  });

  const serialized = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    createdAt: item.createdAt.toISOString(),
    product: {
      ...item.product,
      basePrice: item.product.basePrice.toString(),
      compareAtPrice: item.product.compareAtPrice?.toString() ?? null,
    },
  }));

  return <WishlistClient initialItems={serialized} />;
}
