import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CapsLabel } from '@/components/primitives/CapsLabel';
import { JsonLd } from '@/components/seo/JsonLd';
import { breadcrumbSchema } from '@/components/seo/schemas';
import {
  getAllEditionsSummary,
  type SummaryProduct,
} from '@/lib/shopify-queries';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Editionen',
  description:
    'SILBE-Editionen — Worte deutschsprachiger Klassiker als Kunstdrucke auf hochweißem Premium-Papier, 200 g/m², matt, säurefrei.',
  alternates: { canonical: '/editionen' },
};

const HAIRLINE_CARD =
  '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)';

function formatPrice(money: SummaryProduct['priceRange']['min']): string {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Shopify variant labels arrive as "A3 (29.7 × 42 cm)" / "A2 (42 × 59.4 cm)".
// The listing card surfaces only the format key — dimensions belong on the PDP.
function formatHint(values: string[]): string | null {
  if (values.length === 0) return null;
  const keys = values.map((v) => v.split(' (')[0]);
  return keys.join(' · ');
}

export default async function EditionenPage() {
  const products = await getAllEditionsSummary();

  return (
    <section
      aria-label="Editionen"
      style={{
        backgroundColor: 'var(--color-cream)',
        paddingBlock: 'clamp(80px, 9vw, 144px)',
      }}
    >
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Editionen', path: '/editionen' },
        ])}
      />
      <div
        style={{
          maxWidth: 'var(--container-wide, 1440px)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '48px',
        }}
      >
        <header style={{ display: 'grid', gap: '20px', maxWidth: '640px' }}>
          <CapsLabel>Editionen</CapsLabel>
          <h1
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(36px, 5vw, 56px)',
              lineHeight: 1.1,
              color: 'var(--color-ink)',
              margin: 0,
              textWrap: 'balance',
            }}
          >
            Editionen.
          </h1>
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '19px',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              margin: 0,
              textWrap: 'pretty',
            }}
          >
            Worte deutschsprachiger Klassiker als Kunstdrucke. Hochweißes
            Premium-Papier, 200 g/m², matt, säurefrei. Versand DE/AT 3–6
            Werktage.
          </p>
        </header>

        {products.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Die Editionen sind in Vorbereitung.
          </p>
        ) : (
          <ul
            className="silbe-featured-grid"
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '40px 24px',
            }}
          >
            {products.map((product) => {
              const hint = formatHint(product.formatOptions);
              return (
                <li key={product.id} style={{ margin: 0 }}>
                  <Link
                    href={`/editionen/${product.handle}`}
                    style={{
                      display: 'grid',
                      gap: '16px',
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
                      {product.featuredImage ? (
                        <Image
                          src={product.featuredImage.url}
                          alt={product.featuredImage.altText ?? product.title}
                          fill
                          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : null}
                    </div>
                    <div style={{ display: 'grid', gap: '6px' }}>
                      <h2
                        style={{
                          fontFamily: 'var(--font-cormorant), Georgia, serif',
                          fontWeight: 600,
                          fontSize: '18px',
                          lineHeight: 1.3,
                          color: 'var(--color-ink)',
                          margin: 0,
                          textWrap: 'balance',
                        }}
                      >
                        {product.title}
                      </h2>
                      <p
                        style={{
                          fontFamily: 'var(--font-inter), system-ui, sans-serif',
                          fontSize: '13px',
                          letterSpacing: '0.02em',
                          color: 'var(--color-taupe)',
                          margin: 0,
                        }}
                      >
                        {formatPrice(product.priceRange.min)}
                        {hint ? (
                          <>
                            <span aria-hidden="true"> · </span>
                            <span>{hint}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
