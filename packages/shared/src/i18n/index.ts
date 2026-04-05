import { de } from './de';
import { en } from './en';

export type Locale = 'de' | 'en';

export const DEFAULT_LOCALE: Locale = 'de';

export const SUPPORTED_LOCALES: Locale[] = ['de', 'en'];

export type TranslationKey = keyof typeof de;

export type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = { de, en };

/**
 * Look up a translation key for the given locale, with optional parameter interpolation.
 * Parameter syntax: {{paramName}}
 *
 * Falls back to the German (default) translation if the key is missing in the requested locale.
 * Returns the key itself if not found in any locale.
 */
export function t(
  key: string,
  locale: Locale,
  params?: Record<string, string>,
): string {
  const localeTranslations = translations[locale];
  const fallbackTranslations = translations[DEFAULT_LOCALE];

  let value: string =
    localeTranslations[key] ?? fallbackTranslations[key] ?? key;

  if (params) {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, paramKey: string) => {
      return params[paramKey] ?? `{{${paramKey}}}`;
    });
  }

  return value;
}

/**
 * Create a bound translator for a specific locale.
 * Convenient when you need to call t() many times with the same locale.
 */
export function createTranslator(locale: Locale) {
  return (key: string, params?: Record<string, string>) =>
    t(key, locale, params);
}

export { de, en };
