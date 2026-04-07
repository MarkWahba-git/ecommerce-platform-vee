import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@vee/db';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { ProductGallery } from '@/components/product/ProductGallery';
import { PriceDisplay } from '@/components/product/PriceDisplay';
import { AddToCartButton } from '@/components/product/AddToCartButton';
import { JsonLd } from '@/components/seo/JsonLd';
import { PersonalizationForm } from './PersonalizationForm';

// ISR: Product pages can change (stock, price, reviews) — revalidate every 5 minutes
export const revalidate = 300;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 }, seoMeta: true },
  });

  if (!product) return { title: 'Produkt nicht gefunden' };

  const primaryImage = product.images[0];
  const title = product.seoMeta?.metaTitle ?? product.name;
  const description =
    product.seoMeta?.metaDescription ??
    product.shortDescription ??
    product.description.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title: product.seoMeta?.ogTitle ?? title,
      description: product.seoMeta?.ogDescription ?? description,
      images: product.seoMeta?.ogImage
        ? [{ url: product.seoMeta.ogImage }]
        : primaryImage
          ? [{ url: primaryImage.url, alt: primaryImage.altText ?? product.name }]
          : [],
      type: 'website',
    },
    alternates: {
      canonical: product.seoMeta?.canonicalUrl ?? `/product/${slug}`,
    },
    robots: product.seoMeta?.noIndex ? { index: false, follow: false } : undefined,
  };
}

export async function generateStaticParams() {
  const products = await db.product.findMany({
    where: { status: 'ACTIVE' },
    select: { slug: true },
  });
  return products.map((p) => ({ slug: p.slug }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatEUR = (value: number | string) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    typeof value === 'string' ? parseFloat(value) : value,
  );

const typeLabel: Record<string, string> = {
  PHYSICAL: 'Handmade',
  DIGITAL: 'Digital',
  PERSONALIZED: 'Individuell',
};

// ---------------------------------------------------------------------------
// DB query (defined here so the FullProduct type can be derived)
// ---------------------------------------------------------------------------

async function fetchFullProduct(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: { inventory: true },
      },
      categories: { include: { category: true } },
      personalizationFields: { orderBy: { sortOrder: 'asc' } },
      reviews: {
        where: { isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: { select: { firstName: true, lastName: true } } },
      },
      relatedFrom: {
        include: {
          relatedProduct: {
            include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
          },
        },
        take: 4,
      },
      seoMeta: true,
    },
  });
}

