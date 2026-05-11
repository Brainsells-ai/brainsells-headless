import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CapsLabel } from '@/components/primitives/CapsLabel';
import { shopifyFetch, SHOPIFY_TAGS } from '@/lib/shopify';

type Money = { amount: string; currencyCode: string };
type ImageNode = { url: string; altText: string | null; width: number; height: number };
type ProductNode = {
  id: string;
  handle: string;
  title: string;
  priceRange: { minVariantPrice: Money };
  featuredImage: ImageNode | null;
};

type FeaturedCollectionResponse = {
  collection: { products: { nodes: ProductNode[] } } | null;
};

type FallbackResponse = { products: { nodes: ProductNode[] } };

const FEATURED_QUERY = /* GraphQL */ `
  query FeaturedEditions {
    collection(handle: "featured") {
      products(first: 4) {
        nodes {
          id
          handle
          title
          priceRange { minVariantPrice { amount currencyCode } }
          featuredImage { url altText width height }
        }
      }
    }
  }
`;

const FALLBACK_QUERY = /* GraphQL */ `
  query BestSellingEditions {
    products(first: 4, sortKey: BEST_SELLING) {
      nodes {
        id
        handle
        title
        priceRange { minVariantPrice { amount currencyCode } }
        featuredImage { url altText width height }
      }
    }
  }
`;

async function fetchFeatured(): Promise<ProductNode[]> {
  try {
    const data = await shopifyFetch<FeaturedCollectionResponse>(FEATURED_QUERY, undefined, {
      tags: [SHOPIFY_TAGS.collection('featured'), SHOPIFY_TAGS.products],
    });
    const nodes = data.collection?.products.nodes ?? [];
    if (nodes.length > 0) return nodes;
  } catch (err) {
    console.error('[FeaturedEditions] featured collection fetch failed:', err);
  }
  try {
    const data = await shopifyFetch<FallbackResponse>(FALLBACK_QUERY, undefined, {
      tags: [SHOPIFY_TAGS.products],
    });
    return data.products.nodes;
  } catch (err) {
    console.error('[FeaturedEditions] BEST_SELLING fallback failed:', err);
    return [];
  }
}

function formatPrice(money: Money): string {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

const HAIRLINE_DIVIDER = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';
const HAIRLINE_CARD = '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)';

export async function FeaturedEditions() {
  const products = await fetchFeatured();

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
          <CapsLabel>Editionen</CapsLabel>
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
            Die ersten Editionen sind in Vorbereitung. In Kürze finden Sie hier
            die Auswahl der fünf Stimmen.
          </p>
          <Button href="/editionen" variant="tertiary">
            Alle Editionen ansehen →
          </Button>
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
          maxWidth: 'var(--container-wide)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '40px',
        }}
      >
        <header style={{ display: 'grid', gap: '16px', maxWidth: '720px' }}>
          <CapsLabel>Editionen</CapsLabel>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 3.6vw + 0.5rem, 2.75rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              textWrap: 'balance',
              margin: 0,
            }}
          >
            Aktuelle Auswahl.
          </h2>
        </header>

        <ul
          className="silbe-featured-grid"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '32px 24px',
          }}
        >
          {products.map((product) => (
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
                      sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : null}
                </div>
                <div style={{ display: 'grid', gap: '6px' }}>
                  <h3
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
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '13px',
                      letterSpacing: '0.02em',
                      color: 'var(--color-taupe)',
                      margin: 0,
                    }}
                  >
                    {formatPrice(product.priceRange.minVariantPrice)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <Button href="/editionen" variant="tertiary">
            Alle Editionen ansehen →
          </Button>
        </div>
      </div>
    </section>
  );
}
