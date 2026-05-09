import { getPayload } from '@/lib/getPayload';

const FALLBACK_TITLE = 'Warum fünf Stimmen — und nicht fünfzig.';
const FALLBACK_BODY = `Wir lesen jedes Zitat zur Quelle. Wir kuratieren jede Edition mit Sorgfalt. Wir entscheiden uns für Tiefe statt Breite — fünf Autor:innen aus dem deutschsprachigen Kanon, deren Worte länger Bestand haben als jede Mode.

Jede Edition wird in Wien kuratiert. Jede Quelle wird primärquellenverifiziert. Jede Sendung wird mit Sorgfalt gepackt.

Wir sehen die Edition als die kleinste Form eines Verlags.`;
const SIGNATURE = '— Aleks & Merlin, Wien';

type PageDoc = { title?: string; body?: string | null };

async function fetchLetter(): Promise<{ title: string; body: string }> {
  try {
    const payload = await getPayload();
    const result = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'editorial-letter-homepage' } },
      limit: 1,
      depth: 0,
    });
    const doc = result.docs?.[0] as PageDoc | undefined;
    if (typeof doc?.body === 'string' && doc.body.trim().length > 0) {
      return {
        title: doc.title ?? FALLBACK_TITLE,
        body: doc.body,
      };
    }
  } catch (err) {
    console.error('[EditorialLetter] payload fetch failed:', err);
  }
  return { title: FALLBACK_TITLE, body: FALLBACK_BODY };
}

export async function EditorialLetter() {
  const { title, body } = await fetchLetter();
  const paragraphs = body
    .split(/(?:\r?\n)\s*(?:\r?\n)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <section
      aria-label="Editorial-Brief"
      style={{
        backgroundColor: 'var(--color-soft-beige)',
        paddingBlock: 'clamp(72px, 10vw, 128px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-prose)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '32px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-taupe)',
            margin: 0,
          }}
        >
          Editorial-Brief
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 400,
            fontSize: 'clamp(2rem, 3.6vw + 0.5rem, 2.75rem)',
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: 'var(--color-ink)',
            textWrap: 'balance',
            margin: 0,
          }}
        >
          {title}
        </h2>
        <div lang="de" style={{ display: 'grid', gap: '20px' }}>
          {paragraphs.map((paragraph, idx) => (
            <p
              key={idx}
              style={{
                fontFamily: 'var(--font-crimson), Georgia, serif',
                fontSize: '18px',
                lineHeight: 1.65,
                color: 'var(--color-ink)',
                margin: 0,
                textWrap: 'pretty',
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
        <p
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '17px',
            color: 'var(--color-taupe)',
            margin: 0,
          }}
        >
          {SIGNATURE}
        </p>
      </div>
    </section>
  );
}
