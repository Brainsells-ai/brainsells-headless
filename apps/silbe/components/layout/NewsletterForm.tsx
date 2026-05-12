'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { subscribeAction, type SubscribeState } from '@/app/actions/subscribe';

const INITIAL: SubscribeState = { status: 'idle' };

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState<SubscribeState, FormData>(
    subscribeAction,
    INITIAL,
  );
  const [consent, setConsent] = useState(false);

  if (state.status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          fontFamily: 'var(--font-crimson), Georgia, serif',
          fontSize: '15px',
          lineHeight: 1.6,
          color: 'var(--color-cream)',
          maxWidth: '480px',
        }}
      >
        Bitte bestätigen Sie die Anmeldung in Ihrem Posteingang. Wir senden Ihnen
        eine kurze E-Mail mit einem Bestätigungs-Link.
      </div>
    );
  }

  const submitDisabled = !consent || isPending;

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
      </div>

      <form action={formAction} aria-describedby="newsletter-consent" style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
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
              required
              autoComplete="email"
              placeholder="ihre@adresse.at"
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
            disabled={submitDisabled}
            aria-disabled={submitDisabled}
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
              cursor: submitDisabled ? 'not-allowed' : 'pointer',
              opacity: submitDisabled ? 0.55 : 1,
              transition: 'opacity 200ms ease-out',
            }}
          >
            {isPending ? 'Wird gesendet …' : 'Abonnieren'}
          </button>
        </div>

        <label
          id="newsletter-consent"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '10px',
            alignItems: 'flex-start',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '12px',
            lineHeight: 1.6,
            color: 'color-mix(in srgb, var(--color-cream) 75%, transparent)',
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
              accentColor: 'var(--color-cream)',
            }}
          />
          <span>
            Ich willige in den Versand des Newsletters und die damit verbundene
            Datenverarbeitung ein. Details in der{' '}
            <Link
              href="/datenschutz"
              style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}
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
              fontSize: '12px',
              lineHeight: 1.5,
              color: 'var(--color-staubrose)',
              margin: 0,
            }}
          >
            {state.message}
          </p>
        )}
      </form>
    </div>
  );
}
