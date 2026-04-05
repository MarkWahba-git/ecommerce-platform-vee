'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  marketingConsent: boolean;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.firstName.trim()) errors.firstName = 'Vorname ist erforderlich.';
  if (!form.lastName.trim()) errors.lastName = 'Nachname ist erforderlich.';

  if (!form.email.trim()) {
    errors.email = 'E-Mail-Adresse ist erforderlich.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
  }

  if (!form.password) {
    errors.password = 'Passwort ist erforderlich.';
  } else if (form.password.length < 8) {
    errors.password = 'Passwort muss mindestens 8 Zeichen lang sein.';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Bitte Passwort bestätigen.';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwörter stimmen nicht überein.';
  }

  return errors;
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    marketingConsent: false,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error on change
    if (fieldErrors[name as keyof FieldErrors]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError('');

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      // Register
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          marketingConsent: form.marketingConsent,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(
          data.error ?? 'Registrierung fehlgeschlagen. Bitte versuche es erneut.'
        );
        return;
      }

      // Auto sign in after successful registration
      const signInResult = await signIn('credentials', {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        router.push('/account');
        router.refresh();
      } else {
        // Registration succeeded but sign-in failed; redirect to login
        router.push('/login?registered=1');
      }
    } catch {
      setServerError('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.');
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
            Konto erstellen
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registriere dich kostenlos und entdecke unsere Produkte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Server error */}
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Vorname
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={form.firstName}
                onChange={handleChange}
                placeholder="Anna"
                disabled={isLoading}
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:outline-none focus:ring-1 disabled:opacity-50 ${
                  fieldErrors.firstName
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-border bg-background focus:border-foreground focus:ring-foreground'
                }`}
              />
              {fieldErrors.firstName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.firstName}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Nachname
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={form.lastName}
                onChange={handleChange}
                placeholder="Müller"
                disabled={isLoading}
                className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:outline-none focus:ring-1 disabled:opacity-50 ${
                  fieldErrors.lastName
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                    : 'border-border bg-background focus:border-foreground focus:ring-foreground'
                }`}
              />
              {fieldErrors.lastName && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.lastName}</p>
              )}
            </div>
          </div>

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
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="deine@email.de"
              disabled={isLoading}
              className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:outline-none focus:ring-1 disabled:opacity-50 ${
                fieldErrors.email
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-border bg-background focus:border-foreground focus:ring-foreground'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Passwort
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={handleChange}
              placeholder="Mindestens 8 Zeichen"
              disabled={isLoading}
              className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:outline-none focus:ring-1 disabled:opacity-50 ${
                fieldErrors.password
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-border bg-background focus:border-foreground focus:ring-foreground'
              }`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Passwort bestätigen
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Passwort wiederholen"
              disabled={isLoading}
              className={`block w-full rounded-lg border px-3.5 py-2.5 text-sm text-foreground placeholder-muted-foreground shadow-sm transition focus:outline-none focus:ring-1 disabled:opacity-50 ${
                fieldErrors.confirmPassword
                  ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
                  : 'border-border bg-background focus:border-foreground focus:ring-foreground'
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Marketing consent */}
          <div className="flex items-start gap-3 pt-1">
            <input
              id="marketingConsent"
              name="marketingConsent"
              type="checkbox"
              checked={form.marketingConsent}
              onChange={handleChange}
              disabled={isLoading}
              className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-border accent-foreground"
            />
            <label
              htmlFor="marketingConsent"
              className="text-xs leading-relaxed text-muted-foreground"
            >
              Ich möchte per E-Mail über neue Produkte, Angebote und Neuigkeiten von Vee
              informiert werden. Diese Einwilligung kann jederzeit widerrufen werden.
            </label>
          </div>

          {/* Terms note */}
          <p className="text-xs text-muted-foreground">
            Mit der Registrierung stimmst du unseren{' '}
            <Link
              href="/legal/agb"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Allgemeinen Geschäftsbedingungen
            </Link>{' '}
            und der{' '}
            <Link
              href="/legal/datenschutz"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Datenschutzerklärung
            </Link>{' '}
            zu.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
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
                Konto wird erstellt …
              </>
            ) : (
              'Konto erstellen'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">oder</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Login link */}
        <p className="text-center text-sm text-muted-foreground">
          Bereits ein Konto?{' '}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
