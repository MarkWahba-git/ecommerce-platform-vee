import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Allgemeine Geschäftsbedingungen',
  description:
    'Allgemeine Geschäftsbedingungen (AGB) von Vee Handmade für den Online-Shop.',
  robots: { index: true, follow: true },
};

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">
        § {num} {title}
      </h2>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export default function AgbPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Allgemeine Geschäftsbedingungen (AGB)
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">Stand: April 2026</p>

      <div className="space-y-10">
        <Section num="1" title="Geltungsbereich">
          <p>
            Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Verträge zwischen Vee
            Handmade, [Vorname Nachname], [Adresse], [PLZ] [Stadt] (nachfolgend „Verkäufer")
            und den Kunden (nachfolgend „Käufer") über den Online-Shop unter
            vee-handmade.de.
          </p>
          <p>
            Abweichende Bedingungen des Käufers werden nicht anerkannt, es sei denn, der Verkäufer
            stimmt ihrer Geltung ausdrücklich schriftlich zu.
          </p>
          <p>
            Verbraucher im Sinne dieser AGB ist jede natürliche Person, die ein Rechtsgeschäft zu
            Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbständigen
            beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB).
          </p>
        </Section>

        <Section num="2" title="Vertragsschluss">
          <p>
            Die Darstellung der Produkte im Online-Shop stellt kein rechtlich bindendes Angebot,
            sondern eine Aufforderung zur Bestellung (invitatio ad offerendum) dar.
          </p>
          <p>
            Durch Klicken des Buttons „Jetzt kaufen" gibt der Käufer ein verbindliches Angebot
            zum Kauf der im Warenkorb befindlichen Waren ab. Die Bestellbestätigung per E-Mail
            stellt noch keine Annahme des Angebots dar, sondern dient lediglich der Information.
          </p>
          <p>
            Ein Kaufvertrag kommt erst zustande, wenn der Verkäufer das Angebot des Käufers durch
            eine separate E-Mail (Auftragsbestätigung) oder durch die Übergabe der Ware annimmt.
          </p>
        </Section>

        <Section num="3" title="Preise und Versandkosten">
          <p>
            Alle Preise im Online-Shop sind Endpreise in Euro und enthalten die gesetzliche
            Mehrwertsteuer. Etwaige Versandkosten sind nicht im Kaufpreis enthalten; sie werden
            dem Käufer im Bestellvorgang separat mitgeteilt.
          </p>
          <p>
            Bei Lieferungen in Länder außerhalb der EU können zusätzliche Zölle, Steuern und
            Abgaben anfallen, die vom Käufer zu tragen sind.
          </p>
        </Section>

        <Section num="4" title="Zahlung">
          <p>
            Die Zahlung erfolgt wahlweise per Kreditkarte, SEPA-Lastschrift, PayPal oder anderen
            angebotenen Zahlungsmethoden. Die Zahlungsabwicklung erfolgt über den
            Zahlungsdienstleister Stripe.
          </p>
          <p>
            Bei Vorkasse-Zahlung ist der Rechnungsbetrag innerhalb von 7 Tagen nach
            Auftragsbestätigung zu überweisen. Bei Überschreitung des Zahlungsziels gerät der
            Käufer ohne weitere Mahnung in Verzug.
          </p>
          <p>
            Die Aufrechnung mit Gegenforderungen ist nur zulässig, wenn die Gegenforderungen
            unbestritten oder rechtskräftig festgestellt sind.
          </p>
        </Section>

        <Section num="5" title="Lieferung und Lieferzeit">
          <p>
            Die Lieferung erfolgt an die vom Käufer angegebene Lieferadresse. Lieferungen
            erfolgen in der Regel innerhalb Deutschlands innerhalb von 3–7 Werktagen nach
            Zahlungseingang, bei personalisierten Produkten entsprechend der angegebenen
            Produktionszeit.
          </p>
          <p>
            Bei handgefertigten und personalisierten Produkten können sich Lieferzeiten verlängern.
            Die voraussichtliche Lieferzeit wird auf der jeweiligen Produktseite angegeben.
          </p>
          <p>
            Wenn keine Waren verfügbar sind, behalten wir uns vor, die Lieferung abzulehnen.
            In diesem Fall werden bereits geleistete Zahlungen unverzüglich erstattet.
          </p>
          <p>
            Das Risiko des zufälligen Untergangs und der zufälligen Verschlechterung der Ware
            geht mit der Übergabe an den Käufer oder eine empfangsberechtigte Person über.
          </p>
        </Section>

        <Section num="6" title="Eigentumsvorbehalt">
          <p>
            Die gelieferte Ware bleibt bis zur vollständigen Bezahlung Eigentum des Verkäufers.
          </p>
        </Section>

        <Section num="7" title="Widerrufsrecht">
          <p>
            Verbrauchern steht ein gesetzliches Widerrufsrecht zu. Die genauen Bedingungen
            entnehme bitte unserer{' '}
            <Link href="/legal/widerrufsbelehrung" className="text-accent hover:underline">
              Widerrufsbelehrung
            </Link>
            .
          </p>
          <p>
            Das Widerrufsrecht gilt nicht für:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Waren, die nach Kundenspezifikation angefertigt werden oder eindeutig auf die
              persönlichen Bedürfnisse zugeschnitten sind (personalisierte Produkte, § 312g Abs. 2
              Nr. 1 BGB)
            </li>
            <li>
              Digitale Produkte (Downloads), die nach Beginn der Ausführung mit ausdrücklicher
              Einwilligung und Bestätigung des Verlustes des Widerrufsrechts geliefert wurden
              (§ 356 Abs. 5 BGB)
            </li>
          </ul>
        </Section>

        <Section num="8" title="Mängelhaftung und Gewährleistung">
          <p>
            Für Mängel der gelieferten Ware gelten die gesetzlichen Gewährleistungsrechte. Die
            Verjährungsfrist beträgt zwei Jahre ab Ablieferung der Ware.
          </p>
          <p>
            Handgefertigte Produkte können natürliche Variationen in Farbe, Textur und Maßen
            aufweisen, die keine Mängel darstellen, sondern das charakteristische Merkmal
            handgefertigter Waren sind.
          </p>
          <p>
            Bei Mängeln wende dich bitte an:{' '}
            <a href="mailto:hallo@vee-handmade.de" className="text-accent hover:underline">
              hallo@vee-handmade.de
            </a>
          </p>
        </Section>

        <Section num="9" title="Haftung">
          <p>
            Der Verkäufer haftet unbeschränkt für Vorsatz und grobe Fahrlässigkeit. Bei leichter
            Fahrlässigkeit haftet der Verkäufer nur bei Verletzung einer wesentlichen
            Vertragspflicht (Kardinalpflicht), bei Schäden aus der Verletzung des Lebens, des
            Körpers oder der Gesundheit sowie nach dem Produkthaftungsgesetz.
          </p>
          <p>
            Die Haftung für leichte Fahrlässigkeit bei Kardinalpflichten ist auf den bei
            Vertragsschluss typischerweise vorhersehbaren, vertragstypischen Schaden begrenzt.
          </p>
        </Section>

        <Section num="10" title="Anwendbares Recht und Gerichtsstand">
          <p>
            Für alle Rechtsbeziehungen der Parteien gilt das Recht der Bundesrepublik Deutschland
            unter Ausschluss der Gesetze über den internationalen Kauf beweglicher Waren (UN-Kaufrecht).
            Bei Verbrauchern gilt diese Rechtswahl nur insoweit, als nicht der gewährte Schutz durch
            zwingende Bestimmungen des Rechts des Staates, in dem der Verbraucher seinen
            gewöhnlichen Aufenthalt hat, entzogen wird.
          </p>
          <p>
            Gerichtsstand für alle Streitigkeiten aus Verträgen mit Kaufleuten, juristischen
            Personen des öffentlichen Rechts oder öffentlich-rechtlichen Sondervermögen ist der
            Sitz des Verkäufers. Für alle anderen Kunden gelten die gesetzlichen
            Gerichtsstandsregeln.
          </p>
        </Section>

        <Section num="11" title="Streitbeilegung">
          <p>
            Die EU-Kommission stellt eine Plattform für außergerichtliche Online-Streitbeilegung
            bereit:{' '}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor
            einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </Section>

        <Section num="12" title="Salvatorische Klausel">
          <p>
            Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder nach
            Vertragsschluss unwirksam oder undurchführbar werden, bleibt davon die Wirksamkeit
            des Vertrages im Übrigen unberührt. An die Stelle der unwirksamen oder
            undurchführbaren Bestimmung soll diejenige wirksame und durchführbare Regelung treten,
            deren Wirkungen der wirtschaftlichen Zielsetzung am nächsten kommen.
          </p>
        </Section>
      </div>
    </div>
  );
}
