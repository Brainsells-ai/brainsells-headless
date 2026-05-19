'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { subscribeAction, type SubscribeState } from '@/app/actions/subscribe';

// R8 Section 6 — Newsletter-CTA auf Cream (Homepage).
// Eigener Cream-Bg-Wrapper — Footer behält separat seine Dark-Variante
// aus Phase 5 (charcoal mit Cream-Text). Beide nutzen dieselbe
// subscribeAction (Klaviyo Double-Opt-In, DACH-GDPR).

const INITIAL: SubscribeState = { status: 'idle' };

export function NewsletterSection() {
  const [state, formAction, isPending] = useActionState<SubscribeState, FormData>(
    subscribeAction,
    INITIAL,
  );
  const [consent, setConsent] = useState(false);

  return (
    <section
      aria-label="Briefe von SILBE"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderTop: '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)',
        paddingBlock: 'clamp(64px, 9vw, 120px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-narrow)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '32px',
        }}
      >
        <header style={{ display: 'grid', gap: '20px' }}>
          <h2
            lang="de"
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(1.75rem, 3.2vw + 0.5rem, 2.5rem)',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Kein Newsletter. Ein Brief.
          </h2>
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              margin: 0,
              maxWidth: '520px',
              textWrap: 'pretty',
            }}
          >
            Eine Zeile, ihre Geschichte, eine neue Edition. Sonst nichts.
          </p>
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontStyle: 'italic',
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'var(--color-taupe)',
              margin: 0,
              maxWidth: '520px',
            }}
          >
            Weitere Editionen folgen.
          </p>
        </header>

        {state.status === 'success' ? (
          <div
            role="status"
            aria-live="polite"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              maxWidth: '520px',
            }}
          >
            Bitte bestätigen Sie die Anmeldung in Ihrem Posteingang. Wir senden
            Ihnen eine kurze E-Mail mit einem Bestätigungs-Link.
          </div>
        ) : (
          <form action={formAction} aria-describedby="r8-newsletter-consent" style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', maxWidth: '520px' }}>
              <label style={{ flex: '1 1 260px', display: 'grid', gap: '8px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '11px',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: 'var(--color-taupe)',
                  }}
                >
                  E-Mail
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="ihre@adresse.at"
                  style={{
                    background: 'transparent',
                    border: 0,
                    borderBottom: '1px solid var(--color-ink)',
                    padding: '10px 0',
                    fontFamily: 'var(--font-crimson), Georgia, serif',
                    fontSize: '17px',
                    color: 'var(--color-ink)',
                    outline: 'none',
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={!consent || isPending}
                aria-disabled={!consent || isPending}
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: 'transparent',
                  color: 'var(--color-ink)',
                  border: 0,
                  borderBottom: '1.5px solid var(--color-ink)',
                  padding: '10px 0',
                  cursor: !consent || isPending ? 'not-allowed' : 'pointer',
                  opacity: !consent || isPending ? 0.45 : 1,
                  transition: 'opacity 200ms ease-out',
                }}
              >
                {isPending ? 'Wird gesendet …' : 'Anmelden'}
              </button>
            </div>

            <label
              id="r8-newsletter-consent"
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '10px',
                alignItems: 'flex-start',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'var(--color-taupe)',
                maxWidth: '520px',
              }}
            >
              <input
                type="checkbox"
                name="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                style={{
                  marginTop: '3px',
                  accentColor: 'var(--color-ink)',
                }}
              />
              <span>
                Ich willige in den Versand des Newsletters und die damit
                verbundene Datenverarbeitung ein. Details in der{' '}
                <Link
                  href="/datenschutz"
                  style={{ color: 'var(--color-ink)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                >
                  Datenschutzerklärung
                </Link>
                . Abmeldung jederzeit möglich.
              </span>
            </label>

            {state.status === 'error' && (
              <p
                role="alert"
                aria-live="polite"
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  color: 'var(--color-burgundy)',
                  margin: 0,
                }}
              >
                {state.message}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
