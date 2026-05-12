import Link from 'next/link';
import { Wordmark } from './Wordmark';
import { CartIndicator } from './CartIndicator';
import { MobileDrawer } from './MobileDrawer';

const NAV_LINKS = [
  { href: '/editionen', label: 'Editionen' },
  { href: '/ueber-uns', label: 'Über uns' },
] as const;

export function Header() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--color-cream)',
        borderBottom: '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
      }}
    >
      <div
        className="silbe-header-row"
        style={{
          maxWidth: 'var(--container-wide)',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="silbe-mobile-only">
            <MobileDrawer />
          </span>
          <span className="silbe-desktop-only">
            <Wordmark variant="ink" height={32} priority />
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="silbe-mobile-only">
            <Wordmark variant="ink" height={28} priority />
          </span>
          <nav
            className="silbe-desktop-only"
            aria-label="Hauptnavigation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
            }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: 'var(--color-ink)',
                  textDecoration: 'none',
                  paddingBlock: '4px',
                }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <CartIndicator />
        </div>
      </div>
    </header>
  );
}
