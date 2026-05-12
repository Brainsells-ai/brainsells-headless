// Hairline placeholder — same aesthetic as the production page (cream
// background, no spinner, no pulse animation). Phase-2 handoff §loading
// pattern.

const HAIRLINE = '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)';

export default function Loading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      style={{
        backgroundColor: 'var(--color-cream)',
        minHeight: '60vh',
        paddingBlock: 'clamp(40px, 6vw, 96px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-default)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '24px',
        }}
      >
        <div style={{ width: '12ch', height: '11px', border: HAIRLINE }} />
        <div style={{ width: '85%', height: '64px', border: HAIRLINE }} />
        <div style={{ width: '60%', height: '15px', border: HAIRLINE }} />
        <div style={{ aspectRatio: '4 / 5', maxWidth: '560px', border: HAIRLINE }} />
        <div style={{ width: '8ch', height: '18px', border: HAIRLINE }} />
      </div>
    </div>
  );
}
