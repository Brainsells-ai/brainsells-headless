import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie-Einstellungen',
  description:
    'Übersicht der Cookie- und Speicherpraxis auf silbe.at — derzeit ausschließlich technisch notwendige Mechanismen.',
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

const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '19px',
  lineHeight: 1.7,
  color: ink,
  margin: '0 0 16px',
  textWrap: 'pretty',
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
        Derzeit sind auf silbe.at keine optionalen Cookies und keine
        Tracking-Mechanismen im Einsatz, für die eine Einwilligung
        erforderlich wäre. Es gibt deshalb an dieser Stelle aktuell nichts
        einzustellen.
      </p>

      <p style={pStyle}>
        Was wir technisch tatsächlich speichern, beschränkt sich auf einen
        Eintrag im lokalen Browser-Speicher zur Erhaltung Ihres Warenkorbs.
        Details dazu sowie eine Beschreibung der Cookies, die Shopify auf
        der Checkout-Seite setzt, finden Sie in unserer{' '}
        <Link href="/datenschutz" style={linkStyle}>
          Datenschutzerklärung
        </Link>{' '}
        im Abschnitt „Cookies und vergleichbare Technologien“.
      </p>

      <hr style={hrStyle} />
      <p style={standStyle}>Stand: 25. Mai 2026</p>
    </article>
  );
}
