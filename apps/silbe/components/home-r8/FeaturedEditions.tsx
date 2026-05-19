import Image from 'next/image';
import Link from 'next/link';
import {
  HOMEPAGE_FEATURED,
  HOMEPAGE_FEATURED_HANDLES,
  type FeaturedHandle,
} from '@/lib/featured-homepage';
import {
  getHomepageFeaturedEditions,
  type SummaryProduct,
} from '@/lib/shopify-queries';

// Preisformat: „€ 32“ (Euro voran, NBSP zwischen Symbol und Zahl).
// Ganzzahlig wenn keine Cents — sonst „€ 32,50“.
function formatPrice(money: SummaryProduct['priceRange']['min']): string {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  const symbol = money.currencyCode === 'EUR' ? '€' : money.currencyCode;
  const NBSP = ' ';
  if (Number.isInteger(amount)) {
    return `${symbol}${NBSP}${amount}`;
  }
  return `${symbol}${NBSP}${amount.toFixed(2).replace('.', ',')}`;
}

const HAIRLINE_DIVIDER = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';
const HAIRLINE_CARD = '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)';

export async function FeaturedEditions() {
  const products = await getHomepageFeaturedEditions(HOMEPAGE_FEATURED_HANDLES);
  const imageByHandle = new Map<string, (typeof HOMEPAGE_FEATURED)[number]>(
    HOMEPAGE_FEATURED.map((e) => [e.handle, e]),
  );

  if (products.length === 0) {
    return (
      <section
        aria-label="Editionen — in Vorbereitung"
        style={{
          backgroundColor: 'var(--color-cream)',
          borderTop: HAIRLINE_DIVIDER,
          paddingBlock: 'clamp(48px, 6vw, 96px)',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--container-default)',
            margin: '0 auto',
            padding: '0 24px',
            display: 'grid',
            gap: '20px',
            justifyItems: 'start',
          }}
        >
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              margin: 0,
              maxWidth: '560px',
            }}
          >
            Die ersten Editionen sind in Vorbereitung.
          </p>
          <Link
            href="/editionen"
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: 'var(--color-ink)',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
          >
            Editionen ansehen →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Ausgewählte Editionen"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderTop: HAIRLINE_DIVIDER,
        paddingBlock: 'clamp(64px, 9vw, 120px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-default)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '56px',
        }}
      >
        <header style={{ display: 'grid', gap: '12px', maxWidth: '720px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontWeight: 400,
              fontSize: 'clamp(1.75rem, 3.2vw + 0.5rem, 2.5rem)',
              lineHeight: 1.2,
              letterSpacing: '-0.01em',
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Editionen
          </h2>
        </header>

        <ul
          className="silbe-r8-featured-grid"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {products.map((product) => {
            const mapping = imageByHandle.get(product.handle as FeaturedHandle);
            const image = mapping?.image;
            const alt = mapping?.alt ?? product.title;
            return (
              <li key={product.id} style={{ margin: 0 }}>
                <Link
                  href={`/editionen/${product.handle}`}
                  style={{
                    display: 'grid',
                    gap: '20px',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <div
                    style={{
                      aspectRatio: '3 / 4',
                      position: 'relative',
                      border: HAIRLINE_CARD,
                      backgroundColor: 'var(--color-soft-beige)',
                      overflow: 'hidden',
                    }}
                  >
                    {image ? (
                      <Image
                        src={image}
                        alt={alt}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        style={{ objectFit: 'cover' }}
                      />
                    ) : null}
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    <h3
                      style={{
                        fontFamily: 'var(--font-cormorant), Georgia, serif',
                        fontWeight: 500,
                        fontSize: 'clamp(1.25rem, 1.4vw + 0.5rem, 1.5rem)',
                        lineHeight: 1.3,
                        color: 'var(--color-ink)',
                        margin: 0,
                        textWrap: 'balance',
                      }}
                    >
                      {product.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'var(--font-inter), system-ui, sans-serif',
                        fontSize: '14px',
                        letterSpacing: '0.02em',
                        color: 'var(--color-taupe)',
                        margin: 0,
                      }}
                    >
                      {formatPrice(product.priceRange.min)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Link
            href="/editionen"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '15px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              color: 'var(--color-ink)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--color-ink)',
              paddingBottom: '4px',
            }}
          >
            Editionen ansehen →
          </Link>
        </div>
      </div>
    </section>
  );
}
