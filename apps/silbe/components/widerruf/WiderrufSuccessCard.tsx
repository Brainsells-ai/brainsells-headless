// Server component — the boxed confirmation summary on /widerruf/erfolg.
// Renders the Widerruf-ID and the return address. No interactivity, so no
// 'use client'.

const cardStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '17px',
  lineHeight: 1.7,
  color: 'var(--color-ink)',
  border: '0.5px solid color-mix(in srgb, var(--color-ink) 20%, transparent)',
  borderRadius: '2px',
  padding: '24px',
  margin: '32px 0',
  display: 'grid',
  gap: '20px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-taupe)',
};

const addressStyle: React.CSSProperties = {
  fontStyle: 'normal',
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '17px',
  lineHeight: 1.7,
  color: 'var(--color-ink)',
};

export function WiderrufSuccessCard({ widerrufId }: { widerrufId: string }) {
  return (
    <div style={cardStyle}>
      {widerrufId ? (
        <div style={{ display: 'grid', gap: '6px' }}>
          <span style={labelStyle}>Widerruf-ID</span>
          <strong style={{ fontSize: '20px', letterSpacing: '0.02em' }}>{widerrufId}</strong>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: '6px' }}>
        <span style={labelStyle}>Rücksende-Adresse</span>
        <address style={addressStyle}>
          Brainsells e.U.
          <br />
          Rueppgasse 32/12
          <br />
          1020 Wien
          <br />
          Österreich
        </address>
      </div>
    </div>
  );
}
