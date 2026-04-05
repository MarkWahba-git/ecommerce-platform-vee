'use client';

import { useMemo } from 'react';
import { type Locale, SUPPORTED_LOCALES, createTranslator } from '@vee/shared';

const LOCALE_COOKIE = 'vee_locale';

function getLocaleFromCookie(): Locale {
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

/**
 * Client-side translation hook.
 * Reads the locale from the vee_locale cookie (set by middleware or LocaleSwitcher).
 *
 * Returns `{ locale, t }` where `t(key, params?)` looks up the translation.
 *
 * Usage:
 *   const { t } = useTranslation();
 *   return <h1>{t('common.home')}</h1>;
 */
export function useTranslation(): { locale: Locale; t: ReturnType<typeof createTranslator> } {
  const locale = getLocaleFromCookie();
  const t = useMemo(() => createTranslator(locale), [locale]);
  return { locale, t };
}
