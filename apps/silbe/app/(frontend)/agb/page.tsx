import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AGB',
  description:
    'Allgemeine Geschäftsbedingungen der Brainsells e.U. für Bestellungen über silbe.at.',
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

const ulStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '19px',
  lineHeight: 1.7,
  color: ink,
  margin: '0 0 16px',
  paddingLeft: '24px',
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

export default function AgbPage() {
  return (
    <article style={containerStyle}>
      <h1 style={h1Style}>Allgemeine Geschäftsbedingungen</h1>

      <h2 style={h2Style}>§ 1 Geltungsbereich</h2>
      <p style={pStyle}>
        Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für sämtliche
        Bestellungen, die Verbraucherinnen und Verbraucher sowie
        Unternehmer über den Onlineshop unter silbe.at bei der Brainsells
        e.U., Rueppgasse 32/12, 1020 Wien, Österreich (nachfolgend
        „SILBE“) abschließen. Maßgeblich ist die zum Zeitpunkt der
        Bestellung gültige Fassung. Abweichende Bedingungen erkennen wir
        nicht an, sofern wir ihnen nicht ausdrücklich schriftlich
        zugestimmt haben.
      </p>

      <h2 style={h2Style}>§ 2 Vertragsschluss und Bestellprozess</h2>
      <p style={pStyle}>
        Die Darstellung der Produkte im Onlineshop stellt kein rechtlich
        bindendes Angebot dar, sondern eine Aufforderung zur Bestellung.
        Durch das Anklicken des Bestell-Buttons geben Sie eine verbindliche
        Bestellung der im Warenkorb enthaltenen Artikel ab. Die Bestätigung
        des Eingangs Ihrer Bestellung erfolgt unmittelbar nach dem
        Absenden per E-Mail. Der Vertrag kommt mit der Versandbestätigung
        zustande.
      </p>
      <p style={pStyle}>
        Der Vertragstext wird von uns gespeichert und Ihnen per E-Mail
        zugesandt. Vertragssprache ist Deutsch.
      </p>

      <h2 style={h2Style}>§ 3 Preise und Versandkosten</h2>
      <p style={pStyle}>
        Sämtliche Preise verstehen sich als Endpreise in Euro inklusive
        der gesetzlichen österreichischen Umsatzsteuer von 20 Prozent.
        Versandkosten werden zusätzlich ausgewiesen.
      </p>
      <ul style={ulStyle}>
        <li>
          Standardversand Deutschland und Österreich: kostenfrei ab einem
          Bestellwert von 39 Euro
        </li>
        <li>
          Unterhalb dieser Schwelle: pauschal nach Lieferland, Anzeige im
          Checkout
        </li>
      </ul>

      <h2 style={h2Style}>§ 4 Zahlungsmodalitäten</h2>
      <p style={pStyle}>Folgende Zahlungsarten stehen zur Verfügung:</p>
      <ul style={ulStyle}>
        <li>Kreditkarte über Stripe</li>
        <li>Klarna (Sofortüberweisung, Rechnung, Ratenkauf)</li>
        <li>PayPal</li>
        <li>Apple Pay und Google Pay</li>
      </ul>
      <p style={pStyle}>
        Der Kaufpreis ist mit Vertragsschluss fällig. Bei Zahlung per
        Rechnung oder Ratenkauf gelten ergänzend die Bedingungen des
        jeweiligen Zahlungsdienstleisters.
      </p>

      <h2 style={h2Style}>§ 5 Lieferung und Lieferzeit</h2>
      <p style={pStyle}>
        Wir liefern nach Deutschland und Österreich. Die Standardlieferzeit
        beträgt in der Regel 3 bis 5 Werktage nach Bestelleingang. Sollte
        ein Artikel ausnahmsweise nicht verfügbar sein, informieren wir
        Sie unverzüglich per E-Mail.
      </p>

      <h2 style={h2Style}>§ 6 Eigentumsvorbehalt</h2>
      <p style={pStyle}>
        Die gelieferte Ware bleibt bis zur vollständigen Bezahlung des
        Kaufpreises unser Eigentum.
      </p>

      <h2 style={h2Style}>§ 7 Widerrufsrecht</h2>
      <p style={pStyle}>
        Verbraucherinnen und Verbrauchern steht ein gesetzliches
        Widerrufsrecht zu. Die ausführliche Widerrufsbelehrung sowie das
        Muster-Widerrufsformular finden Sie unter{' '}
        <Link href="/widerrufsrecht" style={linkStyle}>
          Widerrufsrecht
        </Link>
        .
      </p>
      <p style={pStyle}>
        <strong>Elektronische Widerrufsmöglichkeit:</strong> Sie können Ihren
        Widerruf auch elektronisch über unsere Widerrufsfunktion unter{' '}
        <Link href="/widerruf" style={linkStyle}>
          silbe.at/widerruf
        </Link>{' '}
        ausüben. Die Erklärung gilt mit Klick auf die Schaltfläche „Widerruf
        bestätigen“ als zugegangen (§ 356a Abs. 5 BGB).
      </p>

      <h2 style={h2Style}>§ 8 Mängelhaftung</h2>
      <p style={pStyle}>
        Es gilt das gesetzliche Mängelhaftungsrecht. Die
        Gewährleistungsfrist für Verbraucherinnen und Verbraucher beträgt
        24 Monate ab Erhalt der Ware. Mängel sind innerhalb angemessener
        Frist nach deren Feststellung zu rügen.
      </p>

      <h2 style={h2Style}>§ 9 Haftung</h2>
      <p style={pStyle}>
        Wir haften unbeschränkt für Schäden aus der Verletzung des Lebens,
        des Körpers oder der Gesundheit sowie für Schäden, die auf einer
        vorsätzlichen oder grob fahrlässigen Pflichtverletzung beruhen. Im
        Übrigen ist die Haftung auf den vertragstypischen, vorhersehbaren
        Schaden begrenzt. Eine weitergehende Haftung ist im Rahmen der
        gesetzlich zulässigen Grenzen ausgeschlossen.
      </p>
      <p style={pStyle}>
        Da SILBE als Einzelunternehmen (e.U.) nach österreichischem Recht
        geführt wird, haftet der Inhaber für die Verbindlichkeiten des
        Unternehmens nach den allgemeinen gesetzlichen Bestimmungen; eine
        vertragliche Haftungsbeschränkung über die gesetzlichen Grenzen
        hinaus wird nicht vereinbart.
      </p>

      <h2 style={h2Style}>§ 10 Datenschutz</h2>
      <p style={pStyle}>
        Informationen zur Verarbeitung Ihrer personenbezogenen Daten finden
        Sie in unserer{' '}
        <Link href="/datenschutz" style={linkStyle}>
          Datenschutzerklärung
        </Link>
        .
      </p>

      <h2 style={h2Style}>§ 11 Herstellerinformationen</h2>
      <p style={pStyle}>
        Der Druck der Poster und Postkarten erfolgt im
        Print-on-Demand-Verfahren durch die Gelato Estonia OÜ, Hallasolu 4,
        11317 Tallinn, Estland (LUCID-Registrierungsnummer DE2478308883224).
        Der Druck der Tote Bags erfolgt durch Printful Inc., mit Vertretung
        in der Europäischen Union über die Niederlassung in Zypern (CR
        Cyprus EU-RP).
      </p>
      <p style={pStyle}>
        Als bevollmächtigter Wirtschaftsakteur im Sinne des Art. 16 der
        Verordnung (EU) 2023/988 (GPSR) fungieren die jeweiligen
        EU-Niederlassungen der genannten Hersteller. Die CO₂-Emissionen
        der Drucke werden über den Gelato Climate Fund kompensiert.
      </p>

      <h2 style={h2Style}>§ 12 Streitbeilegung</h2>
      <p style={pStyle}>
        Wir sind weder verpflichtet noch bereit, an einem
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen.
      </p>

      <h2 style={h2Style}>§ 13 Schlussbestimmungen</h2>
      <p style={pStyle}>
        Es gilt das Recht der Republik Österreich unter Ausschluss des
        UN-Kaufrechts. Erfüllungsort ist Wien. Sollten einzelne
        Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der
        übrigen Bestimmungen unberührt.
      </p>

      <hr style={hrStyle} />
      <p style={standStyle}>Stand: 25. Mai 2026</p>
    </article>
  );
}
