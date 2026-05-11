import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type Stimme = {
  initial: string;
  fullName: string;
  lebensdaten: string;
  lebensorte: string;
  quote: string;
  source: string;
  slug: string;
};

const STIMMEN: readonly Stimme[] = [
  {
    initial: 'R',
    fullName: 'Rainer Maria Rilke',
    lebensdaten: '1875–1926',
    lebensorte: 'Prag · Worpswede · Wien · Muzot',
    quote:
      '„Vielleicht sind alle Drachen unseres Lebens Prinzessinnen, die nur darauf warten, uns einmal schön und mutig zu sehen.“',
    source: '›Briefe an einen jungen Dichter‹ · 1903',
    slug: 'rilke',
  },
  {
    initial: 'K',
    fullName: 'Franz Kafka',
    lebensdaten: '1883–1924',
    lebensorte: 'Prag',
    quote:
      '„Ein Buch muss die Axt sein für das gefrorene Meer in uns.“',
    source: '›Brief an Oskar Pollak‹ · 27.01.1904',
    slug: 'kafka',
  },
  {
    initial: 'M',
    fullName: 'Thomas Mann',
    lebensdaten: '1875–1955',
    lebensorte: 'Lübeck · München · Pacific Palisades',
    quote: '„Einsamkeit zeitigt das Originale.“',
    source: '›Der Tod in Venedig‹ · 1912',
    slug: 'mann',
  },
  {
    initial: 'Z',
    fullName: 'Stefan Zweig',
    lebensdaten: '1881–1942',
    lebensorte: 'Wien · Salzburg · Petrópolis',
    quote: '„Dir, der Du mich nie gekannt!“',
    source: '›Brief einer Unbekannten‹ · 1922',
    slug: 'zweig',
  },
  {
    initial: 'E',
    fullName: 'Marie von Ebner-Eschenbach',
    lebensdaten: '1830–1916',
    lebensorte: 'Mähren · Wien',
    quote: '„Wer nichts weiß, muss alles glauben.“',
    source: '›Aphorismen‹ · 1880',
    slug: 'ebner-eschenbach',
  },
];

const HAIRLINE = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';

export function FuenfStimmen() {
  return (
    <section
      aria-label="Die SILBE-Auswahl — fünf Stimmen"
      style={{
        backgroundColor: 'var(--color-cream)',
        paddingBlock: 'clamp(64px, 9vw, 120px)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--container-default)',
          margin: '0 auto',
          padding: '0 24px',
          display: 'grid',
          gap: '48px',
        }}
      >
        <header style={{ display: 'grid', gap: '20px', maxWidth: '720px' }}>
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
            Die SILBE-Auswahl
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-cormorant), Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(2.25rem, 4vw + 0.5rem, 3.25rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
              color: 'var(--color-ink)',
              textWrap: 'balance',
              margin: 0,
            }}
          >
            Fünf Stimmen, deren Worte länger Bestand haben als jede Mode.
          </h2>
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.6,
              color: 'var(--color-ink)',
              margin: 0,
              maxWidth: '560px',
              textWrap: 'pretty',
            }}
          >
            Keine Beliebigkeit. Keine Trends. Fünf Autor:innen aus dem
            deutschsprachigen Kanon — Rainer Maria Rilke, Franz Kafka, Thomas
            Mann, Stefan Zweig, Marie von Ebner-Eschenbach.
          </p>
        </header>

        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: '0',
          }}
        >
          {STIMMEN.map((stimme, idx) => (
            <li
              key={stimme.slug}
              className="silbe-stimme-row"
              style={{
                display: 'grid',
                gap: 'clamp(16px, 3vw, 40px)',
                alignItems: 'baseline',
                paddingBlock: 'clamp(32px, 4vw, 48px)',
                borderTop: idx === 0 ? HAIRLINE : 'none',
                borderBottom: HAIRLINE,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--font-cormorant), Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  fontSize: 'clamp(64px, 8vw, 96px)',
                  lineHeight: 1,
                  color: 'var(--color-taupe)',
                  letterSpacing: '-0.03em',
                }}
              >
                {stimme.initial}
              </span>

              <div style={{ display: 'grid', gap: '14px' }}>
                <div style={{ display: 'grid', gap: '4px' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-cormorant), Georgia, serif',
                      fontWeight: 600,
                      fontSize: 'clamp(22px, 2.6vw, 28px)',
                      lineHeight: 1.2,
                      color: 'var(--color-ink)',
                      margin: 0,
                    }}
                  >
                    {stimme.fullName}
                  </h3>
                  <p
                    style={{
                      fontFamily: 'var(--font-inter), system-ui, sans-serif',
                      fontSize: '12px',
                      letterSpacing: '0.06em',
                      color: 'var(--color-taupe)',
                      margin: 0,
                    }}
                  >
                    {stimme.lebensdaten} · {stimme.lebensorte}
                  </p>
                </div>

                <blockquote
                  cite={`/stimmen/${stimme.slug}`}
                  style={{
                    fontFamily: 'var(--font-cormorant), Georgia, serif',
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 'clamp(20px, 2.4vw, 26px)',
                    lineHeight: 1.35,
                    color: 'var(--color-ink)',
                    margin: 0,
                    textWrap: 'balance',
                  }}
                >
                  {stimme.quote}
                </blockquote>

                <p
                  style={{
                    fontFamily: 'var(--font-crimson), Georgia, serif',
                    fontStyle: 'italic',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    color: 'var(--color-taupe)',
                    margin: 0,
                  }}
                >
                  {stimme.source}
                </p>

                <Link
                  href={`/stimmen/${stimme.slug}`}
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
                  Mehr erfahren →
                </Link>
              </div>
            </li>
          ))}
        </ol>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
          <Button href="/stimmen" variant="tertiary">
            Alle Stimmen kennenlernen →
          </Button>
        </div>
      </div>
    </section>
  );
}
