'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { captureException } from '@vee/core';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js page-level error boundary.
 * Catches errors thrown during rendering within a route segment.
 * Reports to Sentry and shows a user-friendly German error page.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    captureException(error, {
      digest: error.digest,
      source: 'storefront-error-boundary',
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Etwas ist schiefgelaufen</h1>
          <p className="text-muted-foreground">
            Es tut uns leid — auf dieser Seite ist ein unerwarteter Fehler aufgetreten. Unser Team
            wurde bereits benachrichtigt.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Fehler-ID: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Erneut versuchen
          </button>
          <Link
            href="/"
            className="rounded-md border border-border px-6 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
