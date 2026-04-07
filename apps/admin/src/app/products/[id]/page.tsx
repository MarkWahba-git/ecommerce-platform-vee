import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { productService } from '@vee/core';
import { db } from '@vee/db';
import { formatPrice } from '@vee/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductWithRelations = NonNullable<Awaited<ReturnType<typeof productService.getById>>>;
type ProductImageItem = ProductWithRelations['images'][number];
type ProductVariantItem = ProductWithRelations['variants'][number];
type ProductCategoryItem = ProductWithRelations['categories'][number];
type ProductTagItem = ProductWithRelations['tags'][number];
type RecentOrderItem = Awaited<ReturnType<typeof getRecentOrders>>[number];

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await productService.getById(id);
  return { title: product ? product.name : 'Product' };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getRecentOrders(productId: string) {
  return db.orderItem.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          customer: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-50 text-green-700 ring-green-600/20',
    DRAFT: 'bg-gray-50 text-gray-600 ring-gray-500/10',
    ARCHIVED: 'bg-red-50 text-red-700 ring-red-600/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[status] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    PHYSICAL: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    DIGITAL: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    PERSONALIZED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  };
  const labels: Record<string, string> = {
    PHYSICAL: 'Physical',
    DIGITAL: 'Digital',
    PERSONALIZED: 'Personalized',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
        styles[type] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {labels[type] ?? type}
    </span>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
    CONFIRMED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    PROCESSING: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    AWAITING_APPROVAL: 'bg-orange-50 text-orange-700 ring-orange-600/20',
    SHIPPED: 'bg-teal-50 text-teal-700 ring-teal-600/20',
    DELIVERED: 'bg-green-50 text-green-700 ring-green-600/20',
    COMPLETED: 'bg-green-50 text-green-700 ring-green-600/20',
    CANCELLED: 'bg-red-50 text-red-700 ring-red-600/10',
    REFUNDED: 'bg-gray-50 text-gray-600 ring-gray-500/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[status] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {status.charAt(0) + status.slice(1).replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detail row helper
// ---------------------------------------------------------------------------

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-3 gap-4">
      <dt className="shrink-0 text-sm font-medium text-gray-500 w-40">{label}</dt>
      <dd className="flex-1 text-sm text-gray-900 text-right">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ProductViewPage({ params }: Props) {
  const { id } = await params;
  const [product, recentOrders] = await Promise.all([
    productService.getById(id),
    getRecentOrders(id),
  ]);

  if (!product) {
    notFound();
  }

  const primaryImage = product.images.find((img: ProductImageItem) => img.isPrimary) ?? product.images[0];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/products" className="text-sm text-gray-500 hover:text-gray-900">
            ← Products
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">{product.name}</h2>
          <p className="mt-0.5 text-sm text-gray-500 font-mono">{product.sku}</p>
        </div>
        <Link
          href={`/products/${product.id}/edit`}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          Edit Product
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: image + status */}
        <div className="space-y-4">
          {/* Primary image */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 aspect-square">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage.url}
                alt={primaryImage.altText ?? product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Image thumbnails */}
          {product.images.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {product.images.map((img: ProductImageItem) => (
                <div
                  key={img.id}
                  className={`relative h-14 w-14 overflow-hidden rounded-md border ${
                    img.isPrimary ? 'border-indigo-500' : 'border-gray-200'
                  } bg-gray-50`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altText ?? ''}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Status card */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Status</span>
              <StatusBadge status={product.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Type</span>
              <TypeBadge type={product.type} />
            </div>
            {product.isFeatured && (
              <div className="rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200 text-center">
                Featured Product
              </div>
            )}
          </div>
        </div>

        {/* Right column: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Core info */}
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Product Details</h3>
            </div>
            <dl className="divide-y divide-gray-100 px-6">
              <DetailRow label="Name">{product.name}</DetailRow>
              <DetailRow label="Slug">
                <span className="font-mono text-xs">{product.slug}</span>
              </DetailRow>
              <DetailRow label="Base Price">
                <span className="font-semibold">{formatPrice(Number(product.basePrice))}</span>
              </DetailRow>
              {product.compareAtPrice && (
                <DetailRow label="Compare-at Price">
                  <span className="text-gray-500 line-through">
                    {formatPrice(Number(product.compareAtPrice))}
                  </span>
                </DetailRow>
              )}
              {product.costPrice && (
                <DetailRow label="Cost Price">
                  {formatPrice(Number(product.costPrice))}
                </DetailRow>
              )}
              <DetailRow label="Tax Rate">
                {(Number(product.taxRate) * 100).toFixed(0)}%
              </DetailRow>
              {product.shortDescription && (
                <DetailRow label="Short Description">
                  {product.shortDescription}
                </DetailRow>
              )}
              {product.publishedAt && (
                <DetailRow label="Published">
                  {new Date(product.publishedAt).toLocaleDateString('de-DE')}
                </DetailRow>
              )}
              <DetailRow label="Created">
                {new Date(product.createdAt).toLocaleDateString('de-DE')}
              </DetailRow>
            </dl>
          </div>

          {/* Physical properties */}
          {(product.type === 'PHYSICAL' || product.type === 'PERSONALIZED') &&
            (product.weight || product.width || product.height || product.length) && (
              <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">Physical Properties</h3>
                </div>
                <dl className="divide-y divide-gray-100 px-6">
                  {product.weight && (
                    <DetailRow label="Weight">{Number(product.weight)}g</DetailRow>
                  )}
                  {product.width && (
                    <DetailRow label="Width">{Number(product.width)} cm</DetailRow>
                  )}
                  {product.height && (
                    <DetailRow label="Height">{Number(product.height)} cm</DetailRow>
                  )}
                  {product.length && (
                    <DetailRow label="Length">{Number(product.length)} cm</DetailRow>
                  )}
                </dl>
              </div>
            )}

          {/* Digital properties */}
          {product.type === 'DIGITAL' && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Digital Delivery</h3>
              </div>
              <dl className="divide-y divide-gray-100 px-6">
                <DetailRow label="Instant Delivery">
                  {product.isInstantDelivery ? 'Yes' : 'No'}
                </DetailRow>
                {product.maxDownloads && (
                  <DetailRow label="Max Downloads">{product.maxDownloads}</DetailRow>
                )}
                {product.downloadExpiryDays && (
                  <DetailRow label="Expiry">{product.downloadExpiryDays} days</DetailRow>
                )}
                {product.licenseType && (
                  <DetailRow label="License">
                    {product.licenseType.charAt(0) + product.licenseType.slice(1).toLowerCase()}
                  </DetailRow>
                )}
              </dl>
            </div>
          )}

          {/* Made-to-Order */}
          {product.type === 'PERSONALIZED' && (
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Made-to-Order</h3>
              </div>
              <dl className="divide-y divide-gray-100 px-6">
                <DetailRow label="Made-to-Order">
                  {product.isMadeToOrder ? 'Yes' : 'No'}
                </DetailRow>
                {product.productionDays && (
                  <DetailRow label="Production Time">
                    {product.productionDays} business days
                  </DetailRow>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* ── Variants ── */}
      {product.variants.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Variants ({product.variants.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-6 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    SKU
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Price
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Stock
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {product.variants.map((v: ProductVariantItem) => {
                  const available = v.inventory
                    ? v.inventory.quantity - v.inventory.reservedQuantity
                    : null;
                  return (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="py-3 pl-6 pr-3 text-sm font-medium text-gray-900">
                        {v.name}
                      </td>
                      <td className="px-3 py-3 text-sm font-mono text-gray-500">
                        {v.sku}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700">
                        {v.price !== null
                          ? formatPrice(Number(v.price))
                          : <span className="text-gray-400">Base price</span>}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-700">
                        {available !== null ? (
                          <span
                            className={
                              available <= 0
                                ? 'text-red-600 font-medium'
                                : available <= 5
                                ? 'text-amber-600 font-medium'
                                : 'text-gray-700'
                            }
                          >
                            {available}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            v.isActive
                              ? 'bg-green-50 text-green-700 ring-green-600/20'
                              : 'bg-gray-50 text-gray-600 ring-gray-500/10'
                          }`}
                        >
                          {v.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Categories & Tags ── */}
      {(product.categories.length > 0 || product.tags.length > 0) && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Categories &amp; Tags</h3>
          {product.categories.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Categories</p>
              <div className="flex flex-wrap gap-2">
                {product.categories.map((c: ProductCategoryItem) => (
                  <span
                    key={c.categoryId}
                    className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                  >
                    {c.category.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {product.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tags</p>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((t: ProductTagItem) => (
                  <span
                    key={t.tagId}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10"
                  >
                    {t.tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SEO ── */}
      {product.seoMeta && (
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-gray-900">SEO</h3>
          </div>
          <dl className="divide-y divide-gray-100 px-6">
            {product.seoMeta.metaTitle && (
              <DetailRow label="Meta Title">{product.seoMeta.metaTitle}</DetailRow>
            )}
            {product.seoMeta.metaDescription && (
              <DetailRow label="Meta Description">{product.seoMeta.metaDescription}</DetailRow>
            )}
            {product.seoMeta.ogImage && (
              <DetailRow label="OG Image">
                <a
                  href={product.seoMeta.ogImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline text-xs truncate"
                >
                  {product.seoMeta.ogImage}
                </a>
              </DetailRow>
            )}
            <DetailRow label="No-Index">
              {product.seoMeta.noIndex ? 'Yes' : 'No'}
            </DetailRow>
          </dl>
        </div>
      )}

      {/* ── Recent Orders ── */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Recent Orders
          </h3>
          <span className="text-xs text-gray-500">Last 10 orders containing this product</span>
        </div>

        {recentOrders.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            No orders yet for this product.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 pl-6 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Order
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Qty
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentOrders.map((item: RecentOrderItem) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 pl-6 pr-3 text-sm">
                      <Link
                        href={`/orders/${item.order.id}`}
                        className="font-mono font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        {item.order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      {item.order.customer ? (
                        <span>
                          {item.order.customer.firstName ?? ''}{' '}
                          {item.order.customer.lastName ?? ''}
                          <span className="block text-xs text-gray-400">
                            {item.order.customer.email}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Guest</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-700">{item.quantity}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      {formatPrice(Number(item.order.total))}
                    </td>
                    <td className="px-3 py-3 text-sm">
                      <OrderStatusBadge status={item.order.status} />
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {new Date(item.order.createdAt).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
