'use client';

import { useEffect, useRef } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { trackBeginCheckout } from '@/lib/tracking/events';
import { captureGaIdentifiersToCart } from '@/lib/tracking/ga-identifiers';
import { CartLineItem } from './CartLineItem';
import { EmptyCart } from './EmptyCart';
import { FreeShipBar } from './FreeShipBar';
import { formatPrice } from './format';

// Single-instance drawer mounted in (frontend)/layout.tsx. Always
// present in the DOM — visibility is driven by the `isOpen` flag so
// the slide-in transition has somewhere to animate from.
//
// Master-Playbook §7: slide-in from right, NOT a modal. Backdrop
// dims the page but the drawer is structurally an aside, not a
// blocking dialog. role="dialog" + aria-modal still applied so
// screen readers treat content underneath as inert while open.

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const cart = useCartStore((s) => s.cart);
  const isLoading = useCartStore((s) => s.isLoading);
  const error = useCartStore((s) => s.error);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const clearError = useCartStore((s) => s.clearError);
  const hydrate = useCartStore((s) => s.hydrate);

  const panelRef = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  // Hydrate on first client mount: rebuild cart from Shopify if we
  // have a persisted cartId. No-op on the server.
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Body scroll lock + focus restoration tied to open state.
  useEffect(() => {
    if (!isOpen) return;
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(t);
      lastFocusRef.current?.focus();
    };
  }, [isOpen]);

  // Keyboard: Escape closes, Tab cycles within the drawer.
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeDrawer]);

  const lines = cart?.lines ?? [];
  const hasLines = lines.length > 0;

  return (
    <>
      <div
        aria-hidden
        onClick={closeDrawer}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor:
            'color-mix(in srgb, var(--color-ink) 32%, transparent)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 320ms cubic-bezier(0,0,0.2,1)',
          zIndex: 60,
        }}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="silbe-cart-drawer-title"
        aria-hidden={!isOpen}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(440px, 100vw)',
          backgroundColor: 'var(--color-cream)',
          borderLeft:
            '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 320ms cubic-bezier(0,0,0.2,1)',
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          visibility: isOpen ? 'visible' : 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            padding: '24px 24px 16px',
            borderBottom:
              '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
          }}
        >
          <h2
            id="silbe-cart-drawer-title"
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: '26px',
              lineHeight: 1,
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Warenkorb
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="silbe-cart-button"
            onClick={closeDrawer}
            aria-label="Warenkorb schließen"
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              padding: '6px 2px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '12px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-taupe)',
              cursor: 'pointer',
            }}
          >
            Schließen
          </button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {hasLines ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {lines.map((line) => (
                <li key={line.id}>
                  <CartLineItem line={line} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyCart />
          )}
        </div>

        {error && (
          <div
            role="alert"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 24px',
              backgroundColor:
                'color-mix(in srgb, var(--color-burgundy) 8%, var(--color-cream))',
              borderTop:
                '0.5px solid color-mix(in srgb, var(--color-burgundy) 32%, transparent)',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '12px',
              color: 'var(--color-burgundy)',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="silbe-cart-button"
              onClick={clearError}
              aria-label="Hinweis schließen"
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-burgundy)',
                cursor: 'pointer',
                fontSize: '12px',
                padding: '0 0 0 12px',
              }}
            >
              ×
            </button>
          </div>
        )}

        {hasLines && cart && (
          <footer
            style={{
              borderTop:
                '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
              backgroundColor: 'var(--color-cream)',
            }}
          >
            <FreeShipBar />

            <div
              style={{
                padding: '16px 24px 8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--color-taupe)',
                }}
              >
                Zwischensumme
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-cormorant), Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: '24px',
                  color: 'var(--color-ink)',
                }}
              >
                {formatPrice(cart.subtotal)}
              </span>
            </div>

            <p
              style={{
                margin: 0,
                padding: '0 24px 16px',
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '11px',
                letterSpacing: '0.04em',
                color: 'var(--color-taupe)',
              }}
            >
              Inkl. MwSt. · Versand wird im Checkout ermittelt.
            </p>

            <div style={{ padding: '0 24px 24px' }}>
              <a
                href={cart.checkoutUrl}
                aria-disabled={isLoading || undefined}
                className="silbe-cart-button"
                // begin_checkout before the hard navigation to the Shopify
                // checkout domain. dataLayer.push is synchronous; tag
                // delivery across the navigation is GTM/sendBeacon terrain
                // (Schritt 3), not a code concern here. captureGaIdentifiers
                // persists the GA client_id onto the cart (→ order
                // customAttributes) for the server-side refund event; it is
                // analytics-consent-gated and keepalive so it survives the nav.
                onClick={() => {
                  trackBeginCheckout(cart);
                  void captureGaIdentifiersToCart(cart.id);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  textDecoration: 'none',
                  padding: '16px 28px',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  backgroundColor: 'var(--color-ink)',
                  color: 'var(--color-cream)',
                  border: '0.5px solid var(--color-ink)',
                  pointerEvents: isLoading ? 'none' : 'auto',
                  opacity: isLoading ? 0.6 : 1,
                  transition: 'opacity 200ms ease',
                }}
              >
                Zur Kasse
              </a>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}
