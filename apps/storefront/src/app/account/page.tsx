import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';

export const metadata: Metadata = { title: 'Mein Konto' };

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

export default async function AccountOverviewPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const customer = await db.customer.findUnique({
    where: { id: session.customerId },
    select: { firstName: true, lastName: true, email: true },
  });

  const recentOrders = await db.order.findMany({
    where: { customerId: session.customerId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { _count: { select: { items: true } } },
  });

  const [totalOrders, wishlistCount, downloadsCount] = await Promise.all([
    db.order.count({ where: { customerId: session.customerId } }),
    db.wishlist.count({ where: { customerId: session.customerId } }),
    db.downloadAccess.count({ where: { customerId: session.customerId } }),
  ]);

  const firstName = customer?.firstName ?? session.email.split('@')[0];

  const quickLinks = [
    { href: '/account/orders', label: 'Bestellungen', count: totalOrders, icon: 'orders' },
    { href: '/account/downloads', label: 'Downloads', count: downloadsCount, icon: 'downloads' },
    { href: '/account/wishlist', label: 'Wunschliste', count: wishlistCount, icon: 'wishlist' },
    { href: '/account/addresses', label: 'Adressen', count: null, icon: 'addresses' },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="rounded-xl border border-border bg-background p-6">
        <h2 className="text-xl font-bold text-foreground">Willkommen zurück, {firstName}!</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hier findest du eine Übersicht deiner Bestellungen, Downloads und Kontoeinstellungen.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-background p-5 transition hover:border-accent hover:bg-accent/5"
          >
            <p className="text-2xl font-bold text-foreground group-hover:text-accent">
              {link.count !== null ? link.count : '→'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{link.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Letzte Bestellungen</h3>
          <Link
            href="/account/orders"
            className="text-sm text-accent hover:underline"
          >
            Alle anzeigen →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-xl border border-border bg-background p-8 text-center">
            <p className="text-muted-foreground">Du hast noch keine Bestellungen aufgegeben.</p>
            <Link
              href="/shop"
              className="mt-4 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Jetzt einkaufen
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="flex flex-col gap-2 rounded-xl border border-border bg-background p-4 transition hover:border-accent sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Bestellung #{order.orderNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(order.createdAt)} · {order._count.items}{' '}
                    {order._count.items === 1 ? 'Artikel' : 'Artikel'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[order.status] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {statusLabel[order.status] ?? order.status}
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatEUR(order.total)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Settings shortcut */}
      <div className="rounded-xl border border-border bg-background p-5">
        <h3 className="text-sm font-semibold text-foreground">Kontoeinstellungen</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Verwalte dein Profil, Passwort und Datenschutzeinstellungen.
        </p>
        <Link
          href="/account/settings"
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          Zu den Einstellungen →
        </Link>
      </div>
    </div>
  );
}
