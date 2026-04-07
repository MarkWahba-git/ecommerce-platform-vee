import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@vee/db';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import type { ProductCardData } from '@/components/product/ProductCard';

// ISR: Category pages change moderately — revalidate every 10 minutes
export const revalidate = 600;

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await db.category.findUnique({
    where: { slug },
    include: { seoMeta: true },
  });

  if (!category) return { title: 'Kategorie nicht gefunden' };

  return {
    title: category.seoMeta?.metaTitle ?? category.name,
    description:
      category.seoMeta?.metaDescription ??
      category.description ??
      `Entdecke handgefertigte ${category.name} von Vee Handmade.`,
    openGraph: {
      title: category.seoMeta?.ogTitle ?? category.name,
      description: category.seoMeta?.ogDescription ?? category.description ?? undefined,
      images: category.seoMeta?.ogImage
        ? [{ url: category.seoMeta.ogImage }]
        : category.imageUrl
          ? [{ url: category.imageUrl }]
          : [],
    },
    alternates: {
      canonical: category.seoMeta?.canonicalUrl ?? `/shop/${slug}`,
    },
    robots: category.seoMeta?.noIndex ? { index: false } : undefined,
  };
}

export async function generateStaticParams() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  return categories.map((c) => ({ category: c.slug }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;

  const category = await db.category.findUnique({
    where: { slug },
  });

  if (!category || !category.isActive) {
    notFound();
  }

  const products = await db.product.findMany({
    where: {
      status: 'ACTIVE',
      categories: { some: { categoryId: category.id } },
    },
    orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      images: { orderBy: { sortOrder: 'asc' }, take: 1 },
    },
  });

  const productCards: ProductCardData[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    basePrice: p.basePrice.toString(),
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
    images: p.images.map((img) => ({ url: img.url, altText: img.altText })),
    shortDescription: p.shortDescription,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: 'Shop', href: '/shop' },
          { label: category.name },
        ]}
      />

      {/* Category header */}
      <div className="mb-10">
        {category.imageUrl && (
          <div
            className="mb-6 h-48 w-full rounded-xl bg-cover bg-center"
            style={{ backgroundImage: `url(${category.imageUrl})` }}
            role="img"
            aria-label={category.name}
          />
        )}
        <h1 className="text-3xl font-bold text-foreground">{category.name}</h1>
        {category.description && (
          <p className="mt-3 max-w-2xl text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? 'Produkt' : 'Produkte'}
        </p>
      </div>

      <ProductGrid products={productCards} />
    </div>
  );
}
