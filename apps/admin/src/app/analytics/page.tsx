import type { Metadata } from 'next';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Analytics' };

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const NUM = new Intl.NumberFormat('de-DE');

function pct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function getPeriodStats(from: Date, to: Date) {
  const [orderAgg, customerCount] = await Promise.all([
    db.order.aggregate({
      where: {
        createdAt: { gte: from, lt: to },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
      _sum: { total: true },
      _count: { _all: true },
      _avg: { total: true },
    }),
    db.customer.count({
      where: { createdAt: { gte: from, lt: to } },
    }),
  ]);

  return {
    revenue: Number(orderAgg._sum.total ?? 0),
    orders: orderAgg._count._all,
    aov: Number(orderAgg._avg.total ?? 0),
    customers: customerCount,
  };
}

async function getTopProducts(from: Date, to: Date) {
  // Aggregate revenue per product from order items
  const items = await db.orderItem.groupBy({
    by: ['productId', 'name'],
    where: {
      order: {
        createdAt: { gte: from, lt: to },
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
    },
    _sum: { totalPrice: true, quantity: true },
    orderBy: { _sum: { totalPrice: 'desc' } },
    take: 5,
  });

  return items.map((item) => ({
    productId: item.productId,
    name: item.name,
    revenue: Number(item._sum.totalPrice ?? 0),
  }));
}

async function getOrdersBySource(from: Date, to: Date) {
  const rows = await db.order.groupBy({
    by: ['source'],
    where: {
      createdAt: { gte: from, lt: to },
      status: { notIn: ['CANCELLED', 'REFUNDED'] },
    },
    _count: { _all: true },
    _sum: { total: true },
    orderBy: { _count: { source: 'desc' } },
  });

  return rows.map((r) => ({
    source: r.source,
    count: r._count._all,
    revenue: Number(r._sum.total ?? 0),
  }));
}

async function getOrdersByStatus(from: Date, to: Date) {
  const rows = await db.order.groupBy({
    by: ['status'],
    where: { createdAt: { gte: from, lt: to } },
    _count: { _all: true },
    orderBy: { _count: { status: 'desc' } },
  });

  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

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
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  subValue,
  change,
}: {
  label: string;
  value: string;
  subValue?: string;
  change: number | null;
}) {
  const isPositive = change !== null && change >= 0;
  const isNegative = change !== null && change < 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="mt-0.5 text-xs text-gray-400">{subValue}</p>}
      {change !== null && (
        <p
          className={`mt-1 text-xs font-medium ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs prev. 30 days
        </p>
      )}
      {change === null && (
        <p className="mt-1 text-xs text-gray-400">No prior data</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AnalyticsPage() {
  const now = new Date();
  const current30Start = daysAgo(30);
  const previous30Start = daysAgo(60);
  const previous30End = daysAgo(30);

  const [current, previous, topProducts, bySource, byStatus] = await Promise.all([
    getPeriodStats(current30Start, now),
    getPeriodStats(previous30Start, previous30End),
    getTopProducts(current30Start, now),
    getOrdersBySource(current30Start, now),
    getOrdersByStatus(current30Start, now),
  ]);

  const revenueChange = pct(current.revenue, previous.revenue);
  const ordersChange = pct(current.orders, previous.orders);
  const aovChange = pct(current.aov, previous.aov);
  const customersChange = pct(current.customers, previous.customers);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          Last 30 days compared to the previous 30-day period.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Total Revenue"
          value={EUR.format(current.revenue)}
          subValue={`prev. ${EUR.format(previous.revenue)}`}
          change={revenueChange}
        />
        <SummaryCard
          label="Total Orders"
          value={NUM.format(current.orders)}
          subValue={`prev. ${NUM.format(previous.orders)}`}
          change={ordersChange}
        />
        <SummaryCard
          label="Avg. Order Value"
          value={current.aov > 0 ? EUR.format(current.aov) : '—'}
          subValue={previous.aov > 0 ? `prev. ${EUR.format(previous.aov)}` : undefined}
          change={aovChange}
        />
        <SummaryCard
          label="New Customers"
          value={NUM.format(current.customers)}
          subValue={`prev. ${NUM.format(previous.customers)}`}
          change={customersChange}
        />
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top products */}
        <div className="lg:col-span-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Top 5 Products by Revenue
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Product
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {topProducts.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-sm text-gray-400">
                    No sales data yet.
                  </td>
                </tr>
              )}
              {topProducts.map((p, i) => (
                <tr key={p.productId} className="hover:bg-gray-50">
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm text-gray-900 max-w-[160px]">
                        {p.name}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                    {EUR.format(p.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Orders by source */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Orders by Source</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Source
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Orders
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {bySource.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-gray-400">
                    No order data yet.
                  </td>
                </tr>
              )}
              {bySource.map((row) => (
                <tr key={row.source} className="hover:bg-gray-50">
                  <td className="py-3 pl-5 pr-3">
                    <Badge
                      label={row.source}
                      styleClass={SOURCE_STYLES[row.source] ?? SOURCE_STYLES.MANUAL}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-700">
                    {NUM.format(row.count)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                    {EUR.format(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Orders by status */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Orders by Status</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {byStatus.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-sm text-gray-400">
                    No order data yet.
                  </td>
                </tr>
              )}
              {byStatus.map((row) => (
                <tr key={row.status} className="hover:bg-gray-50">
                  <td className="py-3 pl-5 pr-3">
                    <Badge
                      label={row.status.replace(/_/g, ' ')}
                      styleClass={STATUS_STYLES[row.status] ?? STATUS_STYLES.PENDING}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-700">
                    {NUM.format(row.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Period note */}
      <p className="text-xs text-gray-400">
        Current period: {current30Start.toLocaleDateString('en-GB')} — today.
        Previous period: {previous30Start.toLocaleDateString('en-GB')} —{' '}
        {previous30End.toLocaleDateString('en-GB')}.
        Revenue excludes cancelled and refunded orders.
      </p>
    </div>
  );
}
