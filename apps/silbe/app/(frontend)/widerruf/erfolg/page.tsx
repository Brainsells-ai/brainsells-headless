import type { Metadata } from 'next';

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Widerruf übermittelt',
  description: 'Ihr Widerruf wurde erfolgreich übermittelt.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/widerruf/erfolg' },
};

const ink = 'var(--color-ink)';
const taupe = 'var(--color-taupe)';

const containerStyle: React.CSSProperties = {
  maxWidth: 'var(--container-narrow, 720px)',
  margin: '0 auto',
  padding: 'clamp(96px, 10vw, 144px) 24px',
};

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 'clamp(36px, 5vw, 56px)',
  lineHeight: 1.1,
  color: ink,
  margin: '0 0 32px',
  textWrap: 'balance',
};

const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '19px',
  lineHeight: 1.7,
  color: ink,
  margin: '0 0 16px',
  textWrap: 'pretty',
};

const idBoxStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '17px',
  lineHeight: 1.7,
  color: ink,
  border: '0.5px solid color-mix(in srgb, var(--color-ink) 20%, transparent)',
  borderRadius: '2px',
  padding: '20px 24px',
  margin: '32px 0',
};

const addressStyle: React.CSSProperties = {
  ...pStyle,
  fontStyle: 'normal',
  fontSize: '17px',
  color: taupe,
};

function pickId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function WiderrufErfolgPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const widerrufId = pickId((await searchParams).id);

  return (
    <main style={containerStyle}>
      <h1 style={h1Style}>Ihr Widerruf wurde übermittelt</h1>

      <p style={pStyle}>Vielen Dank. Wir haben Ihren Widerruf erhalten.</p>

      {widerrufId ? (
        <div style={idBoxStyle}>
          Widerruf-ID: <strong>{widerrufId}</strong>
        </div>
      ) : null}

      <p style={pStyle}>
        Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details zur Rücksendung. Bitte
        senden Sie die Edition innerhalb von 14 Tagen zurück an:
      </p>

      <address style={addressStyle}>
        Brainsells e.U.
        <br />
        Rueppgasse 32/12
        <br />
        1020 Wien
        <br />
        Österreich
      </address>
    </main>
  );
}
