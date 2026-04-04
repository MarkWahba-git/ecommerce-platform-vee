import type { Metadata } from 'next';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = {
  title: 'Kontakt',
  description:
    'Schreib uns eine Nachricht – wir helfen dir gerne weiter. Kontaktformular und Kontaktinformationen von Vee Handmade.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-foreground">Kontakt</h1>
        <p className="mt-2 text-muted-foreground">
          Du hast eine Frage zu einer Bestellung, einem Produkt oder etwas anderem? Schreib uns
          einfach – wir antworten in der Regel innerhalb von 1–2 Werktagen.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Form */}
        <ContactForm />

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl border border-border bg-background p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Kontaktinformationen</h2>

            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                    E-Mail
                  </p>
                  <a
                    href="mailto:hallo@vee-handmade.de"
                    className="font-medium text-accent hover:underline"
                  >
                    hallo@vee-handmade.de
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                    Telefon
                  </p>
                  <a
                    href="tel:+49000000000"
                    className="font-medium text-foreground hover:text-accent"
                  >
                    +49 (0) 000 000000
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 shrink-0 text-muted-foreground">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-0.5">
                    Adresse
                  </p>
                  <address className="not-italic font-medium text-foreground space-y-0.5">
                    <p>Vee Handmade</p>
                    <p>[Straße und Hausnummer]</p>
                    <p>[PLZ] [Stadt]</p>
                    <p>Deutschland</p>
                  </address>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-6">
            <h2 className="mb-3 font-semibold text-foreground">Antwortzeiten</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Mo – Fr</span>
                <span className="font-medium text-foreground">9:00 – 17:00 Uhr</span>
              </div>
              <div className="flex justify-between">
                <span>Sa – So</span>
                <span className="font-medium text-foreground">Geschlossen</span>
              </div>
              <p className="mt-2 text-xs">
                Wir antworten in der Regel innerhalb von 1–2 Werktagen.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-6">
            <h2 className="mb-3 font-semibold text-foreground">Häufige Fragen</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/legal/widerrufsbelehrung" className="text-accent hover:underline">
                  Widerrufsrecht & Rückgabe
                </a>
              </li>
              <li>
                <a href="/legal/agb" className="text-accent hover:underline">
                  Allgemeine Geschäftsbedingungen
                </a>
              </li>
              <li>
                <a href="/account/orders" className="text-accent hover:underline">
                  Bestellstatus verfolgen
                </a>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
