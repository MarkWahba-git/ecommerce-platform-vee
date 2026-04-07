import type { Metadata } from 'next';
import { db } from '@vee/db';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import type { ProductCardData } from '@/components/product/ProductCard';

// ISR: Product listings change frequently — revalidate every 5 minutes
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'Entdecke alle handgefertigten Produkte von Vee Handmade — Schmuck, Wohnaccessoires, personalisierte Geschenke und digitale Produkte.',
};

const PAGE_SIZE = 20;

const typeLabels: Record<string, string> = {
  PHYSICAL: 'Handmade',
  DIGITAL: 'Digital',
  PERSONALIZED: 'Individuell',
};

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    page?: string;
    q?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  // Build Prisma where clause
  const where: Parameters<typeof db.product.findMany>[0]['where'] = {
    status: 'ACTIVE',
    ...(params.type ? { type: params.type as 'PHYSICAL' | 'DIGITAL' | 'PERSONALIZED' } : {}),
    ...(params.minPrice || params.maxPrice
      ? {
          basePrice: {
            ...(params.minPrice ? { gte: parseFloat(params.minPrice) } : {}),
            ...(params.maxPrice ? { lte: parseFloat(params.maxPrice) } : {}),
          },
        }
      : {}),
    ...(params.category
      ? {
          categories: {
            some: { category: { slug: params.category } },
          },
        }
      : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' } },
            { shortDescription: { contains: params.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [products, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: [{ isFeatured: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
      },
    }),
    db.product.count({ where }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

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

  // Build URL helper for filter links
  function buildUrl(overrides: Record<string, string | undefined>) {
    const base = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) base.set(k, v);
    }
    return `/shop?${base.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: 'Shop' }]} />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Alle Produkte</h1>
        <p className="mt-2 text-muted-foreground">
          {total} {total === 1 ? 'Produkt' : 'Produkte'} gefunden
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Filters */}
        <aside className="w-full flex-shrink-0 lg:w-60">
          <div className="rounded-lg border border-border bg-background p-5 space-y-6">
            {/* Search */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                Suche
              </h2>
              <form method="GET" action="/shop">
                <input
                  type="text"
                  name="q"
                  defaultValue={params.q ?? ''}
                  placeholder="Produkte suchen…"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </form>
            </div>

            {/* Product Type */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                Produktart
              </h2>
              <ul className="space-y-1">
                <li>
                  <a
                    href={buildUrl({ type: undefined, page: undefined })}
                    className={`block rounded px-2 py-1.5 text-sm transition hover:bg-muted ${!params.type ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
                  >
                    Alle
                  </a>
                </li>
                {(['PHYSICAL', 'DIGITAL', 'PERSONALIZED'] as const).map((t) => (
                  <li key={t}>
                    <a
                      href={buildUrl({ type: t, page: undefined })}
                      className={`block rounded px-2 py-1.5 text-sm transition hover:bg-muted ${params.type === t ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
                    >
                      {typeLabels[t]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                  Kategorien
                </h2>
                <ul className="space-y-1">
                  <li>
                    <a
                      href={buildUrl({ category: undefined, page: undefined })}
                      className={`block rounded px-2 py-1.5 text-sm transition hover:bg-muted ${!params.category ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
                    >
                      Alle Kategorien
                    </a>
                  </li>
                  {categories.map((cat) => (
                    <li key={cat.slug}>
                      <a
                        href={buildUrl({ category: cat.slug, page: undefined })}
                        className={`block rounded px-2 py-1.5 text-sm transition hover:bg-muted ${params.category === cat.slug ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground'}`}
                      >
                        {cat.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Price Range */}
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
                Preisbereich
              </h2>
              <form method="GET" action="/shop" className="flex items-center gap-2">
                {params.type && <input type="hidden" name="type" value={params.type} />}
                {params.category && (
                  <input type="hidden" name="category" value={params.category} />
                )}
                <input
                  type="number"
                  name="minPrice"
                  defaultValue={params.minPrice ?? ''}
                  placeholder="Min"
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <span className="text-muted-foreground">–</span>
                <input
                  type="number"
                  name="maxPrice"
                  defaultValue={params.maxPrice ?? ''}
                  placeholder="Max"
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  OK
                </button>
              </form>
            </div>

            {/* Reset */}
            {(params.type || params.category || params.minPrice || params.maxPrice || params.q) && (
              <a
                href="/shop"
                className="block text-center text-sm text-accent hover:underline"
              >
                Filter zurücksetzen
              </a>
            )}
          </div>
        </aside>

        {/* Product Grid + Pagination */}
        <div className="flex-1 min-w-0">
          <ProductGrid products={productCards} />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Seitennavigation"
              className="mt-10 flex items-center justify-center gap-2"
            >
              {page > 1 && (
                <a
                  href={buildUrl({ page: String(page - 1) })}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  &larr; Zurück
                </a>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={buildUrl({ page: String(p) })}
                  className={`rounded-md border px-3 py-2 text-sm transition hover:bg-muted ${
                    p === page
                      ? 'border-accent bg-accent/10 font-semibold text-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                  aria-current={p === page ? 'page' : undefined}
                >
                  {p}
                </a>
              ))}
              {page < totalPages && (
                <a
                  href={buildUrl({ page: String(page + 1) })}
                  className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  Weiter &rarr;
                </a>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
