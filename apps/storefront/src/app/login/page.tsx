'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Ungültige E-Mail-Adresse oder Passwort. Bitte überprüfe deine Eingaben.');
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Willkommen zurück
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Melde dich in deinem Konto an
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="deine@email.de"
              disabled={isLoading}
              className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Passwort
              </label>
              <Link
                href="/account/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Passwort vergessen?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="block w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground disabled:opacity-50"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className="flex w-full items-center justify-center rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg
                  className="-ml-1 mr-2 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Anmelden …
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">oder</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-muted-foreground">
          Noch kein Konto?{' '}
          <Link
            href="/login/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Jetzt kostenlos registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground text-sm">Laden …</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
