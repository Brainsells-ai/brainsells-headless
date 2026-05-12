import Link from 'next/link';
import { Wordmark } from './Wordmark';
import { NewsletterForm } from './NewsletterForm';

const LEGAL_LINKS = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/agb', label: 'AGB' },
  { href: '/datenschutz', label: 'Datenschutz' },
  { href: '/widerrufsrecht', label: 'Widerrufsrecht' },
  { href: '/widerrufsformular', label: 'Widerrufsformular' },
  { href: '/versand', label: 'Versand' },
  { href: '/cookie-einstellungen', label: 'Cookie-Einstellungen' },
] as const;

const TAGLINE = 'Wir sehen die Edition als die kleinste Form eines Verlags.';

const HEADING_STYLE = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'color-mix(in srgb, var(--color-cream) 70%, transparent)',
  marginBottom: '20px',
  marginTop: 0,
};

const LINK_STYLE = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '15px',
  color: 'var(--color-cream)',
  textDecoration: 'none',
  display: 'block',
  paddingBlock: '4px',
};

const HAIRLINE = '0.5px solid color-mix(in srgb, var(--color-cream) 18%, transparent)';

export function Footer() {
  return (
    <footer
      role="contentinfo"
      style={{
        backgroundColor: 'var(--color-charcoal)',
        color: 'var(--color-cream)',
        marginTop: '96px',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-wide)',
          margin: '0 auto',
          padding: '64px 24px 24px',
          display: 'grid',
          gap: '48px',
        }}
      >
        <div
          className="silbe-footer-columns"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 1.6fr) 1fr 1fr',
            gap: '48px',
          }}
        >
          <div style={{ display: 'grid', gap: '24px' }}>
            <Wordmark variant="cream" height={42} />
            <p
              lang="de"
              style={{
                fontFamily: 'var(--font-cormorant), Georgia, serif',
                fontStyle: 'italic',
                fontSize: 'clamp(18px, 2.2vw, 22px)',
                lineHeight: 1.5,
                color: 'var(--color-cream)',
                maxWidth: '480px',
                margin: 0,
                textWrap: 'pretty',
              }}
            >
              {TAGLINE}
            </p>
            <NewsletterForm />
          </div>

          <nav aria-label="Rechtliches">
            <h2 style={HEADING_STYLE}>Rechtliches</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} style={LINK_STYLE}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 style={HEADING_STYLE}>Kontakt</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li>
                <a href="mailto:hallo@silbe.at" style={LINK_STYLE}>
                  hallo@silbe.at
                </a>
              </li>
              <li
                style={{
                  ...LINK_STYLE,
                  color: 'color-mix(in srgb, var(--color-cream) 75%, transparent)',
                }}
              >
                Brainsells e.U., Wien
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            borderTop: HAIRLINE,
            paddingTop: '32px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.04em',
              color: 'color-mix(in srgb, var(--color-cream) 70%, transparent)',
              margin: 0,
            }}
          >
            © 2026 Brainsells e.U. · Wien
          </p>
        </div>
      </div>
    </footer>
  );
}
