import type { Metadata } from 'next';
import Link from 'next/link';
import { bundleService } from '@vee/core';

export const metadata: Metadata = { title: 'Product Bundles' };

const STATUS_STYLES: Record<string, string> = {
  ACTIVE:   'bg-green-50 text-green-700 ring-green-600/20',
  DRAFT:    'bg-gray-50  text-gray-600  ring-gray-500/10',
  ARCHIVED: 'bg-red-50   text-red-700   ring-red-600/10',
};

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

export default async function BundlesPage() {
  const bundles = await bundleService.listBundles();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Bundles</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Group products into bundles with a special bundle price.
          </p>
        </div>
        <Link
          href="/bundles/new"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Bundle
        </Link>
      </div>

      {/* List */}
      {bundles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto h-10 w-10 text-gray-300"
            aria-hidden="true"
          >
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <p className="mt-4 text-sm font-semibold text-gray-900">No bundles yet</p>
          <p className="mt-1 text-sm text-gray-500">
            Create your first product bundle to offer grouped deals.
          </p>
          <Link
            href="/bundles/new"
            className="mt-6 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Create Bundle
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Bundle
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Items
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Price
                </th>
                <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Created
                </th>
                <th className="relative py-3 pl-3 pr-5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {bundles.map((bundle) => (
                <tr key={bundle.id} className="hover:bg-gray-50">
                  <td className="py-4 pl-5 pr-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bundle.name}</p>
                      <p className="text-xs text-gray-400">SKU: {bundle.sku}</p>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-center text-sm text-gray-700">
                    {bundle.itemCount}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-sm font-semibold text-gray-900">
                    {EUR.format(bundle.basePrice)}
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        STATUS_STYLES[bundle.status] ?? STATUS_STYLES.DRAFT
                      }`}
                    >
                      {bundle.status.charAt(0) + bundle.status.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-right text-xs text-gray-400">
                    {new Date(bundle.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 pl-3 pr-5 text-right">
                    <Link
                      href={`/bundles/${bundle.id}`}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
