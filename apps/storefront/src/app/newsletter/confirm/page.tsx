import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Newsletter-Anmeldung bestätigen – Vee',
  description: 'Bestätige deine Newsletter-Anmeldung bei Vee Handmade.',
  robots: { index: false, follow: false },
};

interface ConfirmPageProps {
  searchParams: Promise<{ token?: string }>;
}

async function confirmSubscription(token: string): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/newsletter/confirm?token=${encodeURIComponent(token)}`, {
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function NewsletterConfirmPage({ searchParams }: ConfirmPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold mb-4">Ungültiger Link</h1>
          <p className="text-gray-600 mb-6">
            Dieser Bestätigungslink ist ungültig oder unvollständig.
          </p>
          <Link href="/" className="underline text-sm">
            Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  const success = await confirmSubscription(token);

  if (success) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-6" aria-hidden>
            ✓
          </div>
          <h1 className="text-2xl font-semibold mb-4">
            Deine Newsletter-Anmeldung wurde bestätigt!
          </h1>
          <p className="text-gray-600 mb-6">
            Willkommen bei Vee! Du erhältst ab sofort unsere neuesten Nachrichten, exklusive
            Angebote und Einblicke in unsere Werkstatt.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-gray-900 text-white px-6 py-3 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Jetzt shoppen
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4">Link abgelaufen</h1>
        <p className="text-gray-600 mb-6">
          Dieser Bestätigungslink ist abgelaufen oder wurde bereits verwendet. Bitte melde dich
          erneut an, um einen neuen Link zu erhalten.
        </p>
        <Link href="/" className="underline text-sm">
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
