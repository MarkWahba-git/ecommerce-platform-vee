import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Downloads' };

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    date,
  );

export default async function DownloadsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const downloads = await db.downloadAccess.findMany({
    where: { customerId: session.customerId },
    orderBy: { createdAt: 'desc' },
    include: {
      orderItem: {
        include: {
          order: { select: { orderNumber: true, id: true } },
          product: { select: { slug: true, name: true } },
        },
      },
    },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Downloads</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Alle digitalen Produkte, die du erworben hast.
        </p>
      </div>

      {downloads.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-muted-foreground"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          <p className="text-muted-foreground">Noch keine Downloads vorhanden.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Zum Shop
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {downloads.map((dl) => {
            const expired = dl.expiresAt ? dl.expiresAt < now : false;
            const limitReached =
              dl.maxDownloads !== null &&
              dl.maxDownloads !== undefined &&
              dl.downloadCount >= dl.maxDownloads;
            const unavailable = expired || limitReached;

            return (
              <div
                key={dl.id}
                className={`rounded-xl border bg-background p-5 ${unavailable ? 'border-border opacity-70' : 'border-border'}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{dl.fileName}</p>
                      {expired && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Abgelaufen
                        </span>
                      )}
                      {limitReached && !expired && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                          Limit erreicht
                        </span>
                      )}
                      {!unavailable && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Verfügbar
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Produkt:{' '}
                      <Link
                        href={`/product/${dl.orderItem.product.slug}`}
                        className="text-accent hover:underline"
                      >
                        {dl.orderItem.product.name}
                      </Link>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Gekauft am: <span className="font-medium">{formatDate(dl.createdAt)}</span>
                      </span>
                      <span>
                        Downloads:{' '}
                        <span className="font-medium">
                          {dl.downloadCount}
                          {dl.maxDownloads !== null && dl.maxDownloads !== undefined
                            ? ` / ${dl.maxDownloads}`
                            : ' / unbegrenzt'}
                        </span>
                      </span>
                      {dl.expiresAt && (
                        <span>
                          Gültig bis:{' '}
                          <span className={`font-medium ${expired ? 'text-red-600' : ''}`}>
                            {formatDate(dl.expiresAt)}
                          </span>
                        </span>
                      )}
                      <span>
                        Bestellung:{' '}
                        <Link
                          href={`/account/orders/${dl.orderItem.order.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          #{dl.orderItem.order.orderNumber}
                        </Link>
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {unavailable ? (
                      <span className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" x2="12" y1="15" y2="3"/>
                        </svg>
                        Herunterladen
                      </span>
                    ) : (
                      <a
                        href={`/api/downloads/${dl.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent/90"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" x2="12" y1="15" y2="3"/>
                        </svg>
                        Herunterladen
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
