'use client';

import { useEffect } from 'react';
import { captureException } from '@vee/core';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js root-level error boundary for layout errors.
 * Must include its own <html> and <body> tags because it replaces the root layout.
 * Reports to Sentry and shows a minimal German error page.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    captureException(error, {
      digest: error.digest,
      source: 'storefront-global-error-boundary',
    });
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          backgroundColor: '#fafaf9',
          color: '#1c1917',
          padding: '1rem',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem' }}>
            Etwas ist schiefgelaufen
          </h1>
          <p style={{ color: '#78716c', marginBottom: '1.5rem', lineHeight: '1.6' }}>
            Es tut uns leid — ein kritischer Fehler ist aufgetreten. Unser Team wurde automatisch
            benachrichtigt.
          </p>
          {error.digest && (
            <p style={{ fontSize: '0.75rem', color: '#a8a29e', marginBottom: '1.5rem' }}>
              Fehler-ID: <code>{error.digest}</code>
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#292524',
                color: '#fff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Erneut versuchen
            </button>
            <a
              href="/"
              style={{
                padding: '0.625rem 1.5rem',
                border: '1px solid #e7e5e4',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                textDecoration: 'none',
                color: '#1c1917',
              }}
            >
              Zur Startseite
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
