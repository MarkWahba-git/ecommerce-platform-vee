import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@vee/db';
import { formatPrice } from '@vee/shared';

export const metadata: Metadata = { title: 'Custom Orders' };

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  SUBMITTED:     'bg-blue-50    text-blue-800    ring-blue-600/20',
  REVIEWING:     'bg-yellow-50  text-yellow-800  ring-yellow-600/20',
  QUOTED:        'bg-purple-50  text-purple-800  ring-purple-600/20',
  ACCEPTED:      'bg-indigo-50  text-indigo-800  ring-indigo-600/20',
  IN_PRODUCTION: 'bg-orange-50  text-orange-800  ring-orange-600/20',
  PROOF_SENT:    'bg-cyan-50    text-cyan-800    ring-cyan-600/20',
  APPROVED:      'bg-teal-50    text-teal-800    ring-teal-600/20',
  COMPLETED:     'bg-green-50   text-green-800   ring-green-600/20',
  DECLINED:      'bg-red-50     text-red-700     ring-red-600/10',
  CANCELLED:     'bg-gray-50    text-gray-600    ring-gray-500/10',
};

const ALL_STATUSES = [
  'SUBMITTED',
  'REVIEWING',
  'QUOTED',
  'ACCEPTED',
  'IN_PRODUCTION',
  'PROOF_SENT',
  'APPROVED',
  'COMPLETED',
  'DECLINED',
  'CANCELLED',
];

function Badge({ label, styleClass }: { label: string; styleClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styleClass}`}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function getRequests(status?: string) {
  return db.customOrderRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// FilterLink
// ---------------------------------------------------------------------------

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'
      }`}
    >
      {label.replace(/_/g, ' ')}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CustomOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const requests = await getRequests(status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Custom Orders</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {requests.length} request{requests.length !== 1 ? 's' : ''}
            {status ? ` · ${status.replace(/_/g, ' ')}` : ''}
          </p>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-1.5">
        <FilterLink href="/custom-orders" label="All" active={!status} />
        {ALL_STATUSES.map((s) => (
          <FilterLink
            key={s}
            href={`/custom-orders?status=${s}`}
            label={s}
            active={status === s}
          />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                Request
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Customer
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quoted
              </th>
              <th className="relative py-3 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-sm text-gray-500">
                  No custom order requests found.
                </td>
              </tr>
            )}
            {requests.map((req) => {
              const customerName = req.customer
                ? [req.customer.firstName, req.customer.lastName].filter(Boolean).join(' ') ||
                  req.customer.email
                : '—';

              return (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="py-3 pl-4 pr-3 sm:pl-6">
                    <p className="max-w-xs truncate text-sm font-medium text-gray-900">
                      {req.description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(req.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </td>

                  <td className="px-3 py-3">
                    <p className="text-sm text-gray-900">{customerName}</p>
                    <p className="text-xs text-gray-400">{req.customer?.email ?? '—'}</p>
                  </td>

                  <td className="whitespace-nowrap px-3 py-3">
                    <Badge
                      label={req.status}
                      styleClass={STATUS_STYLES[req.status] ?? STATUS_STYLES.SUBMITTED}
                    />
                  </td>

                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-700">
                    {req.quotedPrice !== null
                      ? formatPrice(Number(req.quotedPrice), 'EUR')
                      : '—'}
                  </td>

                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm sm:pr-6">
                    <Link
                      href={`/custom-orders/${req.id}`}
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
