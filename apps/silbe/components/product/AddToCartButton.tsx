'use client';

import { useCartStore } from '@/lib/cart-store';

// PDP client island. Calls cart-store.addItem which creates or extends
// the Shopify cart, then auto-opens the drawer on success. Disabled
// state preserves the „Vergriffen“ vocabulary for unavailable variants.

type AddToCartButtonProps = {
  variantId: string | undefined;
  availableForSale: boolean;
};

export function AddToCartButton({ variantId, availableForSale }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const isLoading = useCartStore((s) => s.isLoading);

  const disabled = !variantId || !availableForSale;
  const busy = isLoading && !disabled;
  const label = disabled ? 'Vergriffen' : busy ? 'Wird hinzugefügt …' : 'In den Warenkorb';

  function onClick() {
    if (!variantId) return;
    void addItem(variantId);
  }

  return (
    <button
      type="button"
      className="silbe-cart-button"
      disabled={disabled || busy}
      aria-label={
        disabled
          ? 'Diese Edition ist derzeit vergriffen'
          : busy
            ? 'Edition wird in den Warenkorb gelegt'
            : 'In den Warenkorb legen'
      }
      aria-busy={busy || undefined}
      onClick={onClick}
      style={{
        appearance: 'none',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        padding: '14px 28px',
        backgroundColor: disabled ? 'transparent' : 'var(--color-ink)',
        color: disabled ? 'var(--color-taupe)' : 'var(--color-cream)',
        border: disabled
          ? '0.5px solid color-mix(in srgb, var(--color-taupe) 60%, transparent)'
          : '0.5px solid var(--color-ink)',
        cursor: disabled || busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.7 : 1,
        transition: 'background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease',
        textAlign: 'center',
      }}
    >
      {label}
    </button>
  );
}
