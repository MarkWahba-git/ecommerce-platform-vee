import type { Metadata } from 'next';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Inventory' };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getInventory(lowStockOnly: boolean) {
  const items = await db.inventory.findMany({
    include: {
      variant: {
        include: {
          product: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { variant: { product: { name: 'asc' } } },
  });

  if (lowStockOnly) {
    return items.filter((i) => i.quantity - i.reservedQuantity <= i.lowStockThreshold);
  }
  return items;
}

// ---------------------------------------------------------------------------
// Stock level helpers
// ---------------------------------------------------------------------------

function stockStatus(available: number, threshold: number): 'out' | 'low' | 'ok' {
  if (available <= 0) return 'out';
  if (available <= threshold) return 'low';
  return 'ok';
}

function StockBadge({ available, threshold }: { available: number; threshold: number }) {
  const status = stockStatus(available, threshold);
  if (status === 'out') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
        Out of stock
      </span>
    );
  }
  if (status === 'low') {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10">
        Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      In stock
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SearchParams {
  low?: string;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { low } = await searchParams;
  const lowStockOnly = low === '1';
  const items = await getInventory(lowStockOnly);

  const outCount = items.filter((i) => i.quantity - i.reservedQuantity <= 0).length;
  const lowCount = items.filter((i) => {
    const avail = i.quantity - i.reservedQuantity;
    return avail > 0 && avail <= i.lowStockThreshold;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Inventory</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {items.length} variant{items.length !== 1 ? 's' : ''}
            {outCount > 0 && (
              <span className="ml-2 text-red-600">{outCount} out of stock</span>
            )}
            {lowCount > 0 && (
              <span className="ml-2 text-orange-600">{lowCount} low stock</span>
            )}
          </p>
        </div>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2">
        <a
          href="/inventory"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !lowStockOnly
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
          }`}
        >
          All items
        </a>
        <a
          href="/inventory?low=1"
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            lowStockOnly
              ? 'bg-orange-500 text-white'
              : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
          }`}
        >
          Low stock only
        </a>
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
                Variant / SKU
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                On Hand
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Reserved
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Available
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Threshold
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Update Qty
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-gray-500">
                  No inventory records found.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const available = item.quantity - item.reservedQuantity;
              const status = stockStatus(available, item.lowStockThreshold);
              const rowClass =
                status === 'out'
                  ? 'bg-red-50/40 hover:bg-red-50'
                  : status === 'low'
                  ? 'bg-orange-50/40 hover:bg-orange-50'
                  : 'hover:bg-gray-50';

              return (
                <tr key={item.id} className={rowClass}>
                  <td className="py-3 pl-4 pr-3 sm:pl-6">
                    <a
                      href={`/products/${item.variant.product.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      {item.variant.product.name}
                    </a>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-900">{item.variant.name}</p>
                    <p className="text-xs font-mono text-gray-400">{item.variant.sku}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-500">
                    {item.reservedQuantity}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-3 text-right text-sm font-semibold ${
                      status === 'out'
                        ? 'text-red-700'
                        : status === 'low'
                        ? 'text-orange-700'
                        : 'text-gray-900'
                    }`}
                  >
                    {available}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-500">
                    {item.lowStockThreshold}
                  </td>
                  <td className="px-3 py-3">
                    <StockBadge available={available} threshold={item.lowStockThreshold} />
                  </td>
                  <td className="px-3 py-3">
                    <form
                      method="POST"
                      action={`/api/inventory/${item.id}/update`}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="number"
                        name="quantity"
                        defaultValue={item.quantity}
                        min={0}
                        className="w-20 rounded-md border-0 px-2 py-1 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                      >
                        Update
                      </button>
                    </form>
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
