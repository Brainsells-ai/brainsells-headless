import type { Metadata } from 'next';
import { WiderrufSuccessCard } from '@/components/widerruf/WiderrufSuccessCard';

export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Widerruf übermittelt',
  description: 'Ihr Widerruf wurde erfolgreich übermittelt.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/widerruf/erfolg' },
};

const ink = 'var(--color-ink)';

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

      <p style={pStyle}>
        Sie erhalten in Kürze eine Bestätigungs-E-Mail mit allen Details zur Rücksendung. Bitte
        senden Sie die Edition innerhalb von 14 Tagen zurück an die unten genannte Adresse.
      </p>

      <WiderrufSuccessCard widerrufId={widerrufId} />
    </main>
  );
}
