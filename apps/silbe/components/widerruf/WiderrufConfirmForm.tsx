'use client';

import { useActionState } from 'react';
import { submitWiderrufAction, type WiderrufSubmitState } from '@/app/actions/widerruf-submit';

const INITIAL: WiderrufSubmitState = { status: 'idle' };

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-taupe)',
};

const helpStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '15px',
  lineHeight: 1.6,
  color: 'var(--color-taupe)',
  margin: 0,
};

export function WiderrufConfirmForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<WiderrufSubmitState, FormData>(
    submitWiderrufAction,
    INITIAL,
  );

  return (
    <form action={formAction} style={{ display: 'grid', gap: '24px', maxWidth: '560px', margin: '40px 0' }}>
      <input type="hidden" name="token" value={token} />

      <label style={{ display: 'grid', gap: '8px' }}>
        <span style={labelStyle}>Grund (optional)</span>
        <textarea
          name="reason"
          rows={3}
          maxLength={500}
          style={{
            background: 'transparent',
            border: '1px solid color-mix(in srgb, var(--color-ink) 30%, transparent)',
            borderRadius: '2px',
            padding: '12px 14px',
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontSize: '17px',
            lineHeight: 1.6,
            color: 'var(--color-ink)',
            outline: 'none',
            resize: 'vertical',
          }}
        />
        <span style={helpStyle}>
          Eine Begründung ist nicht erforderlich, hilft uns aber bei der Verbesserung unseres
          Angebots.
        </span>
      </label>

      <p style={helpStyle}>
        Mit Klick auf „Widerruf bestätigen“ wird Ihr Widerruf wirksam (§ 356a Abs. 5 BGB). Sie
        erhalten unverzüglich eine Bestätigungs-E-Mail.
      </p>

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
          background: 'var(--color-burgundy)',
          color: 'var(--color-cream)',
          border: 0,
          borderRadius: '2px',
          padding: '14px 28px',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.55 : 1,
          transition: 'opacity 200ms ease-out',
        }}
      >
        {isPending ? 'Wird übermittelt …' : 'Widerruf bestätigen'}
      </button>
    </form>
  );
}
