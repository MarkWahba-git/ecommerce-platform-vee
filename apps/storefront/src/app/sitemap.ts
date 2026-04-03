import type { MetadataRoute } from 'next';
import { db } from '@vee/db';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vee-handmade.de';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await db.product.findMany({
    where: { status: 'ACTIVE' },
    select: { slug: true, updatedAt: true },
  });

  const categories = await db.category.findMany({
    where: { isActive: true },
    select: { slug: true, updatedAt: true },
  });

  const blogPosts = await db.blogPost.findMany({
    where: { status: 'published' },
    select: { slug: true, updatedAt: true },
  });

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: `${SITE_URL}/shop/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...blogPosts.map((b) => ({
      url: `${SITE_URL}/blog/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
