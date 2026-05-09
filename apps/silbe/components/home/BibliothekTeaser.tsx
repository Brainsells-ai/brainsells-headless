import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { getPayload } from '@/lib/getPayload';

type Article = {
  slug: string;
  title: string;
  lead: string;
  rubrik: string;
};

const FALLBACK: readonly Article[] = [
  {
    slug: 'bibliothek-die-silbe-auswahl',
    title: 'Die SILBE-Auswahl — eine editorial-redaktionelle Notiz',
    lead:
      'Warum diese fünf, und nicht fünfzig. Eine Notiz aus dem Wiener Editorial-Atelier zur Frage, was Auswahl im Zeitalter beliebiger Zugänglichkeit noch bedeutet.',
    rubrik: 'Notiz',
  },
  {
    slug: 'bibliothek-warum-fuenf-stimmen',
    title: 'Warum fünf Stimmen — und nicht fünfzig',
    lead:
      'Über das Risiko der Beliebigkeit, das Versprechen der Tiefe, und über die Disziplin, fünf Stimmen länger zu lesen als ein Feed.',
    rubrik: 'Essay',
  },
  {
    slug: 'bibliothek-ee-aphorismus',
    title: 'Marie von Ebner-Eschenbach — die Schule des Aphorismus',
    lead:
      'Wer nichts weiß, muss alles glauben. Ein Satz, der seit 1880 unbescholten geblieben ist — und einen Versuch wert, ihm in die Werkstatt zu folgen.',
    rubrik: 'Aphorismus',
  },
];

const HAIRLINE_DIVIDER = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';
const HAIRLINE_CARD = '0.5px solid color-mix(in srgb, var(--color-ink) 12%, transparent)';

type PageDoc = { slug?: string; title?: string; body?: string | null };

async function fetchTeasers(): Promise<readonly Article[]> {
  try {
    const payload = await getPayload();
    const result = await payload.find({
      collection: 'pages',
      where: { slug: { like: 'bibliothek-' } },
      limit: 3,
      sort: '-updatedAt',
      depth: 0,
    });
    const docs = result.docs as PageDoc[];
    if (!docs || docs.length === 0) return FALLBACK;
    return docs.map((doc) => {
      const slug = doc.slug ?? FALLBACK[0].slug;
      const body = typeof doc.body === 'string' ? doc.body : '';
      return {
        slug,
        title: doc.title ?? slug,
        lead: body.length > 0 ? body.slice(0, 240) : FALLBACK[0].lead,
        rubrik: 'Notiz',
      };
    });
  } catch (err) {
    console.error('[BibliothekTeaser] payload fetch failed:', err);
    return FALLBACK;
  }
}

export async function BibliothekTeaser() {
  const articles = await fetchTeasers();

  return (
    <section
      aria-label="Bibliothek — editorial-redaktionelle Notizen"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderTop: HAIRLINE_DIVIDER,
        paddingBlock: 'clamp(64px, 9vw, 120px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-default)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '40px',
        }}
      >
        <header style={{ display: 'grid', gap: '16px', maxWidth: '720px' }}>
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
            Bibliothek
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2rem, 3.6vw + 0.5rem, 2.75rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              textWrap: 'balance',
              margin: 0,
            }}
          >
            Lesestoff aus dem Editorial-Atelier.
          </h2>
        </header>

        <ul
          className="silbe-bibliothek-grid"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px',
          }}
        >
          {articles.map((article) => (
            <li key={article.slug}>
              <Link
                href={`/bibliothek/${article.slug.replace(/^bibliothek-/, '')}`}
                style={{
                  display: 'grid',
                  gap: '14px',
                  textDecoration: 'none',
                  color: 'inherit',
                  padding: '32px 28px',
                  border: HAIRLINE_CARD,
                  height: '100%',
                  alignContent: 'start',
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
                  {article.rubrik}
                </p>
                <h3
                  style={{
                    fontFamily: 'var(--font-cormorant), Georgia, serif',
                    fontWeight: 600,
                    fontSize: 'clamp(20px, 2.2vw, 24px)',
                    lineHeight: 1.25,
                    color: 'var(--color-ink)',
                    margin: 0,
                    textWrap: 'balance',
                  }}
                >
                  {article.title}
                </h3>
                <p
                  lang="de"
                  style={{
                    fontFamily: 'var(--font-crimson), Georgia, serif',
                    fontSize: '15px',
                    lineHeight: 1.6,
                    color: 'var(--color-ink)',
                    margin: 0,
                    textWrap: 'pretty',
                  }}
                >
                  {article.lead}
                </p>
                <span
                  style={{
                    fontFamily: 'var(--font-inter), system-ui, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    color: 'var(--color-ink)',
                    textDecoration: 'underline',
                    textUnderlineOffset: '4px',
                    justifySelf: 'start',
                    marginTop: '4px',
                  }}
                >
                  Lesen →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <Button href="/bibliothek" variant="tertiary">
            Zur Bibliothek →
          </Button>
        </div>
      </div>
    </section>
  );
}
