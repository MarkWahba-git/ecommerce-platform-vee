import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Discounts' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

function formatValue(type: string, value: number): string {
  if (type === 'PERCENTAGE') return `${value}%`;
  if (type === 'FIXED_AMOUNT') return EUR.format(value);
  return '—';
}

const TYPE_STYLES: Record<string, string> = {
  PERCENTAGE:    'bg-blue-50 text-blue-700 ring-blue-700/10',
  FIXED_AMOUNT:  'bg-violet-50 text-violet-700 ring-violet-700/10',
  FREE_SHIPPING: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  BUY_X_GET_Y:   'bg-amber-50 text-amber-700 ring-amber-700/10',
};

const TYPE_LABELS: Record<string, string> = {
  PERCENTAGE:    'Percentage',
  FIXED_AMOUNT:  'Fixed',
  FREE_SHIPPING: 'Free Shipping',
  BUY_X_GET_Y:   'Buy X Get Y',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        TYPE_STYLES[type] ?? 'bg-gray-50 text-gray-600 ring-gray-500/10'
      }`}
    >
      {TYPE_LABELS[type] ?? type}
    </span>
  );
}

function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: Date | null }) {
  const expired = expiresAt && new Date(expiresAt) < new Date();
  if (!isActive || expired) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-500/10">
        {expired ? 'Expired' : 'Inactive'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      Active
    </span>
  );
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getCoupons() {
  return db.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DiscountsPage() {
  const coupons = await getCoupons();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Discounts</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {coupons.length} coupon{coupons.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/discounts/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          + New Coupon
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                Code
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Type
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Value
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Usage
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Valid From
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Expires
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {coupons.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  No coupons yet.{' '}
                  <Link href="/discounts/new" className="text-indigo-600 hover:underline">
                    Create your first coupon.
                  </Link>
                </td>
              </tr>
            )}
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-gray-50">
                <td className="py-3 pl-4 pr-3 sm:pl-6">
                  <span className="font-mono text-sm font-semibold text-gray-900">
                    {coupon.code}
                  </span>
                  {coupon.minOrderAmount && (
                    <p className="text-xs text-gray-400">
                      Min. order: {EUR.format(Number(coupon.minOrderAmount))}
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm">
                  <TypeBadge type={coupon.type} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                  {formatValue(coupon.type, Number(coupon.value))}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-700">
                  {coupon.usageCount}
                  {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ''}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm">
                  <StatusBadge isActive={coupon.isActive} expiresAt={coupon.expiresAt} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                  {formatDate(coupon.startsAt)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                  {formatDate(coupon.expiresAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
