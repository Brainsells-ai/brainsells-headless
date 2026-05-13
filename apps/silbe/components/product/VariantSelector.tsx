'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AddToCartButton } from './AddToCartButton';

// PDP variant island — owns Format-button row, current-variant price, and
// AddToCartButton wiring. URL searchParams (`?variant=A3` / `?variant=A2`)
// is the canonical source of truth; no internal selection state.
//
// Wrapped in <Suspense> by the parent server component so the static parts
// of the PDP keep prerendering. Initial SSR shows the default-variant
// (first in the array) fallback; client hydration re-reads the URL and
// swaps to the requested variant if present. Single-variant editions
// (e.g. Goldrahmen) skip the button row entirely.

type VariantLike = {
  id: string;
  availableForSale: boolean;
  price: { amount: string; currencyCode: string };
  selectedOptions: { name: string; value: string }[];
};

type Props = {
  variants: VariantLike[];
};

// Shopify variant labels look like "A3 (29.7 × 42 cm)". The URL key is the
// first token ("A3") — dimensions belong inside the variant button label,
// not the URL.
function formatKeyOf(value: string): string {
  return value.split(' (')[0];
}

function findFormatOption(v: VariantLike): { key: string; label: string } | null {
  const fmt = v.selectedOptions.find((o) => o.name.toLowerCase() === 'format');
  if (!fmt) return null;
  return { key: formatKeyOf(fmt.value), label: fmt.value };
}

function formatPrice(money: { amount: string; currencyCode: string }): string {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function VariantSelector({ variants }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const decorated = variants.map((v) => ({
    variant: v,
    format: findFormatOption(v),
  }));

  // Selector renders only when every variant exposes a Format option AND
  // there is more than one to choose from. Single-variant editions and
  // edge cases (option name drift in Shopify) fall back to default-only.
  const allHaveFormat = decorated.every((d) => d.format !== null);
  const showSelector = decorated.length > 1 && allHaveFormat;

  const param = searchParams.get('variant');
  const matched = param
    ? decorated.find((d) => d.format?.key === param)
    : null;
  const active = matched ?? decorated[0];
  const selected = active.variant;

  function handleSelect(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('variant', key);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {showSelector && (
        <fieldset
          aria-label="Format"
          style={{ border: 'none', padding: 0, margin: 0, display: 'grid', gap: '10px' }}
        >
          <legend
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-taupe)',
              padding: 0,
            }}
          >
            Format
          </legend>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {decorated.map(({ variant, format }) => {
              if (!format) return null;
              const isSelected = variant.id === selected.id;
              const disabled = !variant.availableForSale;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => handleSelect(format.key)}
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={`Format ${format.label}`}
                  style={{
                    appearance: 'none',
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                    padding: '10px 18px',
                    minWidth: '64px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    backgroundColor: isSelected
                      ? 'var(--color-ink)'
                      : 'transparent',
                    color: disabled
                      ? 'var(--color-taupe)'
                      : isSelected
                        ? 'var(--color-cream)'
                        : 'var(--color-ink)',
                    border: '0.5px solid var(--color-ink)',
                    opacity: disabled ? 0.5 : 1,
                    transition:
                      'background-color 120ms ease, color 120ms ease',
                  }}
                >
                  {format.key}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          alignItems: 'baseline',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '18px',
            fontWeight: 500,
            letterSpacing: '0.01em',
            color: 'var(--color-ink)',
            margin: 0,
          }}
        >
          {formatPrice(selected.price)}
        </p>
        <AddToCartButton
          variantId={selected.id}
          availableForSale={selected.availableForSale}
        />
      </div>
    </div>
  );
}
