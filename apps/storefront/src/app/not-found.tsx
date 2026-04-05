import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Seite nicht gefunden',
  description: 'Diese Seite existiert leider nicht.',
  robots: { index: false },
};

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      {/* Large 404 */}
      <p className="text-8xl font-extrabold text-accent opacity-30 select-none" aria-hidden="true">
        404
      </p>

      <h1 className="mt-4 text-3xl font-bold text-foreground">{t('notFound.title')}</h1>
      <p className="mx-auto mt-4 max-w-md text-muted-foreground leading-relaxed">
        {t('notFound.message')}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {t('notFound.backHome')}
        </Link>
        <Link
          href="/shop"
          className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
        >
          {t('notFound.shopLink')}
        </Link>
      </div>

      {/* Quick links */}
      <nav className="mt-12 space-y-1 text-sm text-muted-foreground" aria-label="Schnellnavigation">
        <p className="font-medium text-foreground">Vielleicht suchst du:</p>
        <ul className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {[
            { href: '/shop', label: t('footer.shopAll') },
            { href: '/shop/schmuck', label: t('footer.shopJewelry') },
            { href: '/shop/wohnaccessoires', label: t('footer.shopHome') },
            { href: '/shop/personalisiert', label: t('footer.shopPersonalized') },
            { href: '/about', label: t('nav.about') },
            { href: '/cart', label: t('common.cart') },
          ].map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="hover:text-foreground transition-colors hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
