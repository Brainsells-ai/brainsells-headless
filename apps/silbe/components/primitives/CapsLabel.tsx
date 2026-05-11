import type { ReactNode } from 'react';

// Editorial caps-label primitive — the 11px taupe Inter-uppercase mini-label
// that recurs above section headings (Homepage + PDP). Single canonical
// style; no color/size override props. Future variant (e.g., cream-on-charcoal
// in Footer) gets an explicit `tone` prop here rather than allowing arbitrary
// `style` escape hatch — closed API by design.
//
// Used by: Hero (eyebrow), TrustBar (per-item label), FuenfStimmen (section
// header), FeaturedEditions (header + In-Vorbereitung), WerkstattTeaser
// (header), EditorialLetter (header), BibliothekTeaser (section + per-card
// rubrik), Phase 3 PDP (Hero, MaterialSpecs, ThemeTags, EditorialEssay,
// CrossLinks eyebrows).
//
// NOT used by Hero.tsx image-caption (`Goldrahmen-Edition · Atelier Wien`):
// that's an absolute-positioned 9px cream-fade caption on dark backdrop —
// different concern, stays inline.

type CapsLabelProps = {
  children: ReactNode;
  // Semantic flexibility — most uses render <p>, some render <span> when
  // nested in a `<dt>` or inline context.
  as?: 'p' | 'span';
};

export function CapsLabel({ children, as: As = 'p' }: CapsLabelProps) {
  return (
    <As
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
      {children}
    </As>
  );
}
