import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description:
    'Datenschutzerklärung von Vee Handmade gemäß DSGVO – Informationen zur Verarbeitung deiner personenbezogenen Daten.',
  robots: { index: true, follow: true },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Datenschutzerklärung</h1>
      <p className="mb-8 text-sm text-muted-foreground">Stand: April 2026</p>

      <div className="space-y-10">
        <Section title="1. Verantwortlicher">
          <p>
            Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) und anderer
            nationaler Datenschutzgesetze sowie sonstiger datenschutzrechtlicher Bestimmungen ist:
          </p>
          <address className="not-italic space-y-0.5 font-medium text-foreground">
            <p>Vee Handmade</p>
            <p>[Vorname Nachname]</p>
            <p>[Straße und Hausnummer]</p>
            <p>[PLZ] [Stadt]</p>
            <p>Deutschland</p>
            <p>
              E-Mail:{' '}
              <a href="mailto:datenschutz@vee-handmade.de" className="text-accent hover:underline">
                datenschutz@vee-handmade.de
              </a>
            </p>
          </address>
        </Section>

        <Section title="2. Allgemeines zur Datenverarbeitung">
          <p>
            Wir nehmen den Schutz deiner persönlichen Daten sehr ernst und behandeln deine
            personenbezogenen Daten vertraulich und entsprechend der gesetzlichen
            Datenschutzvorschriften sowie dieser Datenschutzerklärung.
          </p>
          <p>
            Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten
            möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name,
            Anschrift oder E-Mail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets
            auf freiwilliger Basis. Diese Daten werden ohne deine ausdrückliche Zustimmung nicht
            an Dritte weitergegeben.
          </p>
        </Section>

        <Section title="3. Rechtsgrundlagen der Datenverarbeitung">
          <p>Die Verarbeitung deiner Daten erfolgt auf Basis folgender Rechtsgrundlagen:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> – Einwilligung (z. B. Newsletter)
            </li>
            <li>
              <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – Vertragserfüllung (z. B. Bestellungen)
            </li>
            <li>
              <strong>Art. 6 Abs. 1 lit. c DSGVO</strong> – Rechtliche Verpflichtungen
              (z. B. steuerrechtliche Aufbewahrungspflichten)
            </li>
            <li>
              <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> – Berechtigte Interessen (z. B.
              Betrugsprävention, Sicherheit)
            </li>
          </ul>
        </Section>

        <Section title="4. Datenerfassung auf dieser Website">
          <SubSection title="4.1 Server-Logfiles">
            <p>
              Der Provider dieser Website erhebt und speichert automatisch Informationen in
              sogenannten Server-Log-Dateien, die dein Browser automatisch übermittelt. Dies sind:
              Browsertyp und Browserversion, verwendetes Betriebssystem, Referrer-URL, Hostname
              des zugreifenden Rechners, Uhrzeit der Serveranfrage und IP-Adresse.
            </p>
            <p>
              Diese Daten werden nicht mit anderen Datenquellen zusammengeführt. Rechtsgrundlage
              ist Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          </SubSection>

          <SubSection title="4.2 Kontaktformular">
            <p>
              Wenn du uns per Kontaktformular Anfragen zukommen lässt, werden deine Angaben aus
              dem Anfrageformular inklusive der von dir dort angegebenen Kontaktdaten zwecks
              Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert.
              Diese Daten geben wir nicht ohne deine Einwilligung weiter. Rechtsgrundlage ist
              Art. 6 Abs. 1 lit. b und f DSGVO.
            </p>
          </SubSection>

          <SubSection title="4.3 Kundenkonto & Bestellungen">
            <p>
              Wenn du ein Kundenkonto erstellst oder eine Bestellung aufgibst, verarbeiten wir
              folgende Daten: Name, E-Mail-Adresse, Lieferadresse, Rechnungsadresse, Telefonnummer,
              Bestellhistorie und Zahlungsinformationen (verschlüsselt via Stripe).
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung). Bestelldaten
              werden gemäß § 147 AO für 10 Jahre aufbewahrt.
            </p>
          </SubSection>
        </Section>

        <Section title="5. Cookies">
          <p>
            Unsere Website verwendet Cookies. Cookies sind kleine Textdateien, die auf deinem
            Gerät gespeichert werden und bestimmte Einstellungen und Daten zum Austausch mit
            unseren Systemen über deinen Browser speichern.
          </p>
          <SubSection title="Notwendige Cookies">
            <p>
              Diese Cookies sind für den Betrieb der Website unbedingt erforderlich (z. B.
              Session-Cookies für den Warenkorb und die Authentifizierung). Sie können nicht
              deaktiviert werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b und f DSGVO.
            </p>
          </SubSection>
          <SubSection title="Analyse-Cookies">
            <p>
              Wir verwenden Plausible Analytics, ein datenschutzfreundliches Analysetool ohne
              Cookies. Es werden keine personenbezogenen Daten gespeichert, und es ist keine
              Einwilligung erforderlich.
            </p>
          </SubSection>
        </Section>

        <Section title="6. Analyse – Plausible Analytics">
          <p>
            Diese Website nutzt Plausible Analytics (Plausible Insights OÜ, Västriku tn 2,
            50403 Tartu, Estland). Plausible Analytics ist datenschutzfreundlich und erhebt keine
            personenbezogenen Daten und setzt keine Cookies. Alle Daten sind aggregiert und
            anonym. Weitere Informationen:{' '}
            <a
              href="https://plausible.io/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              plausible.io/privacy
            </a>
            .
          </p>
        </Section>

        <Section title="7. Zahlungsabwicklung – Stripe">
          <p>
            Für die Zahlungsabwicklung nutzen wir Stripe (Stripe, Inc., 354 Oyster Point Blvd,
            South San Francisco, CA 94080, USA; in der EU: Stripe Payments Europe, Ltd., 1 Grand
            Canal Street Lower, Grand Canal Dock, Dublin, Irland).
          </p>
          <p>
            Stripe verarbeitet im Rahmen der Zahlungsabwicklung die von dir angegebenen
            Zahlungsdaten. Wir erhalten von Stripe keine vollständigen Zahlungsmittelinformationen.
            Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.
          </p>
          <p>
            Die Datenschutzerklärung von Stripe ist abrufbar unter:{' '}
            <a
              href="https://stripe.com/de/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              stripe.com/de/privacy
            </a>
            .
          </p>
        </Section>

        <Section title="8. Suche – Meilisearch">
          <p>
            Für die Produktsuche verwenden wir Meilisearch. Suchanfragen werden an Meilisearch
            übermittelt. Es werden nur Suchanfragen verarbeitet, keine personenbezogenen Daten.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer
            funktionierenden Produktsuche).
          </p>
        </Section>

        <Section title="9. Deine Rechte">
          <p>Du hast gegenüber uns folgende Rechte hinsichtlich deiner personenbezogenen Daten:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Du hast das Recht, eine Bestätigung
              darüber zu verlangen, ob wir personenbezogene Daten über dich verarbeiten.
            </li>
            <li>
              <strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO): Du hast das Recht,
              unrichtige personenbezogene Daten unverzüglich berichtigen zu lassen.
            </li>
            <li>
              <strong>Recht auf Löschung</strong> (Art. 17 DSGVO): Du hast das Recht, die Löschung
              deiner personenbezogenen Daten zu verlangen, sofern keine gesetzlichen
              Aufbewahrungspflichten entgegenstehen.
            </li>
            <li>
              <strong>Recht auf Einschränkung</strong> (Art. 18 DSGVO): Du hast das Recht, die
              Einschränkung der Verarbeitung deiner Daten zu verlangen.
            </li>
            <li>
              <strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO): Du hast das Recht,
              deine Daten in einem strukturierten, gängigen, maschinenlesbaren Format zu erhalten.
            </li>
            <li>
              <strong>Widerspruchsrecht</strong> (Art. 21 DSGVO): Du hast das Recht, der
              Verarbeitung deiner Daten zu widersprechen.
            </li>
            <li>
              <strong>Widerruf der Einwilligung</strong>: Du kannst eine erteilte Einwilligung
              jederzeit widerrufen, ohne dass die Rechtmäßigkeit der bis zum Widerruf erfolgten
              Verarbeitung berührt wird.
            </li>
          </ul>
          <p>
            Zur Ausübung deiner Rechte wende dich an:{' '}
            <a href="mailto:datenschutz@vee-handmade.de" className="text-accent hover:underline">
              datenschutz@vee-handmade.de
            </a>
          </p>
          <p>
            Ferner hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
            Die zuständige Behörde richtet sich nach deinem Bundesland bzw. deinem
            Aufenthaltsort.
          </p>
        </Section>

        <Section title="10. Datensicherheit">
          <p>
            Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung
            vertraulicher Inhalte eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte
            Verbindung erkennst du daran, dass die Adresszeile des Browsers von „http://" auf
            „https://" wechselt und an dem Schloss-Symbol in deiner Browserzeile.
          </p>
        </Section>

        <Section title="11. Änderungen dieser Datenschutzerklärung">
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den
            aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen
            in der Datenschutzerklärung umzusetzen, z. B. bei der Einführung neuer Services. Für
            deinen erneuten Besuch gilt dann die neue Datenschutzerklärung.
          </p>
        </Section>
      </div>
    </div>
  );
}
