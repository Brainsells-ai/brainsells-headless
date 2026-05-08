# SILBE Brand Tokens

**Status:** kanonisch — diese Datei ist die einzige Wahrheit für Farben, Typografie, Spacing, Motion und Photography Direction.
**Stand:** 2026-05-07
**Für:** alle Frontend-Komponenten in `apps/silbe/`, alle Creative-Assets, alle künftigen Brainsells-Brands die das Pattern erben.

---

## Lese-Reihenfolge für Agents

Dieses Dokument ist so geschrieben dass ein Agent (Claude Code) es einmal liest und danach beim Bauen jeder Komponente konsultiert. Die TypeScript-Datei `apps/silbe/lib/tokens.ts` wird **aus diesem Dokument abgeleitet** — wenn ein Token sich ändert, ändert es sich hier zuerst und wird dann in TypeScript synchronisiert. Niemals umgekehrt.

---

## 1. Farben

### Primärpalette (60/25/4-4-4-1 Verteilung)

| Token | Hex | Anteil | Anwendung |
|---|---|---|---|
| `cream` | `#F2EBDB` | 60% | Primary Background, Body, Cards. Warm, niemals weiß. |
| `ink` | `#1A1814` | 25% | Body Text, Wordmark, primäre CTA Hintergründe. Warm-schwarz, niemals `#000`. |
| `burgundy` | `#5C1A1B` | 4-5% | Kafka-SKUs, Dark Academia Akzente, sekundäre Links bei hover (Ink → Burgundy). |
| `sage` | `#9AA393` | 4-5% | Rilke-SKUs. Olive-gedrift, niemals Millennial-Sage. |
| `taupe` | `#8B7865` | 4-5% | Ebner-Eschenbach-SKUs, Hairlines, sekundäre Texte (Captions, Quellen). |
| `staubrose` | `#D4A894` | <1% | Zweig Memorial A2 ausschließlich. Extrem sparing einsetzen. |
| `gold` | `#B8955C` | accent | Wordmark-Akzent, Mann-Capsule, Goldrahmen-Edition Indikatoren. |

### Sekundärpalette (situativ)

| Token | Hex | Anwendung |
|---|---|---|
| `deep-olive` | `#4A5640` | Q4 Saisonal (Rilke Herbsttag Phase-2). |
| `soft-beige` | `#E8DCC7` | Bibliothek-Page Background, Postkarten-Sektionen. |
| `charcoal` | `#3A3835` | Dark-Academia Variant Backgrounds (Hero-Charcoal-Editionen). |

### Hard Bans (niemals verwenden)

- `#FFFFFF` reines Weiß — steril, bricht den Cream-Charakter.
- `#000000` reines Schwarz — hart, bricht die Editorial-Wärme.
- Alle pastellig-rosa Töne (Millennial Pink).
- Mint/Cottagecore-Grün.
- Bronze-Rosé-Gold ("Kitsch-Gold").
- Rainbow-Gradients oder Multi-Hue-Verläufe jeglicher Art.

### State-Berechnung (kein Hardcoding)

Hover, Disabled und Translucent-States werden via CSS `color-mix()` berechnet, niemals als separate Hex-Werte definiert:

```css
/* Hover auf Ink-Button */
background-color: color-mix(in srgb, var(--ink) 92%, var(--cream));

/* Disabled */
color: color-mix(in srgb, var(--ink) 40%, transparent);

/* Hairline */
border-color: color-mix(in srgb, var(--ink) 15%, transparent);
```

### TypeScript-Spiegelung

```typescript
// apps/silbe/lib/tokens.ts
export const colors = {
  cream: '#F2EBDB',
  ink: '#1A1814',
  burgundy: '#5C1A1B',
  sage: '#9AA393',
  taupe: '#8B7865',
  staubrose: '#D4A894',
  gold: '#B8955C',
  deepOlive: '#4A5640',
  softBeige: '#E8DCC7',
  charcoal: '#3A3835',
} as const;
```

---

## 2. Typografie

### Hierarchie

| Tier | Schriftart | Variante | Zweck |
|---|---|---|---|
| Display | **Cormorant Garamond** | 400, 400i, 600, 700 | Hero-Quotes, H1, Wordmark-Fallback |
| Editorial Body | **Crimson Pro** | 400, 400i, 600 | Editorial Essays, PDP Long-Form, Bibliothek |
| UI / Sans | **Inter** | 400, 500 | Navigation, Buttons, Labels, Trust-Bar, Captions |
| Accent (Phase 2) | **Playfair Display** | 700i | Mann-Capsule (später), Editorial Pull-Quotes |

### Loading

