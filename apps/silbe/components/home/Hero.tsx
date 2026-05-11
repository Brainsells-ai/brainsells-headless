import Image from 'next/image';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section
      aria-label="Editorial Klassiker — die SILBE-Auswahl"
      style={{
        backgroundColor: 'var(--color-cream)',
        paddingBlock: 'clamp(48px, 6vw, 96px)',
      }}
    >
      <div
        className="silbe-hero-grid"
        style={{
          maxWidth: 'var(--container-wide)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: 'clamp(32px, 4vw, 56px)',
          alignItems: 'center',
        }}
      >
        <div className="silbe-hero-quote" style={{ display: 'grid', gap: '24px' }}>
          <p
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-taupe)',
              margin: 0,
            }}
          >
            Editorial Klassiker · Wien
          </p>

          <h1
            lang="de"
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.75rem, 6vw + 1rem, 6rem)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              textWrap: 'balance',
              margin: 0,
            }}
          >
            „Habe Geduld gegen alles Ungelöste in Ihrem Herzen.“
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontStyle: 'italic',
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--color-taupe)',
              margin: 0,
            }}
          >
            Rainer Maria Rilke · ›Briefe an einen jungen Dichter‹ · 1903
          </p>

          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '15px',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              maxWidth: '360px',
              margin: 0,
              textWrap: 'pretty',
            }}
          >
            Worte deutschsprachiger Klassiker als Kunstdrucke auf hochweißem
            Premiumpapier, gedruckt in der EU, versendet aus Wien.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '16px',
              alignItems: 'center',
              marginTop: '8px',
            }}
          >
            <Button href="/editionen" variant="primary">
              Editionen ansehen
            </Button>
            <Button href="/bibliothek" variant="tertiary">
              Bibliothek lesen →
            </Button>
          </div>
        </div>

        <figure
          className="silbe-hero-figure"
          style={{
            position: 'relative',
            margin: 0,
            aspectRatio: '4 / 5',
            overflow: 'hidden',
          }}
        >
          <Image
            src="/mockups/rilke-geduld-hero-burgundy-scene-a.jpg"
            alt="SILBE Rilke-Edition ›Habe Geduld‹ — Goldrahmen vor burgunder Wand, Atelier Wien"
            fill
            priority
            sizes="(min-width: 768px) 56vw, 100vw"
            style={{ objectFit: 'cover' }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--color-ink) 35%, transparent) 100%)',
              pointerEvents: 'none',
            }}
          />
          <figcaption
            style={{
              position: 'absolute',
              right: '16px',
              bottom: '12px',
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '9px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'color-mix(in srgb, var(--color-cream) 50%, transparent)',
              margin: 0,
            }}
          >
            Goldrahmen-Edition · Atelier Wien
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
