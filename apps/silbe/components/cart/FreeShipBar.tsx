'use client';

import { useCartStore } from '@/lib/cart-store';

// €39 free-ship threshold applies to DE/AT zone (Phase-4 scope).
// CH-€69 with geo-detection is deferred to Phase-5.
const THRESHOLD = 39.0;

export function FreeShipBar() {
  const subtotal = useCartStore((s) => s.cart?.subtotal);
  if (!subtotal) return null;

  const amount = Number(subtotal.amount);
  if (!Number.isFinite(amount)) return null;

  const reached = amount >= THRESHOLD;
  const remaining = Math.max(0, THRESHOLD - amount);
  const progress = Math.min(100, (amount / THRESHOLD) * 100);
  const fmt = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: subtotal.currencyCode,
    minimumFractionDigits: 2,
  });

  return (
    <div
      style={{
        padding: '14px 24px',
        borderTop:
          '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '12px',
          letterSpacing: '0.02em',
          color: 'var(--color-ink)',
          margin: 0,
          marginBottom: '8px',
        }}
      >
        {reached
          ? 'Kostenloser Versand erreicht.'
          : `Nur noch ${fmt.format(remaining)} bis zum kostenlosen Versand.`}
      </p>
      <div
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Fortschritt bis zum kostenlosen Versand"
        style={{
          height: '2px',
          backgroundColor:
            'color-mix(in srgb, var(--color-ink) 8%, transparent)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: reached
              ? 'var(--color-sage)'
              : 'var(--color-taupe)',
            transition: 'width 320ms cubic-bezier(0,0,0.2,1)',
          }}
        />
      </div>
    </div>
  );
}
