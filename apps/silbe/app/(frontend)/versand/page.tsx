import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Versand',
  description:
    'Versand- und Lieferinformationen für SILBE-Editionen. Print-on-Demand in der EU, 3 bis 5 Werktage nach DE und AT.',
};

const ink = 'var(--color-ink)';
const taupe = 'var(--color-taupe)';

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

export default function VersandPage() {
  return (
    <article style={containerStyle}>
      <h1 style={h1Style}>Versand und Lieferung</h1>

      <h2 style={h2Style}>Druck on demand in der EU</h2>
      <p style={pStyle}>
        Sämtliche SILBE-Editionen werden im Print-on-Demand-Verfahren
        innerhalb der Europäischen Union gedruckt. Eine Vorratshaltung
        findet nicht statt — jedes Stück entsteht erst nach Ihrer
        Bestellung.
      </p>

      <h2 style={h2Style}>Material und Qualität</h2>
      <p style={pStyle}>
        Unsere Poster werden auf 200g/m² Premium-Papier matt und
        unbeschichtet gedruckt. Das Papier ist FSC-zertifiziert oder
        vergleichbar zertifiziert, langlebig und säurefrei.
      </p>
      <p style={pStyle}>
        Unsere Postkarten werden auf 300g/m² Premium-Karton gedruckt.
      </p>
      <p style={pStyle}>
        Unsere Tote Bags sind aus zertifizierter Baumwolle gefertigt.
      </p>

      <h2 style={h2Style}>Lieferzeiten</h2>
      <p style={pStyle}>
        Die Lieferzeit setzt sich zusammen aus Produktionszeit und
        Versandzeit. Nach Bestellung beginnt die Produktion in der Regel
        am nächsten Werktag.
      </p>
      <p style={pStyle}>
        Standardlieferzeit Deutschland und Österreich: in der Regel{' '}
        <strong>3 bis 5 Werktage</strong> nach Bestelleingang.
      </p>

      <h2 style={h2Style}>Versandkosten</h2>
      <ul style={ulStyle}>
        <li>
          Deutschland und Österreich:{' '}
          <strong>kostenfrei ab einem Bestellwert von 39 Euro</strong>
        </li>
        <li>
          Unterhalb dieser Schwelle: pauschal nach Lieferland, Anzeige im
          Checkout
        </li>
      </ul>

      <h2 style={h2Style}>Versandpartner und Sendungsverfolgung</h2>
      <p style={pStyle}>
        Je nach Lieferadresse und Druckstandort versenden wir mit DPD, DHL
        oder der Österreichischen Post. Sobald Ihre Sendung das Druckwerk
        verlässt, erhalten Sie eine Versandbestätigung mit einer
        Tracking-Nummer per E-Mail. Die Sendungsverfolgung ist im Standard
        enthalten.
      </p>

      <h2 style={h2Style}>Lieferländer</h2>
      <p style={pStyle}>
        Wir liefern derzeit nach Deutschland und Österreich. Eine
        Erweiterung der Lieferländer ist für Sommer 2026 vorgesehen.
      </p>

      <h2 style={h2Style}>Nachhaltigkeit</h2>
      <p style={pStyle}>
        Die CO₂-Emissionen aus Druck und Versand werden über den Gelato
        Climate Fund kompensiert. Die Verpackung ist plastikneutral. Eine
        lokale Produktion in der Nähe des Lieferziels reduziert
        Transportwege und Emissionen.
      </p>

      <h2 style={h2Style}>Verpackung und Schutz</h2>
      <p style={pStyle}>
        Poster werden in stabilen Versandrollen mit Schutzkappen
        ausgeliefert. Postkarten und Tote Bags versenden wir in passenden
        Kartonagen aus Recyclingmaterial.
      </p>

      <hr style={hrStyle} />
      <p style={standStyle}>Stand: 25. Mai 2026</p>
    </article>
  );
}
