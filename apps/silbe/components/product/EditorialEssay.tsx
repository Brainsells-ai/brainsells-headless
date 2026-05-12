import { RichText } from '@payloadcms/richtext-lexical/react';
import { CapsLabel } from '@/components/primitives/CapsLabel';
import type { EditorialEssay as EssayType } from '@/lib/payload-queries';

// Renders the Payload EditorialEssay: optional intro (lead-paragraph),
// optional Lexical body via @payloadcms/richtext-lexical RichText,
// optional pullQuote. All sections render only if their data exists —
// no "Editorial folgt" placeholder unless essay is null entirely.
//
// Allowed inline marks (set at editor level in EditorialEssays
// collection): italic + link. No bold/underline/strikethrough — by
// construction, valid essay-body data won't contain them. Werktitel
// always via ›...‹ Guillemets in text, never italic markup.

type EditorialEssayProps = {
  essay: EssayType | null;
};

const HAIRLINE_DIVIDER = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';

export function EditorialEssay({ essay }: EditorialEssayProps) {
  if (!essay) {
    return (
      <section
        aria-label="Editorial-Kontext"
        style={{
          maxWidth: 'var(--container-prose)',
          margin: '0 auto',
          padding: 'clamp(56px, 7vw, 96px) 24px',
        }}
      >
        <div style={{ display: 'grid', gap: '20px' }}>
          <CapsLabel>Editorial</CapsLabel>
          <p
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.6,
              color: 'var(--color-taupe)',
              margin: 0,
              maxWidth: '560px',
            }}
          >
            Editorial-Kontext folgt.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Editorial-Kontext"
      style={{
        maxWidth: 'var(--container-prose)',
        margin: '0 auto',
        padding: 'clamp(56px, 7vw, 96px) 24px',
      }}
    >
      <div style={{ display: 'grid', gap: '24px' }}>
        <CapsLabel>Editorial</CapsLabel>

        {essay.intro && (
          <p
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontStyle: 'italic',
              fontSize: '18px',
              lineHeight: 1.55,
              color: 'var(--color-ink)',
              margin: 0,
              maxWidth: '640px',
              textWrap: 'pretty',
            }}
          >
            {essay.intro}
          </p>
        )}

        {essay.body ? (
          <div
            lang="de"
            style={{
              fontFamily: 'var(--font-crimson), Georgia, serif',
              fontSize: '17px',
              lineHeight: 1.65,
              color: 'var(--color-ink)',
              maxWidth: '640px',
            }}
          >
            {/* RichText renders Lexical SerializedEditorState. Body type
                in payload-queries is `unknown` while payload-types.ts
                generation is blocked on the Node-25 bug — cast as `any`
                at the render boundary. Replace with proper SerializedEditorState
                generic-instantiation once payload-types is generated. */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <RichText data={essay.body as any} />
          </div>
        ) : null}

        {essay.pullQuote?.text && (
          <figure
            style={{
              margin: '24px 0',
              padding: '24px 0',
              borderTop: HAIRLINE_DIVIDER,
              borderBottom: HAIRLINE_DIVIDER,
              display: 'grid',
              gap: '12px',
            }}
          >
            <blockquote
              lang="de"
              style={{
                fontFamily: 'var(--font-cormorant), Georgia, serif',
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 'clamp(20px, 2.4vw + 0.5rem, 28px)',
                lineHeight: 1.3,
                color: 'var(--color-ink)',
                margin: 0,
                textWrap: 'balance',
              }}
            >
              {essay.pullQuote.text}
            </blockquote>
            {essay.pullQuote.source && (
              <figcaption
                style={{
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--color-taupe)',
                }}
              >
                {essay.pullQuote.source}
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </section>
  );
}
