import Link from 'next/link';
import { getTranslations } from '@/lib/i18n';

export async function Footer() {
  const t = await getTranslations();

  const shopLinks = [
    { href: '/shop', label: t('footer.shopAll') },
    { href: '/shop/schmuck', label: t('footer.shopJewelry') },
    { href: '/shop/wohnaccessoires', label: t('footer.shopHome') },
    { href: '/shop/personalisiert', label: t('footer.shopPersonalized') },
    { href: '/shop/digital', label: t('footer.shopDigital') },
  ];

  const legalLinks = [
    { href: '/legal/impressum', label: t('footer.impressum') },
    { href: '/legal/datenschutz', label: t('footer.datenschutz') },
    { href: '/legal/agb', label: t('footer.agb') },
    { href: '/legal/widerruf', label: t('footer.widerruf') },
  ];

  return (
    <footer className="border-t border-border bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand Info */}
          <div className="md:col-span-1">
            <Link href="/" className="text-2xl font-bold text-foreground">
              Vee
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {t('footer.tagline')}
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="https://instagram.com/vee_handmade"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-muted-foreground transition-colors hover:text-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://pinterest.com/vee_handmade"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Pinterest"
                className="text-muted-foreground transition-colors hover:text-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" x2="12" y1="17" y2="22" />
                  <path d="M17.5 6.5A6 6 0 0 0 6 12c0 1.6.7 3.1 1.9 4.1L8 17" />
                  <path d="M12 2a6 6 0 0 1 5.5 8.5" />
                </svg>
              </a>
              <a
                href="https://etsy.com/shop/veehandmade"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Etsy"
                className="text-muted-foreground transition-colors hover:text-accent"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3h18v18H3z" />
                  <path d="M8 8h8M8 12h6M8 16h4" />
                </svg>
              </a>
            </div>
          </div>

          {/* Shop Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t('common.shop')}
            </h3>
            <ul className="space-y-2">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t('footer.legal')}
            </h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t('footer.newsletter')}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">{t('footer.newsletterText')}</p>
            <form
              action="/api/newsletter"
              method="post"
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="footer-email" className="sr-only">
                {t('field.email')}
              </label>
              <input
                id="footer-email"
                type="email"
                name="email"
                required
                placeholder={t('footer.newsletterPlaceholder')}
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                {t('footer.subscribe')}
              </button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">{t('footer.newsletterSubtext')}</p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          <p>{t('footer.copyright', { year: String(new Date().getFullYear()) })}</p>
        </div>
      </div>
    </footer>
  );
}
