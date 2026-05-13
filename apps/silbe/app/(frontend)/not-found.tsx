import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Seite nicht gefunden',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <article
      style={{
        maxWidth: 'var(--container-narrow, 720px)',
        margin: '0 auto',
        padding: '144px 24px 160px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(36px, 5vw, 56px)',
          lineHeight: 1.15,
          color: 'var(--color-ink)',
          margin: '0 0 32px',
          textWrap: 'balance',
        }}
      >
        404 — eine Edition, die wir nicht drucken.
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-crimson), Georgia, serif',
          fontSize: '19px',
          lineHeight: 1.7,
          color: 'var(--color-ink)',
          margin: '0 0 48px',
          textWrap: 'pretty',
        }}
      >
        Diese Seite existiert nicht. Schauen Sie sich um, was tatsächlich
        erschienen ist.
      </p>

      <Link
        href="/editionen"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '15px',
          fontWeight: 500,
          color: 'var(--color-burgundy)',
          textDecoration: 'none',
          borderBottom: '1px solid var(--color-burgundy)',
          paddingBottom: '2px',
        }}
      >
        <span aria-hidden="true">→</span> Zu den Editionen
      </Link>
    </article>
  );
}
