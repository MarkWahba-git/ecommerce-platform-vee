import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Newsletter abbestellen – Vee',
  description: 'Newsletter-Abmeldung bei Vee Handmade.',
  robots: { index: false, follow: false },
};

interface UnsubscribePageProps {
  searchParams: Promise<{ email?: string; token?: string }>;
}

async function unsubscribe(email: string, token: string): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const url = `${baseUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export default async function NewsletterUnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold mb-4">Ungültiger Link</h1>
          <p className="text-gray-600 mb-6">
            Dieser Abmeldungslink ist ungültig oder unvollständig.
          </p>
          <Link href="/" className="underline text-sm">
            Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  const success = await unsubscribe(email, token);

  if (success) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-semibold mb-4">
            Du wurdest erfolgreich abgemeldet.
          </h1>
          <p className="text-gray-600 mb-6">
            Wir haben dich aus unserem Newsletter ausgetragen. Du kannst dich jederzeit wieder
            anmelden.
          </p>
          <Link href="/" className="underline text-sm">
            Zur Startseite
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4">Abmeldung fehlgeschlagen</h1>
        <p className="text-gray-600 mb-6">
          Dieser Link ist ungültig oder abgelaufen. Bitte kontaktiere uns, wenn du Hilfe
          benötigst.
        </p>
        <Link href="/contact" className="underline text-sm">
          Kontakt aufnehmen
        </Link>
      </div>
    </main>
  );
}
