'use client';

import { useEffect } from 'react';
import { captureException } from '@vee/core';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Admin panel page-level error boundary.
 * Reports errors to Sentry and shows a clean fallback UI.
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    captureException(error, {
      digest: error.digest,
      source: 'admin-error-boundary',
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md space-y-6 rounded-lg border border-red-200 bg-red-50 p-8">
        {/* Icon */}
        <div className="flex justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-500"
            aria-hidden="true"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-gray-900">Fehler aufgetreten</h1>
          <p className="text-sm text-gray-600">
            In diesem Bereich ist ein unerwarteter Fehler aufgetreten. Der Fehler wurde automatisch
            gemeldet.
          </p>
          {process.env.NODE_ENV !== 'production' && (
            <details className="mt-3 text-left">
              <summary className="cursor-pointer text-xs font-medium text-gray-500">
                Fehlerdetails (nur Entwicklung)
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-red-100 p-3 text-xs text-red-800">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          {error.digest && (
            <p className="text-xs text-gray-400">
              Fehler-ID: <code className="font-mono">{error.digest}</code>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            Erneut versuchen
          </button>
          <a
            href="/admin"
            className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Zum Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