```html
<link rel="preload" href="/fonts/cormorant-garamond-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/crimson-pro-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
```

`font-display: swap` ist Pflicht. FOIT (Flash of Invisible Text) ist verboten.

### Type-Scale (clamp-basiert, mobile-first)

| Token | Min (mobile) | Max (desktop) | Anwendung |
|---|---|---|---|
| `text-xs` | 12px | 12px | Captions, Quellenangaben, Legal |
| `text-sm` | 13px | 14px | Body bei Trust-Bar, Footer |
| `text-base` | 16px | 17px | Standard Body |
| `text-lg` | 18px | 20px | Editorial Lead-Paragraphen |
| `text-xl` | 22px | 26px | Subheadlines |
| `text-2xl` | 28px | 36px | H2 / Section-Titles |
| `text-3xl` | 36px | 52px | H1 / PDP Quote |
| `text-hero` | 44px | 96px | Homepage Hero Quote (Cormorant Italic) |

```css
.text-hero {
  font-size: clamp(2.75rem, 6vw + 1rem, 6rem);
  line-height: 1.1;
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 400;
}
```

### Typografie-Regeln

- **`text-wrap: balance`** für alle Headlines (H1, H2, H3) — Browser bricht für visuell ausbalancierte Zeilen.
- **`text-wrap: pretty`** für Body-Text — vermeidet Schusterjungen/Hurenkinder.
- **`hyphens: auto`** + `lang="de"` auf allen Long-Form-Containern. Deutsche Trennregeln.
- **Letter-Spacing:** Cormorant bei Display-Größen `tracking-tight` (`-0.02em`). Inter bei UI-Größen `tracking-normal`. Bei Caps-Lock-Mini-Labels `tracking-widest` (`0.18em`).
- **Anführungszeichen:** Deutsche Anführungszeichen sind Pflicht — `„"` (oben unten) für Zitate. Guillemets `›‹` für Werktitel. Niemals `"..."` (US-Style).
- **Umlaute:** ä ö ü, niemals ae oe ue. Auch nicht in Asset-Filenamen wenn vermeidbar.

---

## 3. Spacing & Layout

### Baseline Grid

8px Baseline. Alle vertikalen Abstände sind Vielfache von 8.

### Spacing-Skala

| Token | px | Anwendung |
|---|---|---|
| `space-1` | 4px | Inline-Gaps zwischen Icon und Text |
| `space-2` | 8px | Stack-Gap Compact |
| `space-3` | 12px | Stack-Gap Default |
| `space-4` | 16px | Stack-Gap Comfortable |
| `space-6` | 24px | Component-Internal Padding |
| `space-8` | 32px | Card-Padding |
| `space-12` | 48px | Section-Padding Mobile |
| `space-16` | 64px | Section-Padding Tablet |
| `space-24` | 96px | Section-Padding Desktop |

### Container-Widths

```css
--container-prose: 640px;     /* Editorial Long-Form */
--container-narrow: 720px;    /* Single-Column PDP */
--container-default: 1120px;  /* Standard-Layout */
--container-wide: 1440px;     /* Hero, Bibliothek-Hub */
```

### Section-Padding

Mobile: `padding-block: 48px`. Tablet: `padding-block: 64px`. Desktop: `padding-block: 96px`.
Niemals weniger als 48px between Sections — Editorial Restraint braucht Atemraum.

### Responsive Breakpoints

| Token | min-width | Anwendung |
|---|---|---|
| `sm` | 640px | Mobile-Landscape, kleine Tablets |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide Desktop |

Mobile-First ist Pflicht. Jede Komponente wird zuerst bei 393×852 (iPhone 14 Pro) gebaut, dann skaliert.

---

## 4. Komponenten-Tokens

### Buttons

```css
.btn-primary {
  background: var(--ink);
  color: var(--cream);
  padding: 14px 28px;
  border-radius: 2px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.04em;
  transition: background 200ms ease;
}
.btn-primary:hover {
  background: color-mix(in srgb, var(--ink) 88%, var(--cream));
}
```

- Primary: Ink-Background, Cream-Text. Für CTA "Editionen ansehen", "In den Warenkorb".
- Secondary: Cream-Background, Ink-Text, 1px Hairline-Border. Für "Mehr erfahren", "Bibliothek lesen".
- Tertiary (Text-Link): kein Background, Ink-Text, animierter Underline-On-Hover (von links nach rechts).
- **Verboten:** Border-Radius >2px, Box-Shadows, Gradient-Backgrounds, Scale-Transforms beim Hover.

### Cards

```css
.card-product {
  background: transparent;
  border: 0.5px solid color-mix(in srgb, var(--ink) 12%, transparent);
  padding: 0;
}
```

