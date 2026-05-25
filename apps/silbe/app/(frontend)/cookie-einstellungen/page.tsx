import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie-Einstellungen',
  description:
    'Cookie-Einwilligung jederzeit überprüfen, anpassen oder widerrufen. Cookiebot-Integration folgt in Phase 9.',
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

const stubButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
  appearance: 'none',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '15px',
  fontWeight: 500,
  letterSpacing: '0.02em',
  padding: '14px 28px',
  margin: '24px 0 32px',
  backgroundColor: 'transparent',
  color: taupe,
  border: `0.5px dashed color-mix(in srgb, var(--color-ink) 40%, transparent)`,
  cursor: 'not-allowed',
};

const stubNoteStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '15px',
  fontStyle: 'italic',
  lineHeight: 1.6,
  color: taupe,
  margin: '0 0 32px',
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

export default function CookieEinstellungenPage() {
  return (
    <article style={containerStyle}>
      <h1 style={h1Style}>Cookie-Einstellungen</h1>

      <p style={pStyle}>
        An dieser Stelle können Sie Ihre Einwilligung in die Verwendung
        von Cookies und vergleichbaren Technologien jederzeit überprüfen,
        anpassen oder widerrufen. Der Widerruf wirkt sich nur auf
        zukünftige Verarbeitungsvorgänge aus; bereits erfolgte
        Verarbeitungen bleiben rechtmäßig.
      </p>

      <button type="button" disabled aria-disabled="true" style={stubButtonStyle}>
        Cookie-Einstellungen anpassen
      </button>
      <p style={stubNoteStyle}>
        Cookiebot-Button — wird in Phase 9 angebunden.
      </p>

      <h2 style={h2Style}>Aktuelle Einwilligung</h2>
      <p style={pStyle}>
        Eine Übersicht Ihrer derzeit erteilten Einwilligungen wird nach
        dem Laden des Consent-Management-Systems an dieser Stelle
        eingeblendet. Sollten Sie keine Übersicht sehen, laden Sie die
        Seite bitte neu oder öffnen Sie das Banner über die Schaltfläche
        oberhalb.
      </p>
      <p style={pStyle}>
        Weitere Informationen zur Datenverarbeitung finden Sie in unserer{' '}
        <Link href="/datenschutz" style={linkStyle}>
          Datenschutzerklärung
        </Link>
        .
      </p>

      <hr style={hrStyle} />
      <p style={standStyle}>Stand: 25. Mai 2026</p>
    </article>
  );
}
