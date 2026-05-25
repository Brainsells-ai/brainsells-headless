import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Widerrufsrecht',
  description:
    'Widerrufsbelehrung gemäß § 356a BGB und § 11 FAGG für Bestellungen bei SILBE.',
};

const ink = 'var(--color-ink)';
const taupe = 'var(--color-taupe)';
const burgundy = 'var(--color-burgundy)';

const containerStyle: React.CSSProperties = {
  maxWidth: 'var(--container-narrow, 720px)',
  margin: '0 auto',
  padding: 'clamp(96px, 10vw, 144px) 24px',
};

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 'clamp(36px, 5vw, 56px)',
  lineHeight: 1.1,
  color: ink,
  margin: '0 0 48px',
  textWrap: 'balance',
};

const h2Style: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 'clamp(24px, 3vw, 32px)',
  lineHeight: 1.2,
  color: ink,
  margin: '48px 0 16px',
};

const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '19px',
  lineHeight: 1.7,
  color: ink,
  margin: '0 0 16px',
  textWrap: 'pretty',
};

const addressStyle: React.CSSProperties = {
  ...pStyle,
  fontStyle: 'normal',
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop:
    '0.5px solid color-mix(in srgb, var(--color-ink) 30%, transparent)',
  margin: '64px 0 24px',
};

const standStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: taupe,
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: burgundy,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

export default function WiderrufsrechtPage() {
  return (
    <article style={containerStyle}>
      <h1 style={h1Style}>Widerrufsrecht</h1>

      <h2 style={h2Style}>Widerrufsbelehrung</h2>
      <p style={pStyle}>
        Verbraucherinnen und Verbraucher haben das Recht, binnen vierzehn
        Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die
        Widerrufsfrist beträgt vierzehn Tage ab dem Tag, an dem Sie oder
        ein von Ihnen benannter Dritter, der nicht der Beförderer ist, die
        Waren in Besitz genommen haben beziehungsweise hat.
      </p>
      <p style={pStyle}>
        Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer
        eindeutigen Erklärung — etwa per Brief oder E-Mail — über Ihren
        Entschluss, diesen Vertrag zu widerrufen, informieren:
      </p>
      <address style={addressStyle}>
        Brainsells e.U.
        <br />
        Rueppgasse 32/12
        <br />
        1020 Wien
        <br />
        Österreich
        <br />
        E-Mail:{' '}
        <a href="mailto:hallo@silbe.at" style={{ color: ink }}>
          hallo@silbe.at
        </a>
      </address>
      <p style={pStyle}>
        Sie können dafür das{' '}
        <Link href="/widerrufsformular" style={linkStyle}>
          Muster-Widerrufsformular
        </Link>{' '}
        verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der
        Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die
        Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
        absenden.
      </p>

      <h2 style={h2Style}>Elektronische Widerrufsfunktion</h2>
      <p style={pStyle}>
        Sie können Ihren Vertrag auch elektronisch über die Widerrufsfunktion
        unter{' '}
        <Link href="/widerruf" style={linkStyle}>
          silbe.at/widerruf
        </Link>{' '}
        widerrufen. Hierbei werden Sie durch ein zweistufiges Verfahren geführt:
      </p>
      <ol style={{ ...pStyle, paddingLeft: '1.4em' }}>
        <li>Eingabe Ihrer Bestellnummer und E-Mail-Adresse</li>
        <li>Bestätigung des Widerrufs auf der nachfolgenden Seite</li>
      </ol>
      <p style={pStyle}>
        Nach erfolgtem Widerruf erhalten Sie unverzüglich eine
        Eingangsbestätigung mit Zeitstempel per E-Mail. Die Erklärung gilt mit
        Klick auf die Schaltfläche „Widerruf bestätigen“ als zugegangen
        (§ 356a Abs. 5 BGB).
      </p>

      <h2 style={h2Style}>Folgen des Widerrufs</h2>
      <p style={pStyle}>
        Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen,
        die wir von Ihnen erhalten haben, einschließlich der Lieferkosten
        — mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben,
        dass Sie eine andere Art der Lieferung als die von uns angebotene,
        günstigste Standardlieferung gewählt haben — unverzüglich und
        spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem
        die Mitteilung über Ihren Widerruf dieses Vertrags bei uns
        eingegangen ist.
      </p>
      <p style={pStyle}>
        Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das
        Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei
        denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart. In
        keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte
        berechnet.
      </p>
      <p style={pStyle}>
        Wir können die Rückzahlung verweigern, bis wir die Waren wieder
        zurückerhalten haben oder bis Sie den Nachweis erbracht haben,
        dass Sie die Waren zurückgesandt haben — je nachdem, welches der
        frühere Zeitpunkt ist.
      </p>
      <p style={pStyle}>
        Sie haben die Waren unverzüglich und in jedem Fall spätestens
        binnen vierzehn Tagen ab dem Tag, an dem Sie uns über den Widerruf
        dieses Vertrags unterrichten, an uns zurückzusenden oder zu
        übergeben. Die Frist ist gewahrt, wenn Sie die Waren vor Ablauf
        der Frist von vierzehn Tagen absenden. Sie tragen die unmittelbaren
        Kosten der Rücksendung.
      </p>
      <p style={pStyle}>
        Sie müssen für einen etwaigen Wertverlust der Waren nur aufkommen,
        wenn dieser Wertverlust auf einen zur Prüfung der Beschaffenheit,
        Eigenschaften und Funktionsweise der Waren nicht notwendigen
        Umgang mit ihnen zurückzuführen ist.
      </p>

      <h2 style={h2Style}>Hinweis zu Print-on-Demand-Produkten</h2>
      <p style={pStyle}>
        Das aktuelle Sortiment der SILBE-Editionen wird in einer
        Standard-Auflage gedruckt und ist nicht nach Kundenspezifikation
        individualisiert. Das gesetzliche Widerrufsrecht gilt daher
        uneingeschränkt für sämtliche SILBE-Editionen.
      </p>
      <p style={pStyle}>
        Sollten zukünftig personalisierte oder nach Kundenspezifikation
        angefertigte Produkte angeboten werden, weisen wir an
        entsprechender Stelle gesondert auf den Ausschluss des
        Widerrufsrechts gemäß § 18 Abs. 1 Z 3 FAGG (AT) beziehungsweise
        § 312g Abs. 2 Nr. 1 BGB (DE) hin.
      </p>

      <hr style={hrStyle} />
      <p style={standStyle}>Stand: 25. Mai 2026</p>
    </article>
  );
}
