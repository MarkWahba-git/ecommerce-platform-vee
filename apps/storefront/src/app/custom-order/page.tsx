import type { Metadata } from 'next';
import Link from 'next/link';
import { getSession } from '@/lib/auth-helpers';
import { CustomOrderForm } from './CustomOrderForm';

export const metadata: Metadata = {
  title: 'Individuelle Bestellung',
  description:
    'Wünschst du dir etwas ganz Besonderes? Stelle jetzt deine individuelle Anfrage für personalisierte Handarbeiten von Vee.',
};

const steps = [
  {
    step: '1',
    title: 'Anfrage einreichen',
    description:
      'Beschreibe deinen Wunsch so genau wie möglich – inklusive Maße, Farben, Materialien oder füge Referenzbilder bei.',
  },
  {
    step: '2',
    title: 'Angebot erhalten',
    description:
      'Wir prüfen deine Anfrage und senden dir innerhalb von 1–3 Werktagen ein persönliches Angebot mit Preis und Lieferzeit.',
  },
  {
    step: '3',
    title: 'Entwurf freigeben',
    description:
      'Nach deiner Bestätigung beginnen wir mit der Fertigung. Du erhältst einen Entwurf / Proof zur Freigabe, bevor wir fertigstellen.',
  },
  {
    step: '4',
    title: 'Lieferung',
    description:
      'Sobald du den Entwurf freigegeben hast, wird dein Unikat fertiggestellt und sicher an dich versendet.',
  },
];

export default async function CustomOrderPage() {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Individuelle Bestellung
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Du hast eine besondere Idee? Bei Vee fertigen wir auf Wunsch ganz individuelle Stücke –
          von personalisierten Geschenken bis hin zu maßgefertigten Accessoires. Beschreibe uns
          deinen Wunsch und wir melden uns mit einem Angebot.
        </p>
      </div>

      {/* How it works */}
      <div className="mb-12">
        <h2 className="mb-6 text-xl font-bold text-foreground">So funktioniert es</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ step, title, description }) => (
            <div key={step} className="rounded-xl border border-border bg-background p-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {step}
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form or login prompt */}
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-6 text-xl font-bold text-foreground">Anfrage stellen</h2>

          {session ? (
            <CustomOrderForm />
          ) : (
            <div className="rounded-xl border border-border bg-background p-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto mb-4 text-muted-foreground"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <p className="text-muted-foreground">
                Um eine individuelle Anfrage zu stellen, musst du angemeldet sein.
              </p>
              <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/login?redirect=/custom-order"
                  className="w-full rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 sm:w-auto"
                >
                  Anmelden
                </Link>
                <Link
                  href="/register?redirect=/custom-order"
                  className="w-full rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted sm:w-auto"
                >
                  Konto erstellen
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-background p-6">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Tipps für deine Anfrage</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-accent">✓</span>
                Beschreibe Farben, Muster und Materialien so genau wie möglich.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">✓</span>
                Nenne die gewünschten Maße oder den Verwendungszweck.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">✓</span>
                Füge Links zu Inspirationsbildern oder Fotos bei.
              </li>
              <li className="flex gap-2">
                <span className="text-accent">✓</span>
                Teile uns dein Budget mit – wir versuchen es möglich zu machen.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-background p-6">
            <h3 className="mb-2 text-sm font-semibold text-foreground">Fragen?</h3>
            <p className="text-sm text-muted-foreground">
              Wende dich jederzeit an uns – wir helfen dir gerne bei deiner Anfrage.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Kontakt aufnehmen →
            </Link>
          </div>

          {session && (
            <div className="rounded-xl border border-border bg-background p-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Deine Anfragen</h3>
              <p className="text-sm text-muted-foreground">
                Alle laufenden und abgeschlossenen Anfragen findest du in deinem Konto.
              </p>
              <Link
                href="/account/custom-orders"
                className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
              >
                Meine Anfragen →
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
