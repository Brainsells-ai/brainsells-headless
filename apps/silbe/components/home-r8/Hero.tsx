import Image from 'next/image';
import Link from 'next/link';

// R8 Hero — Split-Layout (Konzept C, silbe-hero-layout.html als Referenz).
// Desktop ≥768px: 50/50 grid, Bild links, Typo rechts.
// Mobile <768px: gestapelt — Bild oben (16:9), Typo darunter.
// Single master (1024×1024 Composite). Container-aspect-ratio + object-fit: cover
// liefert beide Crops aus demselben Master, gesteuert via .silbe-r8-hero-figure.

export function Hero() {
  return (
    <section
      aria-label="Editorial-Hero — Rilke"
      className="silbe-r8-hero"
      style={{
        backgroundColor: 'var(--color-cream)',
      }}
    >
      <figure
        className="silbe-r8-hero-figure"
        style={{
          position: 'relative',
          margin: 0,
          backgroundColor: 'var(--color-soft-beige)',
          overflow: 'hidden',
        }}
      >
        <Image
          src="/images/sku-02-rilke-habegeduld.jpg"
          alt="SILBE Rilke-Edition ›Habe Geduld‹ — gerahmt in einem Wiener Schreibzimmer um 1900"
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
        />
      </figure>

      <div
        className="silbe-r8-hero-content"
        style={{
          backgroundColor: 'var(--color-cream)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: '64px',
            height: '1px',
            backgroundColor: 'var(--color-sage)',
            marginBottom: 'clamp(32px, 4vw, 44px)',
          }}
        />

        <h1
          lang="de"
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontWeight: 400,
            fontSize: 'clamp(2rem, 4.2vw + 0.5rem, 4.1rem)',
            lineHeight: 1.25,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
            margin: 0,
            marginBottom: 'clamp(40px, 4vw, 56px)',
            textWrap: 'balance',
          }}
        >
          „Habe Geduld gegen alles Ungelöste in Ihrem Herzen.“
        </h1>

        <div style={{ marginBottom: 'clamp(40px, 4vw, 56px)' }}>
          <p
            style={{
              fontFamily: 'var(--font-inter), system-ui, sans-serif',
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--color-ink)',
              margin: 0,
            }}
          >
            Rainer Maria Rilke
          </p>
          <p
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontSize: '14px',
              color: 'var(--color-taupe)',
              margin: 0,
              marginTop: '4px',
            }}
          >
            ›Briefe an einen jungen Dichter‹ · 1903
          </p>
        </div>

        <Link
          href="/editionen"
          className="silbe-r8-hero-cta"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '14px',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '15px',
            fontWeight: 500,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--color-ink)',
            textDecoration: 'none',
            borderBottom: '1.5px solid var(--color-ink)',
            paddingBottom: '6px',
            width: 'fit-content',
            transition: 'gap 250ms ease-out, opacity 250ms ease-out',
          }}
        >
          Editionen ansehen
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 10 H15 M11 6 L15 10 L11 14"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>
    </section>
  );
}
