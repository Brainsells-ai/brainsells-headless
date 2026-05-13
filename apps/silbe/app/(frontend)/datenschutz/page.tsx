import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Datenschutz',
  description:
    'DSGVO-konforme Datenschutzerklärung der Brainsells e.U. für silbe.at.',
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

export default function DatenschutzPage() {
  return (
    <article style={containerStyle}>
      <h1 style={h1Style}>Datenschutzerklärung</h1>

      <h2 style={h2Style}>1. Verantwortlicher</h2>
      <p style={pStyle}>
        Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO)
        und des österreichischen Datenschutzgesetzes (DSG) ist:
      </p>
      <address style={addressStyle}>
        Brainsells e.U.
        <br />
        Rueppgasse 32/12
        <br />
        1020 Wien
        <br />
        Österreich
      </address>
      <p style={pStyle}>
        <strong>E-Mail:</strong>{' '}
        <a href="mailto:hallo@silbe.at" style={{ color: ink }}>
          hallo@silbe.at
        </a>
      </p>

      <h2 style={h2Style}>2. Allgemeines zur Datenverarbeitung</h2>
      <p style={pStyle}>
        Wir verarbeiten personenbezogene Daten ausschließlich auf Grundlage
        der gesetzlichen Bestimmungen. Eine Verarbeitung erfolgt
        insbesondere zur Erfüllung des Kaufvertrags (Art. 6 Abs. 1 lit. b
        DSGVO), aufgrund Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO),
        zur Wahrung berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO)
        sowie zur Erfüllung rechtlicher Verpflichtungen (Art. 6 Abs. 1
        lit. c DSGVO).
      </p>

      <h2 style={h2Style}>3. Hosting und Shop-Plattform</h2>
      <p style={pStyle}>
        Unser Onlineshop wird auf der Infrastruktur von Shopify Inc.
        (Shopify Plus, EU-Rechenzentren) sowie Vercel Inc. betrieben. Eine
        Übermittlung in die USA erfolgt auf Grundlage der
        EU-Standardvertragsklauseln gemäß Art. 46 DSGVO sowie eines
        Auftragsverarbeitungsvertrages.
      </p>

      <h2 style={h2Style}>4. Empfänger und Drittanbieter</h2>
      <p style={pStyle}>Wir setzen folgende Dienstleister ein:</p>
      <p style={pStyle}>
        <strong>Klaviyo Inc.</strong> — Newsletter-Versand und
        E-Mail-Marketing. Klaviyo hostet auf Servern in den USA. Die
        Datenübermittlung erfolgt auf Grundlage des EU-US Data Privacy
        Framework (DPF) sowie ergänzend der EU-Standardvertragsklauseln
        gemäß Art. 46 DSGVO. Auftragsverarbeitungsvertrag abgeschlossen.
        Rechtsgrundlage: Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO.
        Speicherdauer: bis zum Widerruf der Einwilligung.
      </p>
      <p style={pStyle}>
        <strong>Cookiebot</strong> — Consent-Management. Rechtsgrundlage:
        berechtigtes Interesse gemäß Art. 6 Abs. 1 lit. f DSGVO an einer
        rechtskonformen Cookie-Einwilligungsverwaltung. Speicherdauer: 12
        Monate.
      </p>
      <p style={pStyle}>
        <strong>Stripe, Klarna, PayPal</strong> — Zahlungsabwicklung.
        Rechtsgrundlage: Vertragserfüllung gemäß Art. 6 Abs. 1 lit. b
        DSGVO. Speicherdauer: nach Maßgabe der gesetzlichen
        Aufbewahrungsfristen.
      </p>
      <p style={pStyle}>
        <strong>Gelato Estonia OÜ</strong> — Print-on-Demand-Auftrags-
        verarbeitung für Poster und Postkarten. Rechtsgrundlage:
        Vertragserfüllung gemäß Art. 6 Abs. 1 lit. b DSGVO.
        Auftragsverarbeitungsvertrag abgeschlossen.
      </p>
      <p style={pStyle}>
        <strong>Printful Inc.</strong> — Print-on-Demand-Auftrags-
        verarbeitung für Tote Bags. Rechtsgrundlage: Vertragserfüllung
        gemäß Art. 6 Abs. 1 lit. b DSGVO. Auftragsverarbeitungsvertrag
        abgeschlossen.
      </p>

      <h2 style={h2Style}>5. Cookies</h2>
      <p style={pStyle}>
        Wir setzen technisch notwendige Cookies sowie — ausschließlich nach
        Ihrer Einwilligung — Cookies zu Analyse- und Marketingzwecken ein.
        Sie können Ihre Einwilligung jederzeit unter{' '}
        <Link href="/cookie-einstellungen" style={linkStyle}>
          Cookie-Einstellungen
        </Link>{' '}
        anpassen oder widerrufen.
      </p>

      <h2 style={h2Style}>6. Speicherdauer</h2>
      <p style={pStyle}>
        Wir speichern personenbezogene Daten nur so lange, wie es für die
        jeweiligen Zwecke erforderlich ist oder gesetzliche
        Aufbewahrungsfristen es vorschreiben. Steuerlich relevante
        Unterlagen werden gemäß § 132 BAO sieben Jahre aufbewahrt.
      </p>

      <h2 style={h2Style}>7. Ihre Rechte</h2>
      <p style={pStyle}>Ihnen stehen folgende Rechte zu:</p>
      <ul style={ulStyle}>
        <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
        <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
        <li>Recht auf Löschung (Art. 17 DSGVO)</li>
        <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
        <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
        <li>
          Recht auf Widerruf einer erteilten Einwilligung mit Wirkung für
          die Zukunft
        </li>
      </ul>
      <p style={pStyle}>
        Zur Wahrnehmung Ihrer Rechte genügt eine formlose Nachricht an{' '}
        <a href="mailto:hallo@silbe.at" style={{ color: ink }}>
          hallo@silbe.at
        </a>
        .
      </p>

      <h2 style={h2Style}>8. Beschwerderecht</h2>
      <p style={pStyle}>
        Sie haben das Recht, sich bei einer Aufsichtsbehörde zu
        beschweren. In Österreich ist dies die{' '}
        <a
          href="https://www.dsb.gv.at"
          rel="noopener noreferrer"
          target="_blank"
          style={linkStyle}
        >
          Österreichische Datenschutzbehörde
        </a>
        , Barichgasse 40-42, 1030 Wien.
      </p>

      <hr style={hrStyle} />
      <p style={standStyle}>Stand: 13. Mai 2026</p>
    </article>
  );
}
