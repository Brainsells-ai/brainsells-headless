import Link from 'next/link';
import { Wordmark } from './Wordmark';

const COLUMNS = [
  {
    heading: 'Editionen',
    links: [
      { href: '/editionen', label: 'Alle Editionen' },
      { href: '/editionen/bundle-goldrahmen-trio', label: 'Goldrahmen-Trio' },
      { href: '/editionen/bundle-stempel-sammler', label: 'Postkarten-Sammler' },
    ],
  },
  {
    heading: 'Stimmen',
    links: [
      { href: '/stimmen/rilke', label: 'Rainer Maria Rilke' },
      { href: '/stimmen/kafka', label: 'Franz Kafka' },
      { href: '/stimmen/mann', label: 'Thomas Mann' },
      { href: '/stimmen/zweig', label: 'Stefan Zweig' },
      { href: '/stimmen/ebner-eschenbach', label: 'Marie von Ebner-Eschenbach' },
    ],
  },
  {
    heading: 'Werkstatt',
    links: [
      { href: '/werkstatt', label: 'Über uns' },
      { href: '/bibliothek', label: 'Bibliothek' },
      { href: '/kontakt', label: 'Kontakt' },
    ],
  },
  {
    heading: 'Rechtliches',
    links: [
      { href: '/impressum', label: 'Impressum' },
      { href: '/agb', label: 'AGB' },
      { href: '/datenschutz', label: 'Datenschutz' },
      { href: '/widerrufsrecht', label: 'Widerrufsrecht' },
      { href: '/widerrufsformular', label: 'Widerrufsformular' },
      { href: '/versand', label: 'Versand' },
      { href: '/cookie-einstellungen', label: 'Cookie-Einstellungen' },
    ],
  },
] as const;

const MANIFEST =
  'SILBE versammelt aus Wien kuratierte deutschsprachige Klassiker in kuratierten Editionen. Jede Sendung ist mit Sorgfalt gepackt. Wir sehen die Edition als die kleinste Form eines Verlags.';

const HEADING_STYLE = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'color-mix(in srgb, var(--color-cream) 70%, transparent)',
  marginBottom: '20px',
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '40px',
          }}
        >
          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 style={HEADING_STYLE}>{column.heading}</h2>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} style={LINK_STYLE}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div style={{ borderTop: HAIRLINE, paddingTop: '40px' }}>
          <NewsletterFormSlot />
        </div>

        <div style={{ borderTop: HAIRLINE, paddingTop: '40px' }}>
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontSize: 'clamp(18px, 2.2vw, 22px)',
              lineHeight: 1.5,
              color: 'var(--color-cream)',
              maxWidth: '720px',
              margin: 0,
              textWrap: 'pretty',
            }}
          >
            {MANIFEST}
          </p>
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
          <Wordmark variant="gold" width={140} height={42} />
          <p
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.04em',
              color: 'color-mix(in srgb, var(--color-cream) 70%, transparent)',
              margin: 0,
            }}
          >
            © 2026 SILBE · Wien · silbe.at · UID ATU83140245
          </p>
        </div>
      </div>
    </footer>
  );
}

function NewsletterFormSlot() {
  return (
    <div style={{ display: 'grid', gap: '16px', maxWidth: '560px' }}>
      <div>
        <p
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'color-mix(in srgb, var(--color-cream) 70%, transparent)',
            marginBottom: '12px',
            marginTop: 0,
          }}
        >
          Briefe von SILBE
        </p>
        <h3
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '28px',
            lineHeight: 1.2,
            color: 'var(--color-cream)',
            margin: 0,
          }}
        >
          Kein Newsletter. Ein Brief.
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontSize: '15px',
            lineHeight: 1.6,
            color: 'color-mix(in srgb, var(--color-cream) 85%, transparent)',
            marginTop: '12px',
            marginBottom: 0,
            maxWidth: '480px',
          }}
        >
          Ein Mal im Monat schicken wir einen kurzen literarischen Brief — eine
          Stimme, ein Satz, eine Notiz aus Wien.
        </p>
      </div>

      <form
        // Klaviyo wiring lands in Phase 5 — UI only for now.
        action=""
        method="post"
        aria-describedby="newsletter-disclaimer"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}
      >
        <label style={{ flex: '1 1 240px', display: 'grid', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--color-cream) 70%, transparent)',
            }}
          >
            E-Mail
          </span>
          <input
            type="email"
            name="email"
            placeholder="ihre@adresse.at"
            required
            style={{
              background: 'transparent',
              border: 0,
              borderBottom: '1px solid var(--color-cream)',
              padding: '10px 0',
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '16px',
              color: 'var(--color-cream)',
              outline: 'none',
            }}
          />
        </label>
        <button
          type="submit"
          disabled
          aria-disabled="true"
          title="Anmeldung wird in Phase 5 freigeschaltet"
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            background: 'var(--color-cream)',
            color: 'var(--color-ink)',
            border: 0,
            borderRadius: '2px',
            padding: '12px 24px',
            cursor: 'not-allowed',
            opacity: 0.7,
          }}
        >
          Anmelden
        </button>
      </form>

      <p
        id="newsletter-disclaimer"
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '11px',
          lineHeight: 1.6,
          color: 'color-mix(in srgb, var(--color-cream) 60%, transparent)',
          margin: 0,
        }}
      >
        Mit der Anmeldung stimmen Sie unserer{' '}
        <Link
          href="/datenschutz"
          style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
        >
          Datenschutzerklärung
        </Link>{' '}
        zu. Sie erhalten eine Bestätigungs-E-Mail. Abmeldung jederzeit möglich.
        Datenschutz: Klaviyo (EU-Server).
      </p>
    </div>
  );
}
