import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Über uns',
  description:
    'Erfahre mehr über Vee Handmade — die Geschichte hinter den handgefertigten Unikaten, unsere Werte und unsere Leidenschaft fürs Handwerk.',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[{ label: 'Über uns' }]} />

      {/* Hero */}
      <section className="mt-6 rounded-2xl bg-secondary px-8 py-14 text-center">
        <span className="text-5xl" role="img" aria-label="Handwerk">
          🧶
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">
          Hinter jedem Stück steckt eine Geschichte.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground leading-relaxed">
          Willkommen bei Vee Handmade — einem kleinen, feinen Atelier, in dem jedes Produkt mit
          Hingabe, Sorgfalt und echter Handarbeit entsteht.
        </p>
      </section>

      {/* Story */}
      <section className="mt-14 space-y-6 text-muted-foreground leading-relaxed">
        <h2 className="text-2xl font-bold text-foreground">Unsere Geschichte</h2>
        <p>
          Vee Handmade begann als ein kleines Hobbyprojekt an einem Küchentisch — mit einer
          Leidenschaft für das Schöne und dem Wunsch, Dinge zu erschaffen, die wirklich bedeuten.
          Was als persönliches Geschenkprojekt für Freunde und Familie startete, ist heute ein
          kleines Atelier, das Menschen in ganz Deutschland mit handgefertigten Unikaten begeistert.
        </p>
        <p>
          Jeder Artikel, der unser Atelier verlässt, ist von Grund auf mit der Hand gefertigt.
          Keine Massenproduktion, keine Kompromisse bei der Qualität — nur ehrliches Handwerk,
          ausgewählte Materialien und die Liebe zum Detail, die in jeder Naht, jedem Knoten und
          jeder Farbe zu spüren ist.
        </p>
        <p>
          Wir glauben, dass handgefertigte Produkte mehr als nur Gegenstände sind. Sie sind
          Geschichten, Erinnerungen und Verbindungen zwischen Menschen. Deshalb bieten wir auch
          personalisierte Sonderanfertigungen an — weil das Besonderste ein Stück ist, das genau
          für dich gemacht wurde.
        </p>
      </section>

      {/* Values */}
      <section className="mt-14">
        <h2 className="mb-8 text-2xl font-bold text-foreground">Unsere Werte</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: '✋',
              title: 'Handgemacht',
              text: 'Jedes Stück entsteht in liebevoller Handarbeit — niemals maschinell produziert.',
            },
            {
              icon: '♻️',
              title: 'Nachhaltig',
              text: 'Wir verwenden hochwertige, langlebige Materialien und achten auf umweltbewusstes Handeln.',
            },
            {
              icon: '💬',
              title: 'Persönlich',
              text: 'Dein Wunsch ist unser Auftrag. Wir fertigen auch individuelle Sonderanfertigungen auf Bestellung.',
            },
          ].map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-border bg-background p-6 text-center"
            >
              <span className="text-4xl" role="img" aria-label={value.title}>
                {value.icon}
              </span>
              <h3 className="mt-3 text-base font-semibold text-foreground">{value.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{value.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="mt-14 space-y-6">
        <h2 className="text-2xl font-bold text-foreground">Wie wir arbeiten</h2>
        <div className="space-y-4">
          {[
            {
              step: '01',
              title: 'Materialauswahl',
              text: 'Wir beziehen ausschließlich hochwertige Rohstoffe von vertrauenswürdigen, wenn möglich lokalen Lieferanten.',
            },
            {
              step: '02',
              title: 'Handarbeit',
              text: 'Jedes Stück wird von uns persönlich gefertigt — mit Geduld, Präzision und Freude am Handwerk.',
            },
            {
              step: '03',
              title: 'Qualitätsprüfung',
              text: 'Bevor ein Produkt unser Atelier verlässt, durchläuft es eine sorgfältige Qualitätsprüfung.',
            },
            {
              step: '04',
              title: 'Liebevolle Verpackung',
              text: 'Jede Bestellung wird nachhaltig und ansprechend verpackt — perfekt auch als Geschenk.',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex gap-5 rounded-lg border border-border bg-background p-5"
            >
              <span className="text-2xl font-bold text-accent flex-shrink-0">{item.step}</span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-14 rounded-2xl bg-primary px-8 py-12 text-center text-primary-foreground">
        <h2 className="text-2xl font-bold">Bereit, etwas Besonderes zu entdecken?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-primary-foreground/80 leading-relaxed">
          Stöbere durch unsere Kollektion handgefertigter Unikate oder beauftrage eine
          persönliche Sonderanfertigung.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/shop"
            className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90"
          >
            Shop entdecken
          </Link>
          <Link
            href="/shop/personalisiert"
            className="rounded-md border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary-foreground/10"
          >
            Sonderanfertigung anfragen
          </Link>
        </div>
      </section>
    </div>
  );
}
