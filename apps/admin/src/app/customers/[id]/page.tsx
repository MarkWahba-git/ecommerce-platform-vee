import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@vee/db';
import { formatPrice } from '@vee/shared';

export const metadata: Metadata = { title: 'Customer Detail' };

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

async function getCustomer(id: string) {
  return db.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { isDefault: 'desc' } },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          source: true,
          total: true,
          currency: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

const ORDER_STATUS_STYLES: Record<string, string> = {
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

function Badge({ label, styleClass }: { label: string; styleClass: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styleClass}`}
    >
      {label}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-6 py-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="text-right text-sm text-gray-900">{value ?? '—'}</dd>
    </div>
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
// Page
// ---------------------------------------------------------------------------

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
    customer.email;

  const totalSpent = customer.orders.reduce(
    (sum, o) => sum + Number(o.total),
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/customers" className="text-sm text-gray-500 hover:text-gray-900">
            ← Customers
          </Link>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">{fullName}</h2>
          <p className="mt-0.5 text-sm text-gray-500">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          <form method="POST" action={`/api/customers/${customer.id}/export`}>
            <button
              type="submit"
              className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Export Data (GDPR)
            </button>
          </form>
          <form
            method="POST"
            action={`/api/customers/${customer.id}/delete-data`}
            onSubmit={(e) => {
              if (!confirm('Permanently delete all customer data? This cannot be undone.')) {
                e.preventDefault();
              }
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-500"
            >
              Delete Customer Data
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* Order history */}
          <Section title={`Order History (${customer.orders.length})`}>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="overflow-hidden rounded-md border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-2 pl-3 pr-3 text-left text-xs font-semibold uppercase text-gray-500">
                        Order
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">
                        Status
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {customer.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap py-2 pl-3 pr-3">
                          <Link
                            href={`/orders/${o.id}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                          >
                            #{o.orderNumber}
                          </Link>
                          <p className="text-xs text-gray-400">
                            {o._count.items} item{o._count.items !== 1 ? 's' : ''}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-500">
                          {formatDate(o.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-sm">
                          <Badge
                            label={o.status.replace(/_/g, ' ')}
                            styleClass={ORDER_STATUS_STYLES[o.status] ?? ORDER_STATUS_STYLES.PENDING}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-medium text-gray-900">
                          {formatPrice(Number(o.total), o.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={3} className="py-2 pl-3 pr-3 text-sm font-semibold text-gray-700">
                        Total spent
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-gray-900">
                        {formatPrice(totalSpent)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Addresses */}
          <Section title={`Addresses (${customer.addresses.length})`}>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-gray-500">No saved addresses.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {customer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="rounded-md border border-gray-200 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase text-gray-500">
                        {addr.type}
                      </span>
                      {addr.isDefault && (
                        <Badge
                          label="Default"
                          styleClass="bg-indigo-50 text-indigo-700 ring-indigo-700/10"
                        />
                      )}
                    </div>
                    <address className="space-y-0.5 text-sm text-gray-700 not-italic">
                      <p className="font-medium">
                        {addr.firstName} {addr.lastName}
                      </p>
                      {addr.company && <p>{addr.company}</p>}
                      <p>{addr.street1}</p>
                      {addr.street2 && <p>{addr.street2}</p>}
                      <p>
                        {addr.postalCode} {addr.city}
                      </p>
                      {addr.state && <p>{addr.state}</p>}
                      <p>{addr.country}</p>
                      {addr.phone && (
                        <p className="text-gray-500">{addr.phone}</p>
                      )}
                    </address>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Admin notes */}
          <Section title="Admin Notes">
            <form method="POST" action={`/api/customers/${customer.id}/notes`}>
              <textarea
                name="notes"
                defaultValue={customer.notes ?? ''}
                rows={4}
                placeholder="Internal notes about this customer…"
                className="block w-full rounded-md border-0 px-3 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm"
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  Save Notes
                </button>
              </div>
            </form>
          </Section>
        </div>

        {/* Right: 1/3 */}
        <div className="space-y-6">
          {/* Customer info */}
          <Section title="Customer Info">
            <dl className="divide-y divide-gray-100">
              <InfoRow label="Name" value={fullName} />
              <InfoRow label="Email" value={customer.email} />
              <InfoRow label="Phone" value={customer.phone} />
              <InfoRow
                label="Marketing"
                value={
                  customer.marketingConsent ? (
                    <Badge
                      label="Opted in"
                      styleClass="bg-green-50 text-green-700 ring-green-600/20"
                    />
                  ) : (
                    <Badge
                      label="Opted out"
                      styleClass="bg-gray-50 text-gray-500 ring-gray-500/10"
                    />
                  )
                }
              />
              <InfoRow
                label="Joined"
                value={formatDate(customer.createdAt)}
              />
            </dl>
          </Section>

          {/* GDPR info */}
          <Section title="GDPR Requests">
            <dl className="divide-y divide-gray-100">
              <InfoRow
                label="Consent date"
                value={formatDate(customer.consentDate)}
              />
              <InfoRow
                label="Data request"
                value={
                  customer.gdprDataRequest ? (
                    <span className="text-amber-700">
                      {formatDate(customer.gdprDataRequest)}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <InfoRow
                label="Delete request"
                value={
                  customer.gdprDeleteRequest ? (
                    <span className="text-red-700">
                      {formatDate(customer.gdprDeleteRequest)}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
          </Section>

          {/* Stats */}
          <Section title="Statistics">
            <dl className="divide-y divide-gray-100">
              <InfoRow label="Total orders" value={customer.orders.length} />
              <InfoRow label="Total spent" value={formatPrice(totalSpent)} />
              <InfoRow
                label="Avg. order value"
                value={
                  customer.orders.length > 0
                    ? formatPrice(totalSpent / customer.orders.length)
                    : '—'
                }
              />
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}
