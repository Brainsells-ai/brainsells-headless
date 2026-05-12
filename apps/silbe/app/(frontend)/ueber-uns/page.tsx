import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Über uns',
  description:
    'SILBE — kuratierte Editionen deutschsprachiger Klassiker aus Wien. Wir sehen die Edition als die kleinste Form eines Verlags.',
};

export default function UeberUnsPage() {
  return (
    <article
      style={{
        maxWidth: 'var(--container-narrow, 720px)',
        margin: '0 auto',
        padding: '96px 24px 128px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontStyle: 'italic',
          fontSize: 'clamp(36px, 5vw, 56px)',
          lineHeight: 1.1,
          color: 'var(--color-ink)',
          margin: '0 0 32px',
          textWrap: 'balance',
        }}
      >
        Über uns
      </h1>

      <p
        style={{
          fontFamily: 'var(--font-crimson), Georgia, serif',
          fontSize: '19px',
          lineHeight: 1.7,
          color: 'var(--color-ink)',
          margin: '0 0 24px',
          textWrap: 'pretty',
        }}
      >
        SILBE ist eine kleine Editorial-Werkstatt aus Wien. Wir wählen Worte
        deutschsprachiger Klassiker aus und übertragen sie auf Papier — als
        Edition, nicht als Plakat.
      </p>

      <p
        style={{
          fontFamily: 'var(--font-crimson), Georgia, serif',
          fontSize: '19px',
          lineHeight: 1.7,
          color: 'var(--color-ink)',
          margin: 0,
          textWrap: 'pretty',
        }}
      >
        Wir sehen die Edition als die kleinste Form eines Verlags.
      </p>
    </article>
  );
}