- Keine Box-Shadows. Niemals.
- Hairlines `0.5px solid color-mix(in srgb, var(--ink) 15%, transparent)`.
- Hover: Border wird zu `color-mix(in srgb, var(--ink) 30%, transparent)`. Keine Scale-Transformation.
- Aspect-Ratio Produktbild: **3:4 (portrait)**. Niemals 1:1, niemals 16:9.

### Forms

```css
input[type="email"],
input[type="text"],
textarea {
  background: var(--cream);
  border: 0;
  border-bottom: 1px solid var(--ink);
  padding: 12px 0;
  font-family: var(--font-serif);
  font-size: 16px;
  color: var(--ink);
  outline: none;
}
input:focus {
  border-bottom-color: var(--burgundy);
}
```

Floating-Label-Pattern. Underline-Border. Kein Box, kein Border-Radius.

### Hairlines & Dividers

`0.5px solid color-mix(in srgb, var(--ink) 15%, transparent)` — universell. Section-Divider erhalten zusätzlich `40px` Vertikal-Margin.

---

## 5. Motion

### Prinzipien

- **Reduced-Motion respect:** `@media (prefers-reduced-motion: reduce)` setzt alle Custom-Animations auf `0.01ms` und entfernt jegliche `transform: translate()`. Pflicht.
- **Easing:** Standard `ease-out` (`cubic-bezier(0, 0, 0.2, 1)`). Niemals `ease-in-out` für Entries, niemals Springs/Bouncing.
- **Duration:** 200ms für Hover-States, 320ms für State-Transitions, 480ms für Reveal-In, 720ms für Page-Transitions. Niemals länger.
- **Was animiert wird:** opacity, transform: translateY (max 8px), border-color, color. **Niemals**: background-image, box-shadow, width/height (nur via clip-path wenn nötig).

### CSS Scroll-Driven Animations (für Reading-Progress, Sticky-Header-Morph)

```css
@supports (animation-timeline: scroll()) {
  .reading-progress {
    animation: progress linear;
    animation-timeline: scroll();
  }
}
```

`@supports`-Fence ist Pflicht. Falls Browser nicht unterstützt: kein Fallback nötig, Feature degradiert ohne Funktionsverlust.

### View Transitions API

Für Page-Transitions (Kollektion → PDP), Wordmark-Scale-Shift bei Header-Stick, Modal-Entries. Hinter `@supports` fence.

### `@starting-style` für Quote-Reveals

