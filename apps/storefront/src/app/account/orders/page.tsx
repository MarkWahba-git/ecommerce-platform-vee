import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Bestellungen' };

const PAGE_SIZE = 10;

const formatEUR = (val: number | string) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(val));

const formatDate = (date: Date) =>
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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? '1', 10));
  const skip = (page - 1) * PAGE_SIZE;

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where: { customerId: session.customerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
    db.order.count({ where: { customerId: session.customerId } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Bestellungen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} {total === 1 ? 'Bestellung' : 'Bestellungen'} insgesamt
        </p>
      </div>

      {orders.length === 0 ? (
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
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <line x1="3" x2="21" y1="6" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <p className="text-muted-foreground">Du hast noch keine Bestellungen aufgegeben.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Jetzt einkaufen
          </Link>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-5 py-3.5 text-left font-semibold text-foreground">
                    Bestellung
                  </th>
                  <th className="px-5 py-3.5 text-left font-semibold text-foreground">Datum</th>
                  <th className="px-5 py-3.5 text-left font-semibold text-foreground">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold text-foreground">Artikel</th>
                  <th className="px-5 py-3.5 text-right font-semibold text-foreground">Gesamt</th>
                  <th className="px-5 py-3.5 text-right font-semibold text-foreground">
                    <span className="sr-only">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="transition hover:bg-muted/30">
                    <td className="px-5 py-4 font-medium text-foreground">
                      #{order.orderNumber}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusLabel[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-muted-foreground">
                      {order._count.items}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-foreground">
                      {formatEUR(order.total)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="text-accent hover:underline"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Seite {page} von {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/account/orders?page=${page - 1}`}
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    ← Zurück
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/account/orders?page=${page + 1}`}
                    className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                  >
                    Weiter →
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
