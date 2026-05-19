// R8 Section 2 — Editorial-Statement.
// Brand-Positionierungs-Block, Crimson body auf Cream.
// Copy aus silbe-homepage-content-brief.md — Merlin's Refactor-Pass folgt
// in einem späteren PR (REFACTOR-HINWEIS im Brief).

export function EditorialStatement() {
  return (
    <section
      aria-label="Editorial-Statement"
      style={{
        backgroundColor: 'var(--color-cream)',
        paddingBlock: 'clamp(64px, 9vw, 120px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-prose)',
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
            fontSize: 'clamp(20px, 1.6vw + 0.5rem, 24px)',
            lineHeight: 1.55,
            color: 'var(--color-ink)',
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          SILBE bringt literarische Zeilen aus dem deutschsprachigen Kanon in
          Editionen, die man aufhängt, verschickt, behält.
        </p>
        <p
          lang="de"
          style={{
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(18px, 1.4vw + 0.5rem, 22px)',
            lineHeight: 1.6,
            color: 'var(--color-taupe)',
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          Kein Dekor. Ein Satz, der bleibt — und die Quelle, aus der er stammt.
        </p>
      </div>
    </section>
  );
}
