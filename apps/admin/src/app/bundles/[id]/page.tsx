import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { bundleService } from '@vee/core';
import { BundleEditForm } from './BundleEditForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const bundle = await bundleService.getBundle(id);
  return { title: bundle ? `Edit: ${bundle.product.name}` : 'Bundle not found' };
}

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const NUM = new Intl.NumberFormat('de-DE');

export default async function BundleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const bundle = await bundleService.getBundle(id);

  if (!bundle) notFound();

  const { product, items, totalIndividualPrice, savings, savingsPercent } = bundle;

  return (
    <div className="space-y-8">
      {/* Breadcrumb + header */}
      <div>
        <nav className="mb-2 flex items-center gap-1 text-xs text-gray-400">
          <Link href="/bundles" className="hover:text-gray-600">
            Bundles
          </Link>
          <span>/</span>
          <span className="text-gray-700">{product.name}</span>
        </nav>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{product.name}</h2>
            <p className="mt-0.5 text-sm text-gray-500">SKU: {product.sku}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
              product.status === 'ACTIVE'
                ? 'bg-green-50 text-green-700 ring-green-600/20'
                : product.status === 'ARCHIVED'
                  ? 'bg-red-50 text-red-700 ring-red-600/10'
                  : 'bg-gray-50 text-gray-600 ring-gray-500/10'
            }`}
          >
            {product.status.charAt(0) + product.status.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {/* Savings summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bundle Price</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{EUR.format(Number(product.basePrice))}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Individual Total
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-400">
            {EUR.format(totalIndividualPrice)}
          </p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Customer Saves
          </p>
          <p className="mt-1 text-2xl font-bold text-green-700">
            {savings > 0 ? `${EUR.format(savings)} (${savingsPercent.toFixed(1)}%)` : '—'}
          </p>
        </div>
      </div>

      {/* Current items (read-only display) */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Bundle Items ({items.length})
          </h3>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-400">No items in this bundle.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Product
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Variant
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Qty
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Unit Price
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 pr-5">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {items.map((item, i) => (
                <tr key={item.product.id + (item.variant?.id ?? '') + i} className="hover:bg-gray-50">
                  <td className="py-3 pl-5 pr-3">
                    <div>
                      <Link
                        href={`/products/${item.product.id}`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-gray-400">SKU: {item.product.sku}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">
                    {item.variant ? (
                      <span>
                        {item.variant.name}{' '}
                        <span className="text-xs text-gray-400">{item.variant.sku}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Base product</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-gray-700">
                    {NUM.format(item.quantity)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-700">
                    {EUR.format(item.individualPrice)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 pr-5 text-right text-sm font-medium text-gray-900">
                    {EUR.format(item.individualPrice * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td colSpan={4} className="py-3 pl-5 pr-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Total individual price
                </td>
                <td className="whitespace-nowrap px-3 py-3 pr-5 text-right text-sm font-bold text-gray-900">
                  {EUR.format(totalIndividualPrice)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Edit form */}
      <BundleEditForm bundle={bundle} />
    </div>
  );
}
