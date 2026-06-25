import type { Metadata } from 'next';
import { NewsletterSignupTracker } from '@/components/tracking/NewsletterSignupTracker';

export const runtime = 'nodejs';

// Klaviyo redirects here after the visitor confirms their double-opt-in. noindex
// — it is a per-visitor landing page, not a content surface.
export const metadata: Metadata = {
  title: 'Anmeldung bestätigt',
  description: 'Ihre Anmeldung zu den Briefen von SILBE ist bestätigt.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/newsletter/bestaetigt' },
};

const ink = 'var(--color-ink)';

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
  margin: '0 0 32px',
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

export default function NewsletterBestaetigtPage() {
  return (
    <main style={containerStyle}>
      {/* Fires the GA4 sign_up conversion (analytics-consent-gated). */}
      <NewsletterSignupTracker />

      <h1 style={h1Style}>Ihre Anmeldung ist bestätigt</h1>

      <p style={pStyle}>
        Vielen Dank. Sie erhalten von nun an die Briefe von SILBE — in Ruhe geschrieben, in
        größeren Abständen.
      </p>

      <p style={pStyle}>
        Bis zur ersten Ausgabe können Sie in unseren Editionen lesen, welche Stimmen wir
        ausgewählt haben.
      </p>
    </main>
  );
}
