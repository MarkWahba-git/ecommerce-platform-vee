'use server';

import { headers } from 'next/headers';
import {
  type Locale,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  t as tShared,
  createTranslator,
} from '@vee/shared';

export type { Locale };
export { DEFAULT_LOCALE, SUPPORTED_LOCALES };

const LOCALE_HEADER = 'x-vee-locale';

/**
 * Server-side locale resolution.
 * Reads the locale injected by middleware via the x-vee-locale request header.
 * Falls back to DEFAULT_LOCALE if missing or unrecognised.
 */
export async function getLocale(): Promise<Locale> {
  const headersList = await headers();
  const locale = headersList.get(LOCALE_HEADER);
  if (locale && SUPPORTED_LOCALES.includes(locale as Locale)) {
    return locale as Locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * Server-side helper: resolve locale and return a bound t() function in one call.
 *
 * Usage in a server component:
 *   const t = await getTranslations();
 *   return <h1>{t('common.home')}</h1>;
 */
export async function getTranslations() {
  const locale = await getLocale();
  return createTranslator(locale);
}

// Re-export the raw t() utility for cases where locale is already known.
export { tShared as t, createTranslator };
