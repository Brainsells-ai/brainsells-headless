import { CapsLabel } from '@/components/primitives/CapsLabel';
import { SURFACE_COPY } from '@/scripts/metafields-manifest';
import type { ParsedProduct } from '@/lib/shopify-queries';

// β-strategy: Multi-Variant SKUs carry format+dimensions on
// Variant.selectedOptions (e.g. "A3 (29.7 × 42 cm)"). Single-Variant
// SKUs carry them on product-level metafields. Pick the default
// variant's Format option first; fall back to metafield concat.

type MaterialSpecsProps = {
  product: ParsedProduct;
};

const DT_STYLE = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  fontWeight: 500,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-taupe)',
  margin: 0,
} as const;

const DD_STYLE = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '15px',
  lineHeight: 1.5,
  color: 'var(--color-ink)',
  margin: 0,
} as const;

const HAIRLINE_DIVIDER = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';

export function MaterialSpecs({ product }: MaterialSpecsProps) {
  const defaultVariant = product.variants[0];
  const variantFormat = defaultVariant?.selectedOptions.find((o) => o.name === 'Format')?.value;
  const formatString =
    variantFormat ??
    (product.metafields.format && product.metafields.dimensions_cm
      ? `${product.metafields.format} (${product.metafields.dimensions_cm} cm)`
      : null);

  return (
    <section
      aria-label="Material & Versand"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderTop: HAIRLINE_DIVIDER,
        borderBottom: HAIRLINE_DIVIDER,
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-default)',
          margin: '0 auto',
          padding: 'clamp(40px, 5vw, 72px) 24px',
          display: 'grid',
          gap: '24px',
        }}
      >
        <CapsLabel>Material & Versand</CapsLabel>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, max-content) 1fr',
            rowGap: '12px',
            columnGap: '32px',
            margin: 0,
          }}
        >
          {formatString && (
            <>
              <dt style={DT_STYLE}>Format</dt>
              <dd style={DD_STYLE}>{formatString}</dd>
            </>
          )}
          <dt style={DT_STYLE}>Papier</dt>
          <dd style={DD_STYLE}>{SURFACE_COPY.paper_description}</dd>
          <dt style={DT_STYLE}>Druck</dt>
          <dd style={DD_STYLE}>{SURFACE_COPY.shipping_origin}</dd>
          <dt style={DT_STYLE}>Versand</dt>
          <dd style={DD_STYLE}>{SURFACE_COPY.shipping_duration}</dd>
          <dt style={DT_STYLE}>Verpackung</dt>
          <dd style={DD_STYLE}>{SURFACE_COPY.shipping_packaging}</dd>
        </dl>
      </div>
    </section>
  );
}
