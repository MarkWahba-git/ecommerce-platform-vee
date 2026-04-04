import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Bestelldetails' };

const formatEUR = (val: number | string) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(val));

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

const formatDateShort = (date: Date) =>
  new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    date,
  );

const statusLabel: Record<string, string> = {
  PENDING: 'Ausstehend',
  CONFIRMED: 'Bestätigt',
  PROCESSING: 'In Bearbeitung',
  AWAITING_APPROVAL: 'Wartet auf Freigabe',
  SHIPPED: 'Versendet',
  DELIVERED: 'Geliefert',
  COMPLETED: 'Abgeschlossen',
  CANCELLED: 'Storniert',
  REFUNDED: 'Erstattet',
};

const statusColor: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  AWAITING_APPROVAL: 'bg-orange-100 text-orange-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

const cancellableStatuses = ['PENDING', 'CONFIRMED', 'AWAITING_APPROVAL'];

const timeline: Array<{ status: string; label: string }> = [
  { status: 'PENDING', label: 'Bestellung eingegangen' },
  { status: 'CONFIRMED', label: 'Bestätigt' },
  { status: 'PROCESSING', label: 'In Bearbeitung' },
  { status: 'SHIPPED', label: 'Versendet' },
  { status: 'DELIVERED', label: 'Geliefert' },
  { status: 'COMPLETED', label: 'Abgeschlossen' },
];

