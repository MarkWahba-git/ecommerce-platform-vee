import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@vee/db';

interface Props {
  params: Promise<{ orderId: string }>;
}

function formatEUR(value: number | string) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(
    Number(value)
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, slug: true, type: true },
          },
          variant: {
            select: { name: true },
          },
          downloadAccess: {
            select: { id: true, fileKey: true, fileName: true, downloadCount: true, maxDownloads: true },
          },
        },
      },
      shippingAddress: true,
    },
  });

  if (!order) {
    notFound();
  }

  const hasDigitalItems = order.items.some((item) => item.isDigital);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      {/* Success banner */}
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Vielen Dank für deine Bestellung!
        </h1>
        <p className="mt-2 text-muted-foreground">
          Deine Bestellung{' '}
          <strong className="text-foreground">#{order.orderNumber}</strong> ist eingegangen
          und wird bearbeitet.
        </p>
        {order.customer && (
          <p className="mt-1 text-sm text-muted-foreground">
            Eine Bestätigungs-E-Mail wurde verschickt.
          </p>
        )}
      </div>

      {/* Order summary card */}
      <div className="space-y-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
        {/* Order meta */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="font-medium text-foreground">Bestellnummer</p>
            <p className="text-muted-foreground">#{order.orderNumber}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Bestelldatum</p>
            <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Status</p>
            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              In Bearbeitung
            </span>
          </div>
        </div>

        <hr className="border-border" />

        {/* Items */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Bestellte Artikel</h2>
          <ul className="divide-y divide-border">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {item.name}
                    {item.variant && (
                      <span className="ml-1 text-muted-foreground">
                        — {item.variant.name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">Menge: {item.quantity}</p>

                  {/* Digital download links */}
                  {item.isDigital && item.downloadAccess.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {item.downloadAccess.map((access) => {
                        const exhausted =
                          access.maxDownloads != null &&
                          access.downloadCount >= access.maxDownloads;
                        return (
                          <div key={access.id}>
                            {exhausted ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground line-through">
                                {access.fileName}{' '}
                                <span>(Download-Limit erreicht)</span>
                              </span>
                            ) : (
                              <a
                                href={`/api/downloads/${access.id}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-foreground underline underline-offset-2 hover:no-underline"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                                {access.fileName} herunterladen
                                {access.maxDownloads != null && (
                                  <span className="text-muted-foreground">
                                    ({access.downloadCount}/{access.maxDownloads})
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
                <p className="text-sm font-medium text-foreground whitespace-nowrap">
                  {formatEUR(item.totalPrice)}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals */}
        <div className="space-y-1.5 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Zwischensumme</span>
            <span>{formatEUR(order.subtotal)}</span>
          </div>
          {Number(order.discountAmount) > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Rabatt</span>
              <span>−{formatEUR(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted-foreground">
            <span>Versand</span>
            <span>
              {Number(order.shippingCost) === 0 ? (
                <span className="text-green-600">Kostenlos</span>
              ) : (
                formatEUR(order.shippingCost)
              )}
            </span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
            <span>Gesamtbetrag</span>
            <span>{formatEUR(order.total)}</span>
          </div>
        </div>

        {/* Shipping address */}
        {order.shippingAddress && (
          <div className="border-t border-border pt-4">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Lieferadresse</h2>
            <address className="not-italic text-sm text-muted-foreground leading-relaxed">
              <p>
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
              <p>{order.shippingAddress.street1}</p>
              {order.shippingAddress.street2 && <p>{order.shippingAddress.street2}</p>}
              <p>
                {order.shippingAddress.postalCode} {order.shippingAddress.city}
              </p>
              <p>{order.shippingAddress.country}</p>
            </address>
          </div>
        )}

        {/* Digital note */}
        {hasDigitalItems && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <p className="font-medium">Digitale Produkte</p>
            <p className="mt-0.5">
              Deine Download-Links sind oben verfügbar und wurden auch per E-Mail gesendet.
              Links sind für eine begrenzte Anzahl an Downloads gültig.
            </p>
          </div>
        )}
      </div>

      {/* CTA buttons */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/account/orders"
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-foreground transition hover:bg-muted"
        >
          Meine Bestellungen
        </Link>
        <Link
          href="/shop"
          className="flex-1 rounded-lg bg-foreground px-4 py-2.5 text-center text-sm font-semibold text-background transition hover:opacity-90"
        >
          Weiter einkaufen
        </Link>
      </div>
    </div>
  );
}