type FullProduct = NonNullable<Awaited<ReturnType<typeof fetchFullProduct>>>;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const product = await fetchFullProduct(slug);

  if (!product || product.status !== 'ACTIVE') {
    notFound();
  }

  const primaryCategory = product.categories[0]?.category ?? null;
  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) / product.reviews.length
      : null;

  // JSON-LD structured data
  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription ?? product.description,
    sku: product.sku,
    image: product.images.map((img) => img.url),
    offers: {
      '@type': 'Offer',
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vee-handmade.de'}/product/${product.slug}`,
      priceCurrency: 'EUR',
      price: parseFloat(product.basePrice.toString()).toFixed(2),
      availability:
        product.variants.some((v) => (v.inventory?.quantity ?? 0) > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Vee Handmade' },
    },
    ...(avgRating !== null && product.reviews.length > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avgRating.toFixed(1),
            reviewCount: product.reviews.length,
          },
        }
      : {}),
  };

  return (
    <>
      <JsonLd data={jsonLdData} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Shop', href: '/shop' },
            ...(primaryCategory
              ? [{ label: primaryCategory.name, href: `/shop/${primaryCategory.slug}` }]
              : []),
            { label: product.name },
          ]}
        />

        {/* Main product section */}
        <div className="mt-6 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Gallery */}
          <ProductGallery images={product.images} productName={product.name} />

          {/* Product info */}
          <div className="flex flex-col gap-6">
            {/* Type badge */}
            <span className="inline-flex w-fit items-center rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
              {typeLabel[product.type] ?? product.type}
            </span>

            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>

            {/* Rating summary */}
            {avgRating !== null && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} />
                <span className="text-sm text-muted-foreground">
                  {avgRating.toFixed(1)} ({product.reviews.length}{' '}
                  {product.reviews.length === 1 ? 'Bewertung' : 'Bewertungen'})
                </span>
              </div>
            )}

            {/* Price */}
            <PriceDisplay
              price={product.basePrice.toString()}
              compareAtPrice={product.compareAtPrice?.toString()}
              size="lg"
            />

            {/* Tax note */}
            <p className="text-xs text-muted-foreground">
              inkl. {Math.round(Number(product.taxRate) * 100)}% MwSt.{' '}
              {product.type === 'PHYSICAL' && 'zzgl. Versandkosten'}
            </p>

            {/* Short description */}
            {product.shortDescription && (
              <p className="text-muted-foreground leading-relaxed">{product.shortDescription}</p>
            )}

            {/* --- PHYSICAL: Variants + Shipping --- */}
            {product.type === 'PHYSICAL' && (
              <PhysicalSection product={product} />
            )}

            {/* --- DIGITAL: Download info --- */}
            {product.type === 'DIGITAL' && (
              <DigitalSection product={product} />
            )}

            {/* --- PERSONALIZED: Customization form --- */}
            {product.type === 'PERSONALIZED' && (
              <PersonalizationForm
                productId={product.id}
                fields={product.personalizationFields}
              />
            )}

            {/* Add to cart for non-personalized */}
            {product.type !== 'PERSONALIZED' && (
              <AddToCartButton productId={product.id} className="w-full" />
            )}

            {/* Made-to-order notice */}
            {product.isMadeToOrder && product.productionDays && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Auf Bestellung gefertigt — Produktionszeit ca. {product.productionDays} Werktage
              </p>
            )}
          </div>
        </div>

        {/* Full description */}
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold text-foreground">Produktbeschreibung</h2>
          {product.descriptionHtml ? (
            <div
              className="prose prose-sm max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
            />
          ) : (
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}
        </section>

        {/* Reviews */}
        {product.reviews.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-xl font-bold text-foreground">
              Kundenbewertungen ({product.reviews.length})
            </h2>
            {avgRating !== null && (
              <div className="mb-6 flex items-center gap-3">
                <StarRating rating={avgRating} size="lg" />
                <span className="text-2xl font-bold text-foreground">{avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">von 5</span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {product.reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-lg border border-border bg-background p-5"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {review.customer.firstName && review.customer.lastName
                          ? `${review.customer.firstName} ${review.customer.lastName[0]}.`
                          : 'Verifizierter Käufer'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }).format(new Date(review.createdAt))}
                      </p>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.title && (
                    <p className="mb-1 text-sm font-medium text-foreground">{review.title}</p>
                  )}
                  {review.body && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.body}</p>
                  )}
                  {review.isVerified && (
                    <span className="mt-2 inline-block rounded bg-accent/10 px-2 py-0.5 text-xs text-accent-foreground">
                      Verifizierter Kauf
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related products */}
        {product.relatedFrom.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-xl font-bold text-foreground">Das könnte dir auch gefallen</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {product.relatedFrom.map(({ relatedProduct }) => {
                const img = relatedProduct.images[0];
                return (
                  <a
                    key={relatedProduct.id}
                    href={`/product/${relatedProduct.slug}`}
                    className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background hover:shadow-md transition"
                  >
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {img ? (
                        <img
                          src={img.url}
                          alt={img.altText ?? relatedProduct.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-accent">
                        {relatedProduct.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatEUR(relatedProduct.basePrice.toString())}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PhysicalSection({ product }: { product: FullProduct }) {
  return (
    <div className="space-y-4">
      {product.variants.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Varianten</h3>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => {
              const available = (variant.inventory?.quantity ?? 0) - (variant.inventory?.reservedQuantity ?? 0) > 0;
              return (
                <span
                  key={variant.id}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    available
                      ? 'border-border text-foreground hover:border-accent cursor-pointer'
                      : 'border-border text-muted-foreground line-through cursor-not-allowed opacity-50'
                  }`}
                  title={available ? undefined : 'Nicht auf Lager'}
                >
                  {variant.name}
                  {variant.price && ` (+${formatEUR(variant.price.toString())})`}
                </span>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-lg bg-secondary p-4 text-sm text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        <span>
          Versand aus Deutschland · Lieferzeit 3–7 Werktage · Kostenloser Versand ab 50&nbsp;€
        </span>
      </div>
    </div>
  );
}

function DigitalSection({ product }: { product: FullProduct }) {
  return (
    <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
        Digitaler Download
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {product.isInstantDelivery && (
          <li className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            Sofort-Download nach dem Kauf
          </li>
        )}
        {product.maxDownloads && (
          <li className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            Bis zu {product.maxDownloads} Downloads
          </li>
        )}
        {product.downloadExpiryDays && (
          <li className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            Download-Link gültig für {product.downloadExpiryDays} Tage
          </li>
        )}
        {product.licenseType && (
          <li className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
            Lizenz: {product.licenseType}
          </li>
        )}
        <li className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
          Kein Versand — keine Wartezeit
        </li>
      </ul>
    </div>
  );
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const starSize = size === 'lg' ? 20 : 14;
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} von 5 Sternen`}>
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.floor(rating);
        const half = !filled && i < rating;
        return (
          <svg
            key={i}
            xmlns="http://www.w3.org/2000/svg"
            width={starSize}
            height={starSize}
            viewBox="0 0 24 24"
            fill={filled ? 'currentColor' : half ? 'url(#half)' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-accent"
            aria-hidden="true"
          >
            {half && (
              <defs>
                <linearGradient id="half">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
            )}
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        );
      })}
    </div>
  );
}
