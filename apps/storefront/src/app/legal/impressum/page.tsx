import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum',
  description: 'Impressum und Anbieterkennzeichnung von Vee Handmade gemäß § 5 TMG.',
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-foreground">Impressum</h1>

      <div className="prose prose-sm max-w-none space-y-8 text-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
          <div className="mt-3 space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">Vee Handmade</p>
            <p>[Vorname Nachname]</p>
            <p>[Straße und Hausnummer]</p>
            <p>[PLZ] [Stadt]</p>
            <p>Deutschland</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Kontakt</h2>
          <div className="mt-3 space-y-1 text-muted-foreground">
            <p>
              Telefon:{' '}
              <a href="tel:+49000000000" className="text-accent hover:underline">
                +49 (0) 000 000000
              </a>
            </p>
            <p>
              E-Mail:{' '}
              <a href="mailto:hallo@vee-handmade.de" className="text-accent hover:underline">
                hallo@vee-handmade.de
              </a>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Umsatzsteuer-Identifikationsnummer
          </h2>
          <div className="mt-3 text-muted-foreground">
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:
            </p>
            <p className="font-medium text-foreground">[DE000000000]</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <div className="mt-3 space-y-1 text-muted-foreground">
            <p className="font-medium text-foreground">[Vorname Nachname]</p>
            <p>[Straße und Hausnummer]</p>
            <p>[PLZ] [Stadt]</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">EU-Streitschlichtung</h2>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
              bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p>
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Verbraucherstreitbeilegung / Universalschlichtungsstelle
          </h2>
          <div className="mt-3 text-muted-foreground">
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Haftung für Inhalte</h2>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen
              Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir
              als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
              rechtswidrige Tätigkeit hinweisen.
            </p>
            <p>
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
              allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist
              jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
              Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte
              umgehend entfernen.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Haftung für Links</h2>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
              keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
              Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
              Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
            <p>
              Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche
              Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung
              nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist
              jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei
              Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">Urheberrecht</h2>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
              Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
              bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
            <p>
              Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen
              Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt
              wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte
              Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine
              Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden
              Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte
              umgehend entfernen.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
