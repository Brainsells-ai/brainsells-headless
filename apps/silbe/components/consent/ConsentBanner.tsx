'use client';

// Fixed bottom panel — Cream background, Cormorant heading, Crimson body. Two
// equal-weight actions (Accept / Reject identisch gestylt) per DSGVO/TTDSG
// guidance that the refusal button must not be visually subordinate. A small
// tertiary text-link toggles the inline Einstellungen panel with three
// category checkboxes (analytics / marketing / preferences). sale_of_data is
// supported in the API payload but kept out of the visible UI — DACH legal
// landscape typically does not require this opt-in surface.
//
// Mounted in (frontend)/layout.tsx behind <ConsentProvider>. Renders null
// until ConsentProvider opens the banner (visitor has not responded AND
// required env values present).
//
// Z-index 1100 to sit above CartDrawer overlay (1000). The aside still
// allows interaction with the page underneath — focus stays where the user
// left it; the banner is a non-blocking nudge, not a modal.

import { useState } from 'react';
import Link from 'next/link';
import { useConsent } from '@/lib/consent/ConsentProvider';

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 'clamp(12px, 2vw, 24px)',
  left: 'clamp(12px, 2vw, 24px)',
  right: 'clamp(12px, 2vw, 24px)',
  margin: '0 auto',
  maxWidth: '720px',
  zIndex: 1100,
  background: 'var(--color-cream)',
  border:
    '1px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
  borderRadius: '6px',
  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
  padding: 'clamp(20px, 3vw, 28px)',
  fontFamily: 'var(--font-crimson), Georgia, serif',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 'clamp(20px, 2.6vw, 26px)',
  lineHeight: 1.2,
  color: 'var(--color-ink)',
  margin: '0 0 12px',
};

const bodyStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: 1.55,
  color: 'var(--color-ink)',
  margin: '0 0 20px',
};

const linkStyle: React.CSSProperties = {
  color: 'var(--color-burgundy)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
};

const buttonRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
  marginBottom: '4px',
};

// Both Accept and Reject share this style verbatim — same size, same weight,
// same color contrast — to satisfy the "equally prominent" requirement.
const equalButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '15px',
  fontWeight: 500,
  letterSpacing: '0.02em',
  padding: '12px 22px',
  border: '1px solid var(--color-ink)',
  borderRadius: '4px',
  background: 'transparent',
  color: 'var(--color-ink)',
  cursor: 'pointer',
};

const tertiaryButtonStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 400,
  letterSpacing: '0.02em',
  padding: '12px 4px',
  border: 'none',
  background: 'transparent',
  color: 'var(--color-taupe)',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  cursor: 'pointer',
};

const settingsStyle: React.CSSProperties = {
  marginTop: '14px',
  paddingTop: '14px',
  borderTop:
    '1px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
  display: 'grid',
  gap: '10px',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px 1fr',
  gap: '8px',
  alignItems: 'flex-start',
  fontSize: '14px',
  lineHeight: 1.5,
  color: 'var(--color-ink)',
};

const saveRowStyle: React.CSSProperties = {
  marginTop: '6px',
};

export function ConsentBanner() {
  const { isBannerOpen, acceptAll, rejectAll, acceptSelection } = useConsent();
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [preferences, setPreferences] = useState(false);

  if (!isBannerOpen) return null;

  return (
    <aside
      role="dialog"
      aria-labelledby="consent-banner-heading"
      aria-describedby="consent-banner-body"
      data-testid="consent-banner"
      style={containerStyle}
    >
      <h2 id="consent-banner-heading" style={headingStyle}>
        Cookies und Tracking auf silbe.at
      </h2>
      <p id="consent-banner-body" style={bodyStyle}>
        Wir bitten Sie um Ihre Einwilligung in optionale Cookies und
        vergleichbare Technologien für Analyse- und Marketingzwecke.
        Technisch notwendige Mechanismen verwenden wir unabhängig davon.
        Details in unserer{' '}
        <Link href="/datenschutz" style={linkStyle}>
          Datenschutzerklärung
        </Link>
        .
      </p>

      <div style={buttonRowStyle}>
        <button
          type="button"
          onClick={acceptAll}
          style={equalButtonStyle}
          data-testid="consent-accept-all"
        >
          Alle akzeptieren
        </button>
        <button
          type="button"
          onClick={rejectAll}
          style={equalButtonStyle}
          data-testid="consent-reject-all"
        >
          Ablehnen
        </button>
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          style={tertiaryButtonStyle}
          aria-expanded={showSettings}
          data-testid="consent-settings-toggle"
        >
          Einstellungen
        </button>
      </div>

      {showSettings && (
        <div style={settingsStyle}>
          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
            />
            <span>
              <strong>Analyse</strong> — Reichweite und Nutzung der
              Website messen.
            </span>
          </label>
          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span>
              <strong>Marketing</strong> — Personalisierte Werbeansprache,
              auch auf Drittseiten.
            </span>
          </label>
          <label style={checkboxRowStyle}>
            <input
              type="checkbox"
              checked={preferences}
              onChange={(e) => setPreferences(e.target.checked)}
            />
            <span>
              <strong>Einstellungen</strong> — Persönliche Vorlieben über
              Sitzungen hinweg speichern.
            </span>
          </label>
          <div style={saveRowStyle}>
            <button
              type="button"
              onClick={() =>
                acceptSelection({ analytics, marketing, preferences })
              }
              style={equalButtonStyle}
              data-testid="consent-save-selection"
            >
              Auswahl speichern
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
