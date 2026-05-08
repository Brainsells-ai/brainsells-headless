// Phase-1 holding page. Phase 2 (Homepage) replaces this entirely with the
// hybrid hero, trust-bar, fünf Stimmen, featured editions, etc.
export default function Home() {
  return (
    <section
      style={{
        maxWidth: 'var(--container-prose)',
        margin: '0 auto',
        padding: '96px 24px 120px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '11px',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--color-taupe)',
          marginBottom: '24px',
        }}
      >
        Editorial Klassiker · Wien
      </p>
      <h1
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(2.5rem, 5vw + 1rem, 4.5rem)',
          lineHeight: 1.1,
          color: 'var(--color-ink)',
          textWrap: 'balance',
          margin: 0,
        }}
      >
        SILBE
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-crimson), Georgia, serif',
          fontSize: '17px',
          lineHeight: 1.6,
          color: 'var(--color-ink)',
          maxWidth: '420px',
          margin: '32px auto 0',
        }}
      >
        Worte deutschsprachiger Klassiker als Kunstdrucke. Diese Seite ist in
        Vorbereitung.
      </p>
    </section>
  );
}
