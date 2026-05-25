import type { Metadata } from 'next';
import Link from 'next/link';

// node:crypto runs in the lookup action invoked from this page; Server Actions
// inherit the page segment's runtime, so pin Node here (not Edge).
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Vertrag widerrufen',
  description:
    'Widerrufen Sie Ihren SILBE-Vertrag elektronisch gemäß § 356a BGB — Bestellnummer und E-Mail eingeben, im zweiten Schritt bestätigen.',
  alternates: { canonical: '/widerruf' },
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

const hintStyle: React.CSSProperties = {
  ...pStyle,
  fontSize: '16px',
  color: 'var(--color-taupe)',
};

export default function WiderrufPage() {
  return (
    <main style={containerStyle}>
      {/* Stufe 1 — exakter Wortlaut der Schaltfläche „Vertrag widerrufen“ gem. § 356a BGB. */}
      <h1 style={h1Style}>Vertrag widerrufen</h1>

      <p style={pStyle}>
        Sie können Ihren Vertrag innerhalb von 14 Tagen nach Erhalt der Edition ohne Angabe von
        Gründen widerrufen. Bitte geben Sie Ihre Bestellnummer und die E-Mail-Adresse Ihrer
        Bestellung an.
      </p>

      {/* TODO Tag 2: <WiderrufLookupForm action={lookupOrderAction} /> — Client-Island mit
          useActionState, Feldern „Bestellnummer“ + „E-Mail-Adresse“ und Submit „Vertrag widerrufen“. */}

      <p style={hintStyle}>
        Alternativ können Sie Ihren Widerruf auch per E-Mail an{' '}
        <Link href="mailto:hallo@silbe.at">hallo@silbe.at</Link> oder per Brief an Brainsells e.U.,
        Rueppgasse 32/12, 1020 Wien senden.
      </p>

      <p style={hintStyle}>
        Falls Sie Ihre Edition gerade erst erhalten haben und der elektronische Widerruf bereits
        abgelaufen ist, können Sie jederzeit per E-Mail oder Brief widerrufen — die gesetzliche
        Frist von 14 Tagen ab Erhalt bleibt unberührt.
      </p>
    </main>
  );
}
