import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CapsLabel } from '@/components/primitives/CapsLabel';

const HAIRLINE_DIVIDER = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';

// Triptych positions 1 + 2 are flagged for re-generation in
// docs/asset-mapping.md §4 (AI hands + pseudo-text). Until those land we run
// the spec's fallback: position 3 (olive sprig) prominently, no triptych.
export function WerkstattTeaser() {
  return (
    <section
      aria-label="Editorial-Atelier in Wien"
      style={{
        backgroundColor: 'var(--color-soft-beige)',
        borderTop: HAIRLINE_DIVIDER,
        paddingBlock: 'clamp(64px, 9vw, 120px)',
      }}
    >
      <div
        className="silbe-werkstatt-grid"
        style={{
          maxWidth: 'var(--container-default)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: 'clamp(32px, 5vw, 64px)',
          alignItems: 'center',
        }}
      >
        <figure
          style={{
            position: 'relative',
            margin: 0,
            aspectRatio: '7 / 10',
            overflow: 'hidden',
          }}
        >
          <Image
            src="/werkstatt/triptych-3-olive-sprig.jpg"
            alt="Olivenzweig in einer Vase auf einem Holztisch — Werkstatt-Notiz"
            fill
            sizes="(min-width: 768px) 45vw, 100vw"
            style={{ objectFit: 'cover' }}
          />
        </figure>

        <div style={{ display: 'grid', gap: '24px', maxWidth: '480px' }}>
          <CapsLabel>Werkstatt</CapsLabel>
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
            Editorial-Atelier in Wien.
          </h2>
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.65,
              color: 'var(--color-ink)',
              margin: 0,
              textWrap: 'pretty',
            }}
          >
            Wir lesen jedes Zitat zur Quelle. Wir kuratieren jede Edition. Wir
            sind kein Druckatelier — wir sind ein Editorial-Atelier.
          </p>
          <div style={{ marginTop: '8px' }}>
            <Button href="/werkstatt" variant="secondary">
              In die Werkstatt →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
