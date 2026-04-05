import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@vee/db';
import { formatPrice } from '@vee/shared';

export const metadata: Metadata = { title: 'Products' };

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------
function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    PHYSICAL:     'bg-blue-50 text-blue-700 ring-blue-700/10',
    DIGITAL:      'bg-purple-50 text-purple-700 ring-purple-700/10',
    PERSONALIZED: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[type] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE:   'bg-green-50 text-green-700 ring-green-600/20',
    DRAFT:    'bg-gray-50 text-gray-600 ring-gray-500/10',
    ARCHIVED: 'bg-red-50 text-red-700 ring-red-600/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[status] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Server component: fetch products
// ---------------------------------------------------------------------------
async function getProducts() {
  return db.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      name: true,
      sku: true,
      type: true,
      status: true,
      basePrice: true,
      images: {
        where: { isPrimary: true },
        select: { url: true, altText: true },
        take: 1,
      },
    },
  });
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {products.length} product{products.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          + New Product
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                Product
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Type
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                SKU
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Price
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="relative py-3 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                  No products yet.{' '}
                  <Link href="/products/new" className="text-indigo-600 hover:underline">
                    Create your first product.
                  </Link>
                </td>
              </tr>
            )}
            {products.map((product) => {
              const thumb = product.images[0];
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  {/* Image + name */}
                  <td className="py-3 pl-4 pr-3 sm:pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {thumb ? (
                          <Image
                            src={thumb.url}
                            alt={thumb.altText ?? product.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
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
                      <span className="max-w-[200px] truncate text-sm font-medium text-gray-900">
                        {product.name}
                      </span>
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <TypeBadge type={product.type} />
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm font-mono text-gray-500">
                    {product.sku}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-700">
                    {formatPrice(Number(product.basePrice))}
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <StatusBadge status={product.status} />
                  </td>

                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm sm:pr-6">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/products/${product.id}`}
                        className="text-gray-500 hover:text-gray-900"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
