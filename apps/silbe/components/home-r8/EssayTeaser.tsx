import Link from 'next/link';

// R8 Section 4 — „Woher die Zeile kommt“.
// Anriss eines Rilke-Editorial-Essays, Cormorant H2 + Crimson body.
// Platzhalter-Wortlaut aus content-brief — Merlin's Refactor-Pass folgt in
// einem späteren PR (REFACTOR-HINWEIS im Brief, dritter Satz Brücke-zum-Heute
// fehlt absichtlich, kommt aus dem Editorial-Essay sobald geschrieben).

export function EssayTeaser() {
  return (
    <section
      aria-label="Woher die Zeile kommt"
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
          gap: '32px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(1.75rem, 3.2vw + 0.5rem, 2.5rem)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            color: 'var(--color-ink)',
            margin: 0,
          }}
        >
          Woher die Zeile kommt
        </h2>

        <p
          lang="de"
          style={{
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontSize: 'clamp(18px, 1.2vw + 0.5rem, 20px)',
            lineHeight: 1.7,
            color: 'var(--color-ink)',
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          Im Sommer 1903 schreibt Rilke aus Worpswede an einen jungen Dichter,
          der ihn um Urteil gebeten hat. Statt zu urteilen, antwortet er mit
          einer Aufforderung zur Geduld — gegen alles Ungelöste, gegen die
          eigenen offenen Fragen.
        </p>

        <Link
          href="/editionen/silbe-rilke-habegeduld"
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
          }}
        >
          Mehr lesen →
        </Link>
      </div>
    </section>
  );
}
