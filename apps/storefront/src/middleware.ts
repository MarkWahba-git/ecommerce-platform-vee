import { type NextRequest, NextResponse } from 'next/server';
import { type Locale, SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@vee/shared';

const LOCALE_COOKIE = 'vee_locale';
const LOCALE_HEADER = 'x-vee-locale';

/**
 * Detect the preferred locale from cookies or the Accept-Language header.
 * Cookie takes priority over header; falls back to DEFAULT_LOCALE ('de').
 */
export function detectLocale(request: NextRequest): Locale {
  // 1. Check locale cookie
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 2. Parse Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(',')
      .map((part) => {
        const [lang, q] = part.trim().split(';q=');
        return { lang: lang.trim().split('-')[0].toLowerCase(), q: q ? parseFloat(q) : 1 };
      })
      .sort((a, b) => b.q - a.q);

    for (const { lang } of preferred) {
      if (SUPPORTED_LOCALES.includes(lang as Locale)) {
        return lang as Locale;
      }
    }
  }

  // 3. Fall back to default
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const locale = detectLocale(request);

  // Propagate locale to server components via a custom request header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Persist cookie if not already set or if it differs from what we detected
  const existingCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (existingCookie !== locale) {
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - API routes under /api
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