```css
.silbe-pull-quote {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 480ms ease-out, transform 480ms ease-out;
}
@starting-style {
  .silbe-pull-quote {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

---

## 6. Photography Direction

### Was funktioniert (basierend auf Asset-Bundle Review)

- **Echte SILBE-Posters auf AI-generierten Backdrops kompositieren.** Niemals AI komplette Szenen mit Schrift rendern lassen.
- **Atmosphärische Photoshoots ohne Menschen, ohne lesbare Schrift.** Worpswede-Feldweg, Dark-Academia-Schreibtisch, Olivenzweig-in-Vase — keine AI-Tells.
- **Single Light Source** mit sichtbaren Schatten. Goldhour-Warmth oder Norddiffuses Tageslicht. Niemals Studio-Flatlight.
- **Real-Wall-Context.** Echte Wände (Putz, Holz, Marmor), niemals weißer Studio-Hintergrund.
- **Hand-in-Context erlaubt — aber nur im Detail.** Keine vollen Gesichter, keine Posen. Identity-Andeutung statt Porträt.
- **Reclam/Suhrkamp/Insel-Pairing.** Vintage-Bücher als Co-Subject sind ownable und literarisch glaubwürdig.

### Was nicht funktioniert

- AI-generierte Texte auf Postern, Buchrücken, Postkarten. Halluzinations sind sofort sichtbar.
- AI-Hände im Vordergrund. Anatomische Tells sind quasi unausweichlich.
- Studio-White-BG mit zentriertem Produkt. Stock-photo-coded.
- Lifestyle-Models in Pose. Bricht die Editorial-Stimme.
- Oversaturation. Filmgrain-Mood ist `+0`-Saturation, nicht `+15`.
- LED-Ring-Light Flash, harte Schlagschatten.

### Aspect Ratios

| Use | Aspect Ratio |
|---|---|
| Hero | 16:10 (cinema-narrow) |
| PDP Hero | 4:5 (mobile-friendly portrait) |
| Produkt-Card | 3:4 (poster-standard) |
| Postkarten-Hero | 3:2 (querformat poster, matches actual product) |
| Bibliothek-Article-Hero | 16:9 |
| OG-Card | 1200x630 (1.91:1 fix) |

### Image-Format-Hierarchie

`<picture>` mit AVIF → WebP → JPEG fallback. Alle Hero-Images `loading="eager"`, alles below-fold `loading="lazy" decoding="async"`. Next.js `<Image>` Component erledigt das automatisch wenn `priority`-prop richtig gesetzt wird.

### Asset-Filename-Convention

```
{author-shortname}-{format}-{quote-slug}-{scene-id}.{ext}
silbe-rilke-a3-habegeduld-scene-A.jpg
silbe-kafka-a3-axt-goldrahmen.jpg
silbe-zweig-a2-memorial-staubrose.jpg
about-triptych-1-hand-on-book.jpg
hero-block-1-cinema.jpg
og-card-rilke.png
```

Niemals Umlaute, niemals Spaces, niemals Großbuchstaben. Lowercase + Hyphens. Author-Shortnames: `rilke kafka mann zweig ee` (Ebner-Eschenbach), `lasker` (deprecated, archived).

---

## 7. Hard Constraints (cannot relax under any pressure)

Diese Constraints sind nicht-verhandelbar. Wenn ein Agent oder eine Komponente versucht eine zu brechen, ist das ein Fehler in der Implementierung, nicht in den Tokens.

1. **Kein Hardcoding von Farben.** Jede Farbe kommt aus `lib/tokens.ts` oder via CSS-Variable. Kein Inline-Style mit Hex.
2. **Kein JS-Framework außer React/Next.js + Payload.** Keine Tailwind UI, kein shadcn/ui (außer reaktiver Tabs/Disclosure-Komponenten ohne Style-Override), kein Material UI.
3. **Mobile-First.** Jede Komponente wird in 393×852 zuerst gebaut. Desktop ist erweiterung.
4. **`prefers-reduced-motion: reduce` global respektieren.**
5. **`font-display: swap` Pflicht.** FOIT verboten.
6. **AVIF → WebP → JPEG Hierarchie via `<picture>`.**
7. **Niemals Box-Shadows auf Cards.** Hairlines stattdessen.
8. **Border-Radius maximal 4px.** Editoral hat scharfe Kanten, nicht Rounded-iOS-Look.
9. **Keine Emojis im Body-Text.** Keine Icons-as-Decoration. Wenn Icon nötig: Lucide-React, monochrom Ink, 16px max.
10. **Type-Scale via `clamp()`.** Niemals statische px-Werte für Body/Headlines außer in Komponenten-Internals.

---

## 8. Performance-Budgets

| Metric | Mobile Target | Desktop Target |
|---|---|---|
| LCP | ≤ 2.0s | ≤ 1.2s |
| CLS | < 0.05 | < 0.02 |
| TBT | < 150ms | < 50ms |
| Total CSS per Route (gzipped) | ≤ 60KB | ≤ 60KB |
| Total JS per Route (gzipped) | ≤ 120KB | ≤ 120KB |
| Lighthouse Performance | ≥ 90 | ≥ 95 |
| Lighthouse Accessibility | ≥ 95 | ≥ 95 |
| Lighthouse Best Practices | ≥ 95 | ≥ 95 |
| Lighthouse SEO | 100 | 100 |

Diese Budgets werden in `apps/silbe/lighthouse-budget.json` als Lighthouse-CI-Config gepinnt. Build schlägt fehl wenn überschritten.

---

## 9. Erweiterung & Vererbung

Künftige Brainsells-Brands können diese Tokens als Basis erben. Geplante Extraktion (Phase 2):

```
packages/brand-system/
  ├── tokens/
  │   ├── silbe.ts        ← diese Datei als TS
  │   ├── brand-2.ts      ← künftige Brand
  │   └── shared.ts       ← spacing, motion, breakpoints (universal)
  ├── components/
  │   ├── Button.tsx      ← variants per brand
  │   ├── Card.tsx
  │   └── ...
```

In Phase 1 lebt das System monolithisch in `apps/silbe/lib/tokens.ts`. Die Extraktion erfolgt erst wenn Brand 2 konkret wird — vorher ist es Premature Abstraction.

---

## 10. Changelog-Disziplin

Jede Änderung an dieser Datei muss:
1. Hier am Ende mit Datum und Begründung dokumentiert werden.
2. Den entsprechenden TypeScript-Mirror in `lib/tokens.ts` updaten.
3. Den dazugehörigen Visual-Regression-Test in Playwright triggern.

### Changelog

- **2026-05-07** — Initial lock. Migriert von `silbe-design-stack-decision.md` (Liquid-Welt) auf Headless-Architektur. Kein inhaltlicher Bruch — Tokens identisch, nur Anwendungs-Layer wechselt von Liquid auf React.
