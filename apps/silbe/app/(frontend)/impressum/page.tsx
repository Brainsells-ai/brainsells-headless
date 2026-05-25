import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum',
  description:
    'Anbieterkennzeichnung gemäß § 5 DDG und § 25 MedienG für SILBE — Brainsells e.U., Wien.',
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

export default function ImpressumPage() {
  return (
    <article style={containerStyle}>
      <h1 style={h1Style}>Impressum</h1>

      <h2 style={h2Style}>Angaben gemäß § 5 DDG und § 25 MedienG</h2>
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
        <strong>Inhaber:</strong> Aleks Nestorović
        <br />
        <strong>E-Mail:</strong>{' '}
        <a href="mailto:hallo@silbe.at" style={{ color: ink }}>
          hallo@silbe.at
        </a>
      </p>

      <h2 style={h2Style}>Firmenbuch</h2>
      <p style={pStyle}>
        <strong>UID-Nummer:</strong> ATU83140245
        <br />
        <strong>Firmenbuchnummer:</strong> FN 678136i
        <br />
        <strong>Firmenbuchgericht:</strong> Handelsgericht Wien
      </p>

      <h2 style={h2Style}>Aufsichtsbehörde</h2>
      <p style={pStyle}>
        Magistratisches Bezirksamt für den 2. Bezirk (Wien-Leopoldstadt)
      </p>

      <h2 style={h2Style}>Berufsrechtliche Regelungen</h2>
      <p style={pStyle}>
        Handelsgewerbe gemäß Gewerbeordnung 1994 (GewO 1994), eingetragen
        bei der Bezirkshauptmannschaft Wien-Leopoldstadt. Die
        Gewerbeordnung 1994 ist abrufbar unter ris.bka.gv.at.
      </p>

      <h2 style={h2Style}>Online-Streitbeilegung</h2>
      <p style={pStyle}>
        Wir sind weder verpflichtet noch bereit, an einem
        Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
        teilzunehmen. Verbraucherinnen und Verbraucher mit Wohnsitz in
        einem anderen EU-Mitgliedstaat können sich an das Europäische
        Verbraucherzentrum Österreich (europakonsument.at) wenden.
      </p>

      <h2 style={h2Style}>Haftungsausschluss</h2>
      <p style={pStyle}>
        Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt
        erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der
        Inhalte können wir jedoch keine Gewähr übernehmen. Für Inhalte
        externer Links übernehmen ausschließlich deren Betreiber die
        Verantwortung.
      </p>

      <h2 style={h2Style}>Urheberrecht</h2>
      <p style={pStyle}>
        Sämtliche auf dieser Website veröffentlichten Texte, Layouts und
        Gestaltungen unterliegen dem Urheberrecht. Eine Verwertung
        außerhalb der gesetzlich zulässigen Fälle bedarf der vorherigen
        schriftlichen Zustimmung der Brainsells e.U.
      </p>

      <hr style={hrStyle} />
      <p style={standStyle}>Stand: 25. Mai 2026</p>
    </article>
  );
}
