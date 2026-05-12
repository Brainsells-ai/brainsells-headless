'use client';

// Client island — the only client component on the PDP. Phase 4 wires
// the Zustand cart store + Shopify Cart API. Until then this is a visual
// stub: shows correct state (Vergriffen vs „In den Warenkorb“), click
// logs to console. No optimistic-update yet, no drawer-open trigger.

type AddToCartButtonProps = {
  variantId: string | undefined;
  availableForSale: boolean;
};

export function AddToCartButton({ variantId, availableForSale }: AddToCartButtonProps) {
  const disabled = !variantId || !availableForSale;
  const label = disabled ? 'Vergriffen' : 'In den Warenkorb';

  return (
    <button
      type="button"
      className="silbe-cart-button"
      disabled={disabled}
      aria-label={
        disabled
          ? 'Diese Edition ist derzeit vergriffen'
          : 'In den Warenkorb legen'
      }
      onClick={() => {
        // TODO Phase 4: useCart().add(variantId)
        // eslint-disable-next-line no-console
        console.log('[AddToCartButton] click — Phase 4 wires this. variantId=', variantId);
      }}
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
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
        textAlign: 'center',
      }}
    >
      {label}
    </button>
  );
}
