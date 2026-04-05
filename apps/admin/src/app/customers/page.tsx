import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@vee/db';
import { formatPrice } from '@vee/shared';

export const metadata: Metadata = { title: 'Customers' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Data
// ---------------------------------------------------------------------------

async function getCustomers(search?: string) {
  return db.customer.findMany({
    where: search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      marketingConsent: true,
      createdAt: true,
      _count: { select: { orders: true } },
      orders: {
        select: { total: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SearchParams {
  q?: string;
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q } = await searchParams;
  const customers = await getCustomers(q);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
            {q ? ` matching "${q}"` : ''}
          </p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-3">
        <div className="flex-1">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name or email…"
            className="block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:max-w-xs sm:text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Search
        </button>
        {q && (
          <Link
            href="/customers"
            className="rounded-md px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:pl-6">
                Customer
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Orders
              </th>
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Spent
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Joined
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Marketing
              </th>
              <th className="relative py-3 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {customers.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-500">
                  No customers found.
                </td>
              </tr>
            )}
            {customers.map((c) => {
              const name =
                [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
              const totalSpent = c.orders.reduce(
                (sum, o) => sum + Number(o.total),
                0,
              );
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="py-3 pl-4 pr-3 sm:pl-6">
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{c.email}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-gray-700">
                    {c._count.orders}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium text-gray-900">
                    {formatPrice(totalSpent)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500">
                    {new Date(c.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {c.marketingConsent ? (
                      <Badge
                        label="Opted in"
                        styleClass="bg-green-50 text-green-700 ring-green-600/20"
                      />
                    ) : (
                      <Badge
                        label="Opted out"
                        styleClass="bg-gray-50 text-gray-500 ring-gray-500/10"
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap py-3 pl-3 pr-4 text-right text-sm sm:pr-6">
                    <Link
                      href={`/customers/${c.id}`}
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
