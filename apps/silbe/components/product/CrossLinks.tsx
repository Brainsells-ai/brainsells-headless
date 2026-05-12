import Image from 'next/image';
import Link from 'next/link';
import { CapsLabel } from '@/components/primitives/CapsLabel';
import { getRelatedProductsByVoice } from '@/lib/shopify-queries';
import type { ParsedProduct } from '@/lib/shopify-queries';

// β-β Related-Fallback decision (locked Phase-3 prep): same-voice peers
// only, NO cross-voice BEST_SELLING fallback. Returns null on empty
// peer list — no empty container, no "Keine Einträge"-Placeholder.
// Voices with single editions (Kafka, Ebner-Eschenbach) will naturally
// have empty CrossLinks until Phase 5–6 adds peers.

type CrossLinksProps = {
  product: ParsedProduct;
};

const HAIRLINE_DIVIDER = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';
const HAIRLINE_CARD = '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)';

function formatPrice(money: { amount: string; currencyCode: string }): string {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

export async function CrossLinks({ product }: CrossLinksProps) {
  if (!product.voice) return null;
  const peers = await getRelatedProductsByVoice(product.handle, product.voice, 2);
  if (peers.length === 0) return null;

  return (
    <section
      aria-label="Verwandte Editionen"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderTop: HAIRLINE_DIVIDER,
        paddingBlock: 'clamp(56px, 7vw, 96px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-wide)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '32px',
        }}
      >
        <CapsLabel>Verwandte Editionen</CapsLabel>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '32px 24px',
          }}
        >
          {peers.map((peer) => {
            const image = peer.images[0];
            return (
              <li key={peer.id} style={{ margin: 0 }}>
                <Link
                  href={`/editionen/${peer.handle}`}
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
                    {image && (
                      <Image
                        src={image.url}
                        alt={image.altText ?? peer.title}
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        style={{ objectFit: 'cover' }}
                      />
                    )}
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
                      {peer.title}
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
                      {formatPrice(peer.priceRange.min)}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
