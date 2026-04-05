import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@vee/db';
import { formatPrice, ORDER_STATUS, ORDER_SOURCE } from '@vee/shared';

export const metadata: Metadata = { title: 'Orders' };

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  PENDING:           'bg-yellow-50  text-yellow-800  ring-yellow-600/20',
  CONFIRMED:         'bg-blue-50    text-blue-800    ring-blue-600/20',
  PROCESSING:        'bg-indigo-50  text-indigo-800  ring-indigo-600/20',
  AWAITING_APPROVAL: 'bg-orange-50  text-orange-800  ring-orange-600/20',
  SHIPPED:           'bg-cyan-50    text-cyan-800    ring-cyan-600/20',
  DELIVERED:         'bg-teal-50    text-teal-800    ring-teal-600/20',
  COMPLETED:         'bg-green-50   text-green-800   ring-green-600/20',
  CANCELLED:         'bg-red-50     text-red-700     ring-red-600/10',
  REFUNDED:          'bg-gray-50    text-gray-700    ring-gray-500/10',
};

const SOURCE_STYLES: Record<string, string> = {
  WEBSITE: 'bg-violet-50 text-violet-700 ring-violet-700/10',
  ETSY:    'bg-orange-50 text-orange-700 ring-orange-700/10',
  AMAZON:  'bg-yellow-50 text-yellow-700 ring-yellow-700/10',
  MANUAL:  'bg-gray-50   text-gray-600   ring-gray-500/10',
};

function Badge({ label, styleClass }: { label: string; styleClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styleClass}`}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Fetch orders with optional filters
// ---------------------------------------------------------------------------

async function getOrders(status?: string, source?: string) {
  return db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(source ? { source } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      source: true,
      total: true,
      currency: true,
      createdAt: true,
      customer: {
        select: { firstName: true, lastName: true, email: true },
      },
      _count: { select: { items: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SearchParams {
  status?: string;
  source?: string;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { status, source } = await searchParams;
  const orders = await getOrders(status, source);

  const allStatuses = Object.values(ORDER_STATUS);
  const allSources = Object.values(ORDER_SOURCE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Orders</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {orders.length} order{orders.length !== 1 ? 's' : ''}
            {status ? ` · ${status}` : ''}
            {source ? ` · ${source}` : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Status filter */}
        <div className="flex flex-wrap gap-1">
          <FilterLink href="/orders" label="All" active={!status} />
          {allStatuses.map((s) => (
            <FilterLink
              key={s}
              href={`/orders?status=${s}${source ? `&source=${source}` : ''}`}
              label={s.replace(/_/g, ' ')}
              active={status === s}
            />
          ))}
        </div>

        {/* Source filter */}
        <div className="ml-auto flex gap-1">
          {allSources.map((src) => (
            <FilterLink
              key={src}
              href={`/orders?source=${src}${status ? `&status=${status}` : ''}`}
              label={src}
              active={source === src}
              variant="source"
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                Order
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Date
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Source
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total
              </th>
              <th className="relative py-3 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  No orders found.
                </td>
              </tr>
            )}
            {orders.map((order) => {
              const customerName = order.customer
                ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                : '—';
              const customerEmail = order.customer?.email ?? '—';
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      #{order.orderNumber}
                    </Link>
                    <p className="text-xs text-gray-400">{order._count.items} item{order._count.items !== 1 ? 's' : ''}</p>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>

                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-900">{customerName}</p>
                    <p className="text-xs text-gray-400">{customerEmail}</p>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <Badge
                      label={order.source}
                      styleClass={SOURCE_STYLES[order.source] ?? SOURCE_STYLES.MANUAL}
                    />
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-sm">
                    <Badge
                      label={order.status.replace(/_/g, ' ')}
                      styleClass={STATUS_STYLES[order.status] ?? STATUS_STYLES.PENDING}
                    />
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                    {formatPrice(Number(order.total), order.currency)}
                  </td>

                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm sm:pr-6">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
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

// ---------------------------------------------------------------------------
// FilterLink helper
// ---------------------------------------------------------------------------
function FilterLink({
  href,
  label,
  active,
  variant = 'status',
}: {
  href: string;
  label: string;
  active: boolean;
  variant?: 'status' | 'source';
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
    </Link>
  );
}
