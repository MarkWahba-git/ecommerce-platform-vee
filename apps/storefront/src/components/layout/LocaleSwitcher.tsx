'use client';

import { useCallback } from 'react';
import { type Locale, SUPPORTED_LOCALES } from '@vee/shared';

const LOCALE_COOKIE = 'vee_locale';

const LOCALE_LABELS: Record<Locale, { label: string; flag: string }> = {
  de: { label: 'DE', flag: '🇩🇪' },
  en: { label: 'EN', flag: '🇬🇧' },
};

function getClientLocale(): Locale {
  if (typeof document === 'undefined') return 'de';
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const value = match?.split('=')[1];
  if (value && SUPPORTED_LOCALES.includes(value as Locale)) {
    return value as Locale;
  }
  return 'de';
}

function setLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function LocaleSwitcher() {
  const current = getClientLocale();

  const handleSwitch = useCallback(
    (locale: Locale) => {
      if (locale === current) return;
      setLocaleCookie(locale);
      window.location.reload();
    },
    [current],
  );

  return (
    <div className="flex items-center gap-1 rounded-md border border-border px-1.5 py-1 text-xs font-medium">
      {SUPPORTED_LOCALES.map((locale) => {
        const { label, flag } = LOCALE_LABELS[locale];
        const isActive = locale === current;
        return (
          <button
            key={locale}
            onClick={() => handleSwitch(locale)}
            aria-label={`Switch to ${label}`}
            aria-pressed={isActive}
            className={
              isActive
                ? 'cursor-default rounded px-1.5 py-0.5 bg-primary text-primary-foreground transition-colors'
                : 'rounded px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors'
            }
          >
            <span aria-hidden="true" className="mr-0.5">
              {flag}
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