const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  const order = await db.order.findFirst({
    where: { id, customerId: session.customerId },
    include: {
      items: {
        include: {
          product: { select: { slug: true, images: { where: { isPrimary: true }, take: 1 } } },
          downloadAccess: true,
        },
      },
      shippingAddress: true,
      billingAddress: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      shipments: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!order) notFound();

  const currentStatusIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED' || order.status === 'REFUNDED';
  const canCancel = cancellableStatuses.includes(order.status);
  const hasDigitalItems = order.items.some((item) => item.isDigital);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/account/orders"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Alle Bestellungen
          </Link>
          <h2 className="text-xl font-bold text-foreground">
            Bestellung #{order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aufgegeben am {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}
          >
            {statusLabel[order.status] ?? order.status}
          </span>
          {canCancel && (
            <form action={`/api/orders/${order.id}/cancel`} method="POST">
              <button
                type="submit"
                className="rounded-md border border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Stornieren
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Status timeline */}
      {!isCancelled && (
        <div className="rounded-xl border border-border bg-background p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Bestellstatus</h3>
          <ol className="flex items-center gap-0">
            {timeline.map((step, idx) => {
              const stepIndex = statusOrder.indexOf(step.status);
              const isDone = stepIndex <= currentStatusIndex;
              const isActive = step.status === order.status;
              const isLast = idx === timeline.length - 1;
              return (
                <li key={step.status} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-2 ${
                        isDone
                          ? 'bg-accent ring-accent text-white'
                          : 'bg-background ring-border text-muted-foreground'
                      }`}
                    >
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`hidden text-center text-xs sm:block ${isActive ? 'font-semibold text-accent' : isDone ? 'text-foreground' : 'text-muted-foreground'}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div
                      className={`mb-4 h-0.5 flex-1 ${stepIndex < currentStatusIndex ? 'bg-accent' : 'bg-border'}`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-background">
            <div className="border-b border-border px-5 py-4">
              <h3 className="font-semibold text-foreground">
                Bestellte Artikel ({order.items.length})
              </h3>
            </div>
            <ul className="divide-y divide-border">
              {order.items.map((item) => {
                const image = item.product.images[0];
                const hasDownloads = item.downloadAccess.length > 0;
                return (
                  <li key={item.id} className="flex gap-4 p-5">
                    {/* Product image */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {image ? (
                        <img
                          src={image.url}
                          alt={image.altText ?? item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                            <circle cx="9" cy="9" r="2"/>
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.product.slug}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        SKU: {item.sku} · Menge: {item.quantity}
                      </p>
                      {item.personalization && (
                        <div className="mt-1 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                          Personalisierung:{' '}
                          {Object.entries(item.personalization as Record<string, string>)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </div>
                      )}
                      {/* Download links for digital items */}
                      {item.isDigital && hasDownloads && (
                        <div className="mt-2 space-y-1">
                          {item.downloadAccess.map((dl) => {
                            const expired = dl.expiresAt ? dl.expiresAt < new Date() : false;
                            const limitReached =
                              dl.maxDownloads !== null &&
                              dl.maxDownloads !== undefined &&
                              dl.downloadCount >= dl.maxDownloads;
                            const disabled = expired || limitReached;
                            return (
                              <div key={dl.id} className="flex items-center gap-2">
                                {disabled ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                                    {expired ? 'Abgelaufen' : 'Limit erreicht'}
                                  </span>
                                ) : (
                                  <a
                                    href={`/api/downloads/${dl.id}`}
                                    className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/20"
                                  >
                                    ↓ {dl.fileName}
                                    {dl.maxDownloads !== null && dl.maxDownloads !== undefined && (
                                      <span className="text-accent/70">
                                        ({dl.downloadCount}/{dl.maxDownloads})
                                      </span>
                                    )}
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-foreground">{formatEUR(item.totalPrice)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEUR(item.unitPrice)} / Stk.
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Shipment tracking */}
          {order.shipments.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-5">
              <h3 className="mb-3 font-semibold text-foreground">Versandinformationen</h3>
              {order.shipments.map((shipment) => (
                <div key={shipment.id} className="space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    Versanddienstleister:{' '}
                    <span className="font-medium text-foreground">{shipment.carrier}</span>
                  </p>
                  {shipment.trackingNumber && (
                    <p className="text-muted-foreground">
                      Sendungsnummer:{' '}
                      {shipment.trackingUrl ? (
                        <a
                          href={shipment.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-accent hover:underline"
                        >
                          {shipment.trackingNumber}
                        </a>
                      ) : (
                        <span className="font-medium text-foreground">
                          {shipment.trackingNumber}
                        </span>
                      )}
                    </p>
                  )}
                  {shipment.shippedAt && (
                    <p className="text-muted-foreground">
                      Versanddatum:{' '}
                      <span className="font-medium text-foreground">
                        {formatDateShort(shipment.shippedAt)}
                      </span>
                    </p>
                  )}
                  {shipment.deliveredAt && (
                    <p className="text-muted-foreground">
                      Zugestellt:{' '}
                      <span className="font-medium text-foreground">
                        {formatDateShort(shipment.deliveredAt)}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: totals + address */}
        <div className="space-y-4">
          {/* Order totals */}
          <div className="rounded-xl border border-border bg-background p-5">
            <h3 className="mb-3 font-semibold text-foreground">Zusammenfassung</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Zwischensumme</dt>
                <dd className="font-medium text-foreground">{formatEUR(order.subtotal)}</dd>
              </div>
              {Number(order.shippingCost) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Versand</dt>
                  <dd className="font-medium text-foreground">{formatEUR(order.shippingCost)}</dd>
                </div>
              )}
              {Number(order.discountAmount) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Rabatt</dt>
                  <dd className="font-medium text-green-600">−{formatEUR(order.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">MwSt. (inkl.)</dt>
                <dd className="font-medium text-foreground">{formatEUR(order.taxAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="font-semibold text-foreground">Gesamt</dt>
                <dd className="font-bold text-foreground">{formatEUR(order.total)}</dd>
              </div>
            </dl>
            {order.couponCode && (
              <p className="mt-2 text-xs text-muted-foreground">
                Gutscheincode: <span className="font-mono font-medium">{order.couponCode}</span>
              </p>
            )}
          </div>

          {/* Shipping address */}
          {order.shippingAddress && (
            <div className="rounded-xl border border-border bg-background p-5">
              <h3 className="mb-3 font-semibold text-foreground">Lieferadresse</h3>
              <address className="not-italic text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                <p>{order.shippingAddress.street1}</p>
                {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
                <p>
                  {order.shippingAddress.postalCode} {order.shippingAddress.city}
                </p>
                <p>{order.shippingAddress.country}</p>
                {order.shippingAddress.phone && <p>{order.shippingAddress.phone}</p>}
              </address>
            </div>
          )}

          {/* Digital items note */}
          {hasDigitalItems && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-5">
              <p className="text-sm text-accent font-medium">
                Diese Bestellung enthält digitale Produkte.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Alle Downloads findest du auch unter{' '}
                <Link href="/account/downloads" className="text-accent hover:underline">
                  Meine Downloads
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
