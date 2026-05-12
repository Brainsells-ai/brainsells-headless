import Image from 'next/image';
import { CapsLabel } from '@/components/primitives/CapsLabel';
import { VOICE_FULL_NAMES } from '@/lib/constants/voices';
import type { ParsedProduct } from '@/lib/shopify-queries';
import { AddToCartButton } from './AddToCartButton';

// PDP Hero — quote-prominent editorial framing. The quote IS the
// product (vocab §1, Werteanker). product.title from Shopify is
// marketing-internal label, not Display-Titel.
//
// Layout (mobile-first stack, no desktop split per trimmed DoD):
//   Eyebrow: ›Werk‹ · Jahr (CapsLabel)
//   H1:      „Quote...“              (Cormorant Italic large)
//   Caption: Author · ›Werk‹ · Jahr  (Crimson Italic source-line)
//   Image:   Featured image          (single mockup, option a per DoD)
//   Price:   formatPrice(min)        (no „ab“ prefix — polish-list item)
//   CTA:     AddToCartButton         (Client island, Phase 4 wires cart)
//
// Featured image source: product.images[0] (Shopify default = featured).
// Multi-image gallery is MockupCarousel polish-item.

type HeroProps = {
  product: ParsedProduct;
};

function formatPrice(money: { amount: string; currencyCode: string }): string {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function Hero({ product }: HeroProps) {
  const m = product.metafields;
  const authorName =
    (product.voice && VOICE_FULL_NAMES[product.voice]) ?? m.author_full_name ?? '';
  const workTitle = m.work_title ?? '';
  const workYear = m.work_year;
  const quote = m.quote_full;
  const heroImage = product.images[0] ?? null;
  const defaultVariant = product.variants[0];

  // Source caption per vocab §4: "Author · ›Werk‹ · Jahr".
  // workTitle from metafield already includes ›...‹ guillemets per seed.
  const sourceCaptionParts = [authorName, workTitle, workYear].filter(Boolean);
  const sourceCaption = sourceCaptionParts.join(' · ');

  // Eyebrow shows work + year (works without author — narrower).
  const eyebrowParts = [workTitle, workYear].filter(Boolean);
  const eyebrow = eyebrowParts.join(' · ');

  return (
    <section
      aria-label="Edition"
      style={{
        backgroundColor: 'var(--color-cream)',
        paddingBlock: 'clamp(40px, 6vw, 96px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-default)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: 'clamp(24px, 3vw, 40px)',
        }}
      >
        {eyebrow && <CapsLabel>{eyebrow}</CapsLabel>}

        {quote && (
          <h1
            lang="de"
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 4.5vw + 0.5rem, 4rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              textWrap: 'balance',
              margin: 0,
              maxWidth: '20ch',
            }}
          >
            {quote}
          </h1>
        )}

        {sourceCaption && (
          <p
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontStyle: 'italic',
              fontSize: '15px',
              lineHeight: 1.5,
              color: 'var(--color-taupe)',
              margin: 0,
            }}
          >
            {sourceCaption}
          </p>
        )}

        {heroImage && (
          <figure
            style={{
              position: 'relative',
              margin: 0,
              aspectRatio: '4 / 5',
              maxWidth: '560px',
              overflow: 'hidden',
              border: '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)',
              backgroundColor: 'var(--color-soft-beige)',
            }}
          >
            <Image
              src={heroImage.url}
              alt={heroImage.altText ?? `${product.title} — Mockup`}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              style={{ objectFit: 'cover' }}
            />
          </figure>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '24px',
            alignItems: 'baseline',
            marginTop: '8px',
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
            {formatPrice(product.priceRange.min)}
          </p>
          <AddToCartButton
            variantId={defaultVariant?.id}
            availableForSale={product.availableForSale}
          />
        </div>

        {/* EU-Widerrufsrecht-Hinweis ab 2026-06-19 Pflicht. Vereinfachte
            Variante hier; vollständige Widerrufsbelehrung in Phase 6
            (Cookiebot + AGB-Surfaces). */}
        <p
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: 'var(--color-taupe)',
            margin: 0,
            marginTop: '-8px',
          }}
        >
          Widerrufsrecht 14 Tage · Versand {' '}
          {/* shipping_duration via SURFACE_COPY would couple Hero to manifest —
              keep it inline; full canonical strings live in MaterialSpecs. */}
          3–6 Werktage
        </p>
      </div>
    </section>
  );
}
