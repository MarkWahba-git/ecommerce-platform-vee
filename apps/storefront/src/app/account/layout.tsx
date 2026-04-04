import { redirect } from 'next/navigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getSession } from '@/lib/auth-helpers';
import { db } from '@vee/db';

const navItems = [
  { href: '/account', label: 'Übersicht', exact: true },
  { href: '/account/orders', label: 'Bestellungen' },
  { href: '/account/downloads', label: 'Downloads' },
  { href: '/account/wishlist', label: 'Wunschliste' },
  { href: '/account/addresses', label: 'Adressen' },
  { href: '/account/settings', label: 'Einstellungen' },
];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const customer = await db.customer.findUnique({
    where: { id: session.customerId },
    select: { firstName: true, lastName: true, email: true },
  });

  const displayName =
    customer?.firstName || customer?.lastName
      ? [customer.firstName, customer.lastName].filter(Boolean).join(' ')
      : session.email;

  const headerList = await headers();
  const pathname = headerList.get('x-pathname') ?? '';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Mein Konto</h1>
        <p className="mt-1 text-sm text-muted-foreground">{customer?.email ?? session.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside>
          {/* Customer info card */}
          <div className="mb-6 rounded-xl border border-border bg-background p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {customer?.email ?? session.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Konto-Navigation">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={
                        isActive
                          ? 'flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent'
                          : 'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
                      }
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
