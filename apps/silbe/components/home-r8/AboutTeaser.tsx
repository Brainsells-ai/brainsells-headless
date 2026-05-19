import Link from 'next/link';

// R8 Section 5 — Über-uns-Teaser.
// Reiner Typo-Block, kein Bild. Brand-/Gründer-Anriss aus content-brief.
// Wortlaut REFACTOR-Kandidat: "zwei Menschen in Wien" vs. Namen — Merlin's
// Pass entscheidet in einem späteren PR.

export function AboutTeaser() {
  return (
    <section
      aria-label="Über SILBE"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderTop: '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)',
        paddingBlock: 'clamp(64px, 9vw, 120px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-narrow)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '28px',
        }}
      >
        <p
          lang="de"
          style={{
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontSize: 'clamp(18px, 1.4vw + 0.5rem, 22px)',
            lineHeight: 1.65,
            color: 'var(--color-ink)',
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          SILBE wird von zwei Menschen in Wien gemacht, die zu viele Bücher haben
          und finden, dass die besten Sätze nicht im Regal verschwinden sollten.
        </p>
        <p
          lang="de"
          style={{
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(17px, 1.2vw + 0.5rem, 20px)',
            lineHeight: 1.65,
            color: 'var(--color-taupe)',
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          Wir wählen die Zeilen aus, prüfen die Quellen, gestalten die Editionen.
        </p>
        <Link
          href="/ueber-uns"
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
            width: 'fit-content',
            marginTop: '8px',
          }}
        >
          Mehr über SILBE →
        </Link>
      </div>
    </section>
  );
}
