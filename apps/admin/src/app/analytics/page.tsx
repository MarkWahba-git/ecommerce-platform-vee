import type { Metadata } from 'next';
import Link from 'next/link';
import { analyticsService } from '@vee/core';

export const metadata: Metadata = { title: 'Analytics' };

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const NUM = new Intl.NumberFormat('de-DE');
const PCT = (v: number) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(Math.abs(v));

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Date range (server-side, last 30 days)
// ---------------------------------------------------------------------------

function getDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
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

const SOURCE_COLORS: Record<string, string> = {
  WEBSITE: 'bg-violet-500',
  ETSY:    'bg-orange-500',
  AMAZON:  'bg-yellow-500',
  MANUAL:  'bg-gray-400',
};

const SOURCE_BADGE: Record<string, string> = {
  WEBSITE: 'bg-violet-50 text-violet-700 ring-violet-700/10',
  ETSY:    'bg-orange-50 text-orange-700 ring-orange-700/10',
  AMAZON:  'bg-yellow-50 text-yellow-700 ring-yellow-700/10',
  MANUAL:  'bg-gray-50   text-gray-600   ring-gray-500/10',
};

const ACTIVITY_ICON_STYLES: Record<string, string> = {
  order:        'bg-indigo-100 text-indigo-600',
  review:       'bg-amber-100  text-amber-600',
  custom_order: 'bg-purple-100 text-purple-600',
};

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KpiCard({
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
  const positive = change !== null && change >= 0;
  const negative = change !== null && change < 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {subValue && <p className="mt-0.5 text-xs text-gray-400">{subValue}</p>}
      {change !== null ? (
        <p
          className={`mt-1 text-xs font-medium ${
            positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {positive ? '↑' : '↓'} {PCT(change)}% vs prev. period
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-400">No prior data</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue bar chart (CSS-only, no external library)
// ---------------------------------------------------------------------------

function RevenueChart({ data }: { data: { date: string; revenue: number; orderCount: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-gray-400">
        No revenue data for this period
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="space-y-1">
      <div className="flex h-40 items-end gap-0.5 overflow-x-auto">
        {data.map((day) => {
          const heightPct = (day.revenue / maxRevenue) * 100;
          return (
            <div
              key={day.date}
              className="group relative flex min-w-[6px] flex-1 flex-col justify-end"
              title={`${day.date}: ${EUR.format(day.revenue)} (${day.orderCount} orders)`}
            >
              <div
                className="w-full rounded-t bg-indigo-500 transition-colors group-hover:bg-indigo-600"
                style={{ height: `${Math.max(heightPct, 1)}%` }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                <p>{day.date}</p>
                <p>{EUR.format(day.revenue)}</p>
                <p>{day.orderCount} orders</p>
              </div>
            </div>
          );
        })}
      </div>
      {/* X-axis: first, middle, last */}
      <div className="flex justify-between text-xs text-gray-400">
        <span>{data[0]?.date}</span>
        {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.date}</span>}
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Funnel step
// ---------------------------------------------------------------------------

function FunnelStep({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-semibold">{NUM.format(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity icon
// ---------------------------------------------------------------------------

function ActivityDot({ type }: { type: string }) {
  const cls = ACTIVITY_ICON_STYLES[type] ?? 'bg-gray-100 text-gray-500';
  const icons: Record<string, string> = {
    order:        'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    review:       'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
    custom_order: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  };
  const d = icons[type] ?? icons.order;

  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AnalyticsPage() {
  const { start, end } = getDateRange();

  const [
    revenueStats,
    revenueByDay,
    topProducts,
    bySource,
    byStatus,
    customerStats,
    funnel,
    lowStock,
    activity,
  ] = await Promise.all([
    analyticsService.getRevenueStats(start, end),
    analyticsService.getRevenueByDay(start, end),
    analyticsService.getTopProducts(10, start, end),
    analyticsService.getOrdersBySource(start, end),
    analyticsService.getOrdersByStatus(start, end),
    analyticsService.getCustomerStats(start, end),
    analyticsService.getConversionFunnel(start, end),
    analyticsService.getLowStockAlerts(),
    analyticsService.getRecentActivity(15),
  ]);

  const totalSourceCount = bySource.reduce((s, r) => s + r.count, 0);
  const totalSourceRevenue = bySource.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Analytics</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {fmtDate(start)} — {fmtDate(end)} compared to the previous 30-day period.
          Revenue excludes cancelled and refunded orders.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={EUR.format(revenueStats.revenue)}
          change={revenueStats.revenueChange}
        />
        <KpiCard
          label="Orders"
          value={NUM.format(revenueStats.orderCount)}
          change={revenueStats.orderCountChange}
        />
        <KpiCard
          label="Avg. Order Value"
          value={revenueStats.aov > 0 ? EUR.format(revenueStats.aov) : '—'}
          change={revenueStats.aovChange}
        />
        <KpiCard
          label="New Customers"
          value={NUM.format(customerStats.newCustomers)}
          subValue={`${NUM.format(customerStats.returningCustomers)} returning`}
          change={null}
        />
      </div>

      {/* Revenue chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">Daily Revenue (last 30 days)</h3>
        <RevenueChart data={revenueByDay} />
      </div>

      {/* Top products + Orders by source */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 10 products table */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Top 10 Products by Revenue</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr>
                <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Product
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Units
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-gray-400">
                    No sales data yet.
                  </td>
                </tr>
              ) : (
                topProducts.map((p, i) => (
                  <tr key={p.productId} className="hover:bg-gray-50">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-900 max-w-[180px]">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-600">
                      {NUM.format(p.unitsSold)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                      {EUR.format(p.revenue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Orders by source — colored bar breakdown */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Orders by Source</h3>
            {bySource.length === 0 ? (
              <p className="text-sm text-gray-400">No order data yet.</p>
            ) : (
              <div className="space-y-3">
                {bySource.map((row) => {
                  const widthPct =
                    totalSourceCount > 0 ? (row.count / totalSourceCount) * 100 : 0;
                  const revPct =
                    totalSourceRevenue > 0
                      ? ((row.revenue / totalSourceRevenue) * 100).toFixed(1)
                      : '0';
                  return (
                    <div key={row.source} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            SOURCE_BADGE[row.source] ?? SOURCE_BADGE.MANUAL
                          }`}
                        >
                          {row.source}
                        </span>
                        <span className="text-gray-500">
                          {NUM.format(row.count)} orders · {revPct}% revenue ·{' '}
                          {EUR.format(row.revenue)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${
                            SOURCE_COLORS[row.source] ?? 'bg-gray-400'
                          }`}
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Orders by status */}
          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Orders by Status</h3>
            {byStatus.length === 0 ? (
              <p className="text-sm text-gray-400">No order data yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {byStatus.map((row) => (
                  <span
                    key={row.status}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                      STATUS_STYLES[row.status] ?? STATUS_STYLES.PENDING
                    }`}
                  >
                    {row.status.replace(/_/g, ' ')}
                    <span className="font-bold">{NUM.format(row.count)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversion funnel + Customer stats */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Conversion funnel */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Conversion Funnel</h3>
          <div className="space-y-4">
            <FunnelStep
              label="Carts Created"
              value={funnel.cartsCreated}
              max={funnel.cartsCreated}
              color="bg-indigo-200"
            />
            <FunnelStep
              label="Carts with Items"
              value={funnel.cartsWithItems}
              max={funnel.cartsCreated}
              color="bg-indigo-400"
            />
            <FunnelStep
              label="Checkouts Initiated"
              value={funnel.checkoutsInitiated}
              max={funnel.cartsCreated}
              color="bg-indigo-500"
            />
            <FunnelStep
              label="Orders Completed"
              value={funnel.ordersCompleted}
              max={funnel.cartsCreated}
              color="bg-indigo-700"
            />
          </div>
          {funnel.cartsCreated > 0 && (
            <p className="mt-3 text-xs text-gray-400">
              Completion rate:{' '}
              {((funnel.ordersCompleted / funnel.cartsCreated) * 100).toFixed(1)}%
            </p>
          )}
        </div>

        {/* Customer stats */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Customer Stats</h3>
          <dl className="grid grid-cols-3 gap-4 text-center">
            {[
              { label: 'New', value: customerStats.newCustomers, color: 'text-green-600' },
              { label: 'Returning', value: customerStats.returningCustomers, color: 'text-blue-600' },
              { label: 'Total', value: customerStats.totalCustomers, color: 'text-gray-900' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg bg-gray-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {label}
                </dt>
                <dd className={`mt-1 text-2xl font-bold ${color}`}>{NUM.format(value)}</dd>
              </div>
            ))}
          </dl>
          {customerStats.totalCustomers > 0 && (
            <p className="mt-3 text-xs text-gray-400">
              {((customerStats.returningCustomers / customerStats.totalCustomers) * 100).toFixed(1)}
              % of total customers are repeat buyers
            </p>
          )}
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
          <div className="flex items-center gap-2 border-b border-amber-200 px-5 py-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-amber-600"
              aria-hidden="true"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3 className="text-sm font-semibold text-amber-800">
              Low Stock Alerts ({lowStock.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-100">
              <thead>
                <tr>
                  <th className="py-2.5 pl-5 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Product / Variant
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Available
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Threshold
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Reserved
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {lowStock.map((alert) => (
                  <tr key={alert.variantId} className="hover:bg-amber-100/50">
                    <td className="py-3 pl-5 pr-3">
                      <p className="text-sm font-medium text-gray-900">{alert.productName}</p>
                      <p className="text-xs text-gray-500">
                        {alert.variantName} · SKU: {alert.variantSku}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <span
                        className={`text-sm font-bold ${
                          alert.available <= 0 ? 'text-red-600' : 'text-amber-600'
                        }`}
                      >
                        {alert.available <= 0 ? 'Out of stock' : alert.available}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-600">
                      {alert.lowStockThreshold}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-600">
                      {alert.reservedQuantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2.5">
            <Link
              href="/inventory"
              className="text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline"
            >
              Manage inventory →
            </Link>
          </div>
        </div>
      )}

      {/* Recent activity feed */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        </div>
        {activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No recent activity.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {activity.map((item) => (
              <li key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50">
                <ActivityDot type={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{item.description}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Intl.DateTimeFormat('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(item.timestamp))}
                  </p>
                </div>
                <span
                  className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset sm:inline-flex ${
                    item.type === 'order'
                      ? 'bg-indigo-50 text-indigo-700 ring-indigo-700/10'
                      : item.type === 'review'
                        ? 'bg-amber-50 text-amber-700 ring-amber-700/10'
                        : 'bg-purple-50 text-purple-700 ring-purple-700/10'
                  }`}
                >
                  {item.type.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
