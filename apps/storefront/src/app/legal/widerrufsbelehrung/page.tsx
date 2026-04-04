import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Widerrufsbelehrung',
  description:
    'Widerrufsbelehrung und Widerrufsformular für den Vee Handmade Online-Shop gemäß EU-Verbraucherrechterichtlinie.',
  robots: { index: true, follow: true },
};

export default function WiderrufsbelehrungPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Widerrufsbelehrung</h1>
      <p className="mb-8 text-sm text-muted-foreground">Stand: April 2026</p>

      <div className="space-y-10 text-sm">
        {/* Withdrawal right */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Widerrufsrecht</h2>
          <p className="text-muted-foreground">
            Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu
            widerrufen.
          </p>
          <p className="text-muted-foreground">
            Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem du oder ein von dir
            benannter Dritter, der nicht der Beförderer ist, die Waren in Besitz genommen hast
            bzw. hat.
          </p>
          <p className="text-muted-foreground">
            Um dein Widerrufsrecht auszuüben, musst du uns (Vee Handmade, [Vorname Nachname],
            [Straße und Hausnummer], [PLZ] [Stadt], E-Mail: hallo@vee-handmade.de) mittels einer
            eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über
            deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Du kannst dafür das
            beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
          </p>
          <p className="text-muted-foreground">
            Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung
            des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.
          </p>
        </section>

        {/* Consequences of withdrawal */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Folgen des Widerrufs</h2>
          <p className="text-muted-foreground">
            Wenn du diesen Vertrag widerrufst, haben wir dir alle Zahlungen, die wir von dir
            erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten,
            die sich daraus ergeben, dass du eine andere Art der Lieferung als die von uns
            angebotene, günstigste Standardlieferung gewählt hast), unverzüglich und spätestens
            binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über deinen
            Widerruf dieses Vertrags bei uns eingegangen ist.
          </p>
          <p className="text-muted-foreground">
            Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das du bei der
            ursprünglichen Transaktion eingesetzt hast, es sei denn, mit dir wurde ausdrücklich
            etwas anderes vereinbart; in keinem Fall werden dir wegen dieser Rückzahlung Entgelte
            berechnet.
          </p>
          <p className="text-muted-foreground">
            Wir können die Rückzahlung verweigern, bis wir die Waren wieder zurückerhalten haben
            oder bis du den Nachweis erbracht hast, dass du die Waren zurückgesandt hast, je
            nachdem, welches der frühere Zeitpunkt ist.
          </p>
          <p className="text-muted-foreground">
            Du hast die Waren unverzüglich und in jedem Fall spätestens binnen vierzehn Tagen ab
            dem Tag, an dem du uns über den Widerruf dieses Vertrags unterrichtest, an uns
            zurückzusenden oder zu übergeben. Die Frist ist gewahrt, wenn du die Waren vor Ablauf
            der Frist von vierzehn Tagen absendest. Die unmittelbaren Kosten der Rücksendung der
            Waren trägst du.
          </p>
          <p className="text-muted-foreground">
            Du musst für einen etwaigen Wertverlust der Waren nur aufkommen, wenn dieser
            Wertverlust auf einen zur Prüfung der Beschaffenheit, Eigenschaften und
            Funktionsweise der Waren nicht notwendigen Umgang mit ihnen zurückzuführen ist.
          </p>
        </section>

        {/* Exceptions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Ausnahmen vom Widerrufsrecht</h2>
          <p className="text-muted-foreground">
            Das Widerrufsrecht besteht nicht bei folgenden Verträgen:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>
              <strong className="text-foreground">Personalisierte Produkte</strong>: Verträge zur
              Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung eine
              individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist oder die
              eindeutig auf die persönlichen Bedürfnisse des Verbrauchers zugeschnitten sind
              (§ 312g Abs. 2 Nr. 1 BGB). Dies gilt für alle von uns angebotenen personalisierten
              und nach Kundenwunsch gefertigten Produkte.
            </li>
            <li>
              <strong className="text-foreground">Digitale Inhalte</strong>: Verträge zur
              Lieferung von digitalen Inhalten, die nicht auf einem körperlichen Datenträger
              geliefert werden, wenn der Unternehmer mit der Ausführung des Vertrags begonnen hat
              und der Verbraucher ausdrücklich zugestimmt hat, dass der Unternehmer mit der
              Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnt, und seine Kenntnis
              davon bestätigt hat, dass er durch seine Zustimmung mit Beginn der Ausführung des
              Vertrags sein Widerrufsrecht verliert (§ 356 Abs. 5 BGB).
            </li>
          </ul>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-amber-800">
              <strong>Hinweis zu personalisierten Produkten:</strong> Bitte prüfe deine Angaben
              vor der Bestellung sorgfältig, da personalisierte Produkte vom Widerrufsrecht
              ausgeschlossen sind. Bei Fragen wende dich bitte vor der Bestellung an uns.
            </p>
          </div>
        </section>

        {/* Withdrawal form */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Muster-Widerrufsformular</h2>
          <p className="text-muted-foreground">
            (Wenn du den Vertrag widerrufen willst, dann fülle bitte dieses Formular aus und
            sende es zurück.)
          </p>

          <div className="rounded-xl border border-border bg-muted/30 p-6 space-y-4 text-muted-foreground">
            <p>An:</p>
            <address className="not-italic space-y-0.5">
              <p className="font-medium text-foreground">Vee Handmade</p>
              <p>[Vorname Nachname]</p>
              <p>[Straße und Hausnummer]</p>
              <p>[PLZ] [Stadt]</p>
              <p>
                E-Mail:{' '}
                <a href="mailto:hallo@vee-handmade.de" className="text-accent hover:underline">
                  hallo@vee-handmade.de
                </a>
              </p>
            </address>

            <div className="space-y-3 pt-2">
              <p>
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über
                den Kauf der folgenden Waren (*) / die Erbringung der folgenden Dienstleistung (*)
              </p>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="shrink-0">Bestellt am (*):</span>
                  <span className="flex-1 border-b border-border" />
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0">Erhalten am (*):</span>
                  <span className="flex-1 border-b border-border" />
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0">Name des/der Verbraucher(s):</span>
                  <span className="flex-1 border-b border-border" />
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0">Anschrift des/der Verbraucher(s):</span>
                  <span className="flex-1 border-b border-border" />
                </div>
                <div className="flex gap-2 items-end">
                  <span className="shrink-0">
                    Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):
                  </span>
                  <span className="flex-1 border-b border-border" />
                </div>
                <div className="flex gap-2">
                  <span className="shrink-0">Datum:</span>
                  <span className="flex-1 border-b border-border" />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">(*) Unzutreffendes streichen</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
