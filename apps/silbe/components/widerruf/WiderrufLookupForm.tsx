'use client';

import { useActionState } from 'react';
import { lookupOrderAction, type WiderrufLookupState } from '@/app/actions/widerruf-lookup';

const INITIAL: WiderrufLookupState = { status: 'idle' };

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-taupe)',
};

const inputStyle: React.CSSProperties = {
  background: 'transparent',
  border: 0,
  borderBottom: '1px solid color-mix(in srgb, var(--color-ink) 40%, transparent)',
  padding: '10px 0',
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '17px',
  color: 'var(--color-ink)',
  outline: 'none',
};

export function WiderrufLookupForm() {
  const [state, formAction, isPending] = useActionState<WiderrufLookupState, FormData>(
    lookupOrderAction,
    INITIAL,
  );

  return (
    <form action={formAction} style={{ display: 'grid', gap: '24px', maxWidth: '440px', margin: '40px 0' }}>
      <label style={{ display: 'grid', gap: '8px' }}>
        <span style={labelStyle}>Bestellnummer</span>
        <input
          type="text"
          name="orderNumber"
          inputMode="text"
          required
          autoComplete="off"
          placeholder="#1001"
          style={inputStyle}
        />
      </label>

      <label style={{ display: 'grid', gap: '8px' }}>
        <span style={labelStyle}>E-Mail-Adresse</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="ihre@email.at"
          style={inputStyle}
        />
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

      {/* Exakter Wortlaut gem. § 356a BGB. */}
      <button
        type="submit"
        disabled={isPending}
        aria-disabled={isPending}
        style={{
          justifySelf: 'start',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: 'var(--color-ink)',
          color: 'var(--color-cream)',
          border: 0,
          borderRadius: '2px',
          padding: '14px 28px',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.55 : 1,
          transition: 'opacity 200ms ease-out',
        }}
      >
        {isPending ? 'Wird geprüft …' : 'Vertrag widerrufen'}
      </button>
    </form>
  );
}
