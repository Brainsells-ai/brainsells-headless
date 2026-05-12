'use client';

import { ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';

// Header cart trigger. Reads totalQuantity from the Zustand store and
// opens the CartDrawer on click. No /warenkorb route — checkout flow
// is drawer → Shopify-hosted checkout, no intermediate cart page.
export function CartIndicator() {
  const count = useCartStore((s) => s.cart?.totalQuantity ?? 0);
  const openDrawer = useCartStore((s) => s.openDrawer);

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={
        count > 0
          ? `Warenkorb öffnen (${count} Edition${count === 1 ? '' : 'en'})`
          : 'Warenkorb öffnen (leer)'
      }
      className="silbe-cart-button"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        appearance: 'none',
        background: 'transparent',
        border: 'none',
        padding: 0,
        color: 'var(--color-ink)',
        cursor: 'pointer',
      }}
    >
      <ShoppingBag size={20} strokeWidth={1.25} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-burgundy)',
            color: 'var(--color-cream)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '10px',
            fontWeight: 500,
            lineHeight: '16px',
            textAlign: 'center',
            letterSpacing: '0',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
