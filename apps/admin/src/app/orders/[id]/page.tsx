import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@vee/db';
import { formatPrice, ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@vee/shared';

export const metadata: Metadata = { title: 'Order Detail' };

// ---------------------------------------------------------------------------
// Fetch single order with all relations
// ---------------------------------------------------------------------------

async function getOrder(id: string) {
  return db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      shippingAddress: true,
      billingAddress: true,
      items: {
        include: {
          product: { select: { name: true, slug: true } },
          variant: { select: { name: true } },
        },
      },
      payments: { orderBy: { createdAt: 'desc' } },
      shipments: { orderBy: { createdAt: 'desc' } },
    },
  });
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

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  SUCCEEDED: 'bg-green-50 text-green-700 ring-green-600/20',
  PENDING:   'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  FAILED:    'bg-red-50 text-red-700 ring-red-600/10',
  REFUNDED:  'bg-gray-50 text-gray-600 ring-gray-500/10',
};

function Badge({ label, styleClass }: { label: string; styleClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styleClass}`}>
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

function DefinitionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <dt className="text-sm text-gray-500 shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900 text-right">{value ?? '—'}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const transitions = ORDER_STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
  const customerName = order.customer
    ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/orders" className="text-sm text-gray-500 hover:text-gray-900">
              ← Orders
            </Link>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-gray-900">
            Order #{order.orderNumber}
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Placed on{' '}
            {new Date(order.createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Status + transition buttons */}
        <div className="flex flex-col items-end gap-2">
          <Badge
            label={order.status.replace(/_/g, ' ')}
            styleClass={STATUS_STYLES[order.status] ?? STATUS_STYLES.PENDING}
          />
          {transitions.length > 0 && (
            <div className="flex gap-2">
              {transitions.map((next) => (
                <form key={next} method="POST" action={`/api/orders/${order.id}/status`}>
                  <input type="hidden" name="status" value={next} />
                  <button
                    type="submit"
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Mark {next.replace(/_/g, ' ')}
                  </button>
                </form>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Line items */}
          <Section title="Items">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-xs font-semibold uppercase text-gray-500">Product</th>
                  <th className="pb-2 text-center text-xs font-semibold uppercase text-gray-500">Qty</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase text-gray-500">Unit</th>
                  <th className="pb-2 text-right text-xs font-semibold uppercase text-gray-500">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2.5 pr-4">
                      <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                      {item.variant && (
                        <p className="text-xs text-gray-400">{item.variant.name}</p>
                      )}
                      {item.sku && (
                        <p className="text-xs font-mono text-gray-400">{item.sku}</p>
                      )}
                      {item.personalization && Object.keys(item.personalization).length > 0 && (
                        <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                          {Object.entries(item.personalization as Record<string, unknown>).map(([k, v]) => (
                            <span key={k} className="mr-2">
                              <b>{k}:</b> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-center text-sm text-gray-700">{item.quantity}</td>
                    <td className="py-2.5 text-right text-sm text-gray-700">
                      {formatPrice(item.unitPrice, order.currency)}
                    </td>
                    <td className="py-2.5 text-right text-sm font-medium text-gray-900">
                      {formatPrice(item.totalPrice, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Order totals */}
            <dl className="mt-4 divide-y divide-gray-100 border-t border-gray-200">
              <DefinitionRow label="Subtotal" value={formatPrice(order.subtotal, order.currency)} />
              {order.discountAmount > 0 && (
                <DefinitionRow
                  label={`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`}
                  value={`-${formatPrice(order.discountAmount, order.currency)}`}
                />
              )}
              <DefinitionRow label="Shipping" value={formatPrice(order.shippingCost, order.currency)} />
              <DefinitionRow label="Tax" value={formatPrice(order.taxAmount, order.currency)} />
              <div className="flex items-center justify-between py-2">
                <dt className="text-sm font-semibold text-gray-900">Total</dt>
                <dd className="text-sm font-semibold text-gray-900">
                  {formatPrice(order.total, order.currency)}
                </dd>
              </div>
            </dl>
          </Section>

          {/* Payments */}
          {order.payments.length > 0 && (
            <Section title="Payment">
              <dl className="divide-y divide-gray-100">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm text-gray-900">{p.provider}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(p.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        label={p.status}
                        styleClass={PAYMENT_STATUS_STYLES[p.status] ?? PAYMENT_STATUS_STYLES.PENDING}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(p.amount, p.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {/* Shipments */}
          {order.shipments.length > 0 && (
            <Section title="Shipments">
              {order.shipments.map((s) => (
                <div key={s.id} className="mb-3 rounded-md bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{s.carrier}</p>
                    <Badge label={s.status} styleClass="bg-gray-50 text-gray-600 ring-gray-500/10" />
                  </div>
                  {s.trackingNumber && (
                    <p className="mt-1 text-sm text-gray-600">
                      Tracking:{' '}
                      {s.trackingUrl ? (
                        <a href={s.trackingUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                          {s.trackingNumber}
                        </a>
                      ) : (
                        <span className="font-mono">{s.trackingNumber}</span>
                      )}
                    </p>
                  )}
                  {s.shippedAt && (
                    <p className="text-xs text-gray-400">
                      Shipped {new Date(s.shippedAt).toLocaleDateString('en-GB')}
                    </p>
                  )}
                </div>
              ))}
            </Section>
          )}
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Customer */}
          <Section title="Customer">
            <dl className="divide-y divide-gray-100">
              <DefinitionRow label="Name" value={customerName} />
              <DefinitionRow label="Email" value={order.customer?.email} />
              <DefinitionRow label="Phone" value={order.customer?.phone} />
              {order.customer && (
                <div className="pt-2">
                  <Link
                    href={`/customers/${order.customer.id}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View customer profile →
                  </Link>
                </div>
              )}
            </dl>
          </Section>

          {/* Shipping address */}
          {order.shippingAddress && (
            <Section title="Shipping Address">
              <address className="space-y-0.5 text-sm text-gray-700 not-italic">
                <p className="font-medium">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                <p>{order.shippingAddress.street1}</p>
                {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                <p>
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}
                </p>
                {order.shippingAddress.state && <p>{order.shippingAddress.state}</p>}
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && (
                  <p className="mt-1 text-gray-500">{order.shippingAddress.phone}</p>
                )}
              </address>
            </Section>
          )}

          {/* Order info */}
          <Section title="Order Info">
            <dl className="divide-y divide-gray-100">
              <DefinitionRow label="Source" value={order.source} />
              <DefinitionRow label="Currency" value={order.currency} />
              {order.marketplaceOrderId && (
                <DefinitionRow label="Marketplace ID" value={
                  <span className="font-mono text-xs">{order.marketplaceOrderId}</span>
                } />
              )}
              {order.customerNote && (
                <div className="py-2">
                  <p className="text-xs text-gray-500">Customer note</p>
                  <p className="mt-1 text-sm text-gray-700">{order.customerNote}</p>
                </div>
              )}
              {order.internalNote && (
                <div className="py-2">
                  <p className="text-xs text-gray-500">Internal note</p>
                  <p className="mt-1 text-sm text-gray-700">{order.internalNote}</p>
                </div>
              )}
            </dl>
          </Section>
        </div>
      </div>
    </div>
  );
}
