'use client';

import Image from 'next/image';
import { useCartStore } from '@/lib/cart-store';
import type { CartLine } from '@/lib/shopify-cart';
import { formatPrice } from './format';

type Props = { line: CartLine };

export function CartLineItem({ line }: Props) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const isLoading = useCartStore((s) => s.isLoading);

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '96px 1fr',
        gap: '16px',
        padding: '20px 24px',
        borderBottom:
          '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '1 / 1',
          backgroundColor: 'var(--color-soft-beige)',
          border:
            '0.5px solid color-mix(in srgb, var(--color-ink) 8%, transparent)',
          overflow: 'hidden',
        }}
      >
        {line.image && (
          <Image
            src={line.image.url}
            alt={line.image.altText ?? line.productTitle}
            fill
            sizes="96px"
            style={{ objectFit: 'cover' }}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontSize: '15px',
            lineHeight: 1.35,
            color: 'var(--color-ink)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {line.productTitle}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '12px',
            color: 'var(--color-taupe)',
            margin: '2px 0 0 0',
          }}
        >
          {line.variantTitle}
        </p>

        {!line.availableForSale && (
          <p
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: 'var(--color-burgundy)',
              margin: '6px 0 0 0',
            }}
          >
            Vergriffen
          </p>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: '12px',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border:
                '0.5px solid color-mix(in srgb, var(--color-ink) 24%, transparent)',
            }}
          >
            <button
              type="button"
              className="silbe-cart-button"
              onClick={() => updateQuantity(line.id, line.quantity - 1)}
              disabled={isLoading}
              aria-label="Menge verringern"
              style={qtyButtonStyle}
            >
              −
            </button>
            <span
              aria-live="polite"
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '13px',
                minWidth: '24px',
                textAlign: 'center',
                color: 'var(--color-ink)',
              }}
            >
              {line.quantity}
            </span>
            <button
              type="button"
              className="silbe-cart-button"
              onClick={() => updateQuantity(line.id, line.quantity + 1)}
              disabled={isLoading || !line.availableForSale}
              aria-label="Menge erhöhen"
              style={qtyButtonStyle}
            >
              +
            </button>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            {formatPrice(line.linePrice)}
          </p>
        </div>

        <button
          type="button"
          className="silbe-cart-button"
          onClick={() => removeItem(line.id)}
          disabled={isLoading}
          style={{
            alignSelf: 'flex-start',
            marginTop: '8px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.04em',
            color: 'var(--color-taupe)',
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Entfernen
        </button>
      </div>
    </article>
  );
}

const qtyButtonStyle: React.CSSProperties = {
  appearance: 'none',
  background: 'transparent',
  border: 'none',
  padding: '6px 10px',
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '14px',
  color: 'var(--color-ink)',
  cursor: 'pointer',
  lineHeight: 1,
};
