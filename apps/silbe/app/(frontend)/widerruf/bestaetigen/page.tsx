import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyWiderrufToken } from '@/lib/widerruf-token';

// Token verification (node:crypto) runs in this server component and in the
// submit action invoked from it — pin Node, not Edge.
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Widerruf bestätigen',
  description: 'Bestätigen Sie Ihren Widerruf gemäß § 356a BGB.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/widerruf/bestaetigen' },
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

function pickToken(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function WiderrufBestaetigenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = pickToken((await searchParams).token);
  const payload = verifyWiderrufToken(token);

  if (!payload) {
    return (
      <main style={containerStyle}>
        <h1 style={h1Style}>Widerruf-Link ungültig</h1>
        <p style={pStyle}>
          Dieser Widerruf-Link ist ungültig oder abgelaufen. Bitte starten Sie den Widerruf erneut
          über <Link href="/widerruf">silbe.at/widerruf</Link>.
        </p>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      {/* Stufe 2 — exakter Wortlaut der Schaltfläche „Widerruf bestätigen“ gem. § 356a BGB. */}
      <h1 style={h1Style}>Widerruf bestätigen</h1>

      <p style={pStyle}>Sie widerrufen den Vertrag zur Bestellung mit der E-Mail {payload.email}.</p>

      {/* TODO Tag 2:
          - Order-Details aus frischem Admin-Lookup (lib/shopify-order-lookup) rendern:
            Bestellnummer · Bestelldatum · Editionen (Liste mit Preis) · Gesamtbetrag.
          - <WiderrufConfirmForm action={submitWiderrufAction} token={token} /> — Client-Island
            mit optionalem Grund-Feld (max 500 Zeichen) und Submit „Widerruf bestätigen“.
          - Hinweis: „Mit Klick auf ‚Widerruf bestätigen‘ wird Ihr Widerruf wirksam
            (§ 356a Abs. 5 BGB). Sie erhalten unverzüglich eine Bestätigungs-E-Mail.“ */}
    </main>
  );
}
