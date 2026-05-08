# SILBE Asset Mapping

**Status:** kanonisch — diese Datei ist die einzige Wahrheit dafür welcher Asset wo lebt, welcher Status hat, welcher neu generiert werden muss.
**Stand:** 2026-05-07
**Für:** Frontend-Build (Layout + PDP + Bibliothek + Werkstatt), Asset-Re-Generation-Sprint, Agentic-Catalog-Optimierung.

---

## Lese-Reihenfolge für Agents

Ein Agent der eine Komponente baut: 1) diese Datei für Asset-Verfügbarkeit, 2) `brand-tokens.md` §6 für Photography-Direction, 3) `vocabulary.md` für Captions/Alt-Texts. Wenn ein Asset als "muss neu" markiert ist, **niemals den schwachen vorhandenen verwenden** — stattdessen den Re-Generation-Brief in §4 ausführen.

---

## 1. Inventory (Stand des Bundles)

Das Bundle `silbe-creatives-bundle-2026-05-06.zip` enthält 178 Files, 54 MB. Status-Verteilung aus `manifest.json`:

| Status | Count | Bedeutung |
|---|---|---|
| live-candidate | 62 | Production-ready, kann ohne Polish in den Build |
| draft | 85 | Iteration-Material, nicht Production-ready |
| rejected | 20 | Verworfen, niemals verwenden |
| polished | 10 | CLAID-polished Bio-Photoshoots |
| live-in-store-winner | 1 | Aktuell auf silbe.at deployed (Hero Variant A — wird ersetzt) |

### Verzeichnisstruktur

```
silbe-creatives-bundle/
├── 01-claid-photoshoots/
│   └── p4-polished-editorial/   ← 10 Bio-Atmosphären (Worpswede, Prag, Lübeck, Wien etc.)
├── 02-fal-flux/
│   ├── hero-block1-variants/    ← 3 Hero-Konzepte (A/B/C — A ist live, alle drei werden ersetzt)
│   ├── logos-v1/                ← rejected (AI-Wordmark-Generation funktioniert nicht)
│   ├── p4-raw-editorial-pdp/    ← 4.6 MB Raw-Material für PDP, draft
│   └── phase-a234-banners-pdp/  ← 6.1 MB PDP-Banner-Drafts
├── 03-ideogram/
│   ├── brand-assets/            ← Apple-Touch-Icon, Avatar, Email-Sig — production-ready
│   ├── logos-v1/ + logos-v2-concepts/ ← alle rejected
│   └── og-cards/                ← 20 OG-Cards (alle live-candidate, production-ready)
├── 04-recraft-svgs/
│   ├── logos-v2-vectors/        ← rejected
│   └── textures/                ← 4 Brand-Texturen (paper-grain, sage-wash, etc.) — live-candidate
└── 05-imagen-editorial/
    ├── about-triptych-deployed/ ← 3 Werkstatt-Bilder (1+2 schwach, 3 stark — siehe §3)
    ├── about-triptych-raw/      ← 17 MB Iteration-Material
    ├── mockups-v3-backdrops-only/ ← 6 MB leere Galerie/Café-Szenen (Backdrop-Library)
    └── mockups-v3-composites/   ← 29 PDP-Lifestyle-Composites mit echten SILBE-Postern (live-candidate)
```

---

## 2. Page-zu-Asset Mapping (Build-Pflicht)

### 2.1 Homepage (`/`)

| Position | Asset | Status |
|---|---|---|
| Hero LEFT (Quote-Sektion) | kein Bild — typografisch | — |
| Hero RIGHT (atmosphärisches Composite) | `mockups-v3-composites/silbe-rilke-geduld-hero-burgundy-scene-A.jpg` (1280×896, burgundy charcoal mood) | ✅ live-candidate |
| Trust-Bar Icons | nur Typografie + Inter-Caps, keine Bild-Assets | — |
| "Fünf Stimmen"-Sektion | textuell, mit Initial-Letters R/K/M/Z/E in Cormorant 96pt | — |
| Featured Editions (3-4 Cards) | Composites aus `mockups-v3-composites/`: Rilke Goldrahmen, Kafka Goldrahmen, Mann Hero Charcoal, Zweig Memorial | ✅ live-candidate |
| Werkstatt-Teaser | `about-triptych-deployed/about-triptych-3-olive-sprig.jpg` (Olivenzweig in Vase) | ✅ live-candidate |
| Bibliothek-Teaser | typografisch (drei Article-Cards), keine Hero-Bilder pro Card | — |
| OG-Image (für Social-Share) | `og-cards/og-card-rilke-A.png` (1200×630) | ✅ production-ready |

### 2.2 Editionen (`/editionen`)

Kollektion-Übersicht. Reine Produkt-Cards, keine Hero-Bilder.

| Position | Asset |
|---|---|
| Card-Image pro Produkt | aus Shopify CDN (Produkt-Hauptbild) — nicht aus Bundle. Bundle liefert die Composite-Source-Images, aber Production-CDN-Source ist Shopify. |
| Hover-Image (Lifestyle) | aus `mockups-v3-composites/` — pro SKU mappen, siehe §2.3 |

Aspect Ratio: 3:4 portrait für alle Cards. Konsistent.

### 2.3 PDP (`/editionen/[handle]`)

Pro SKU eine Variante. Mapping nach Handle:

| Shopify Handle | Hero-Asset (Above-Fold) | Lifestyle-Mockup (Hover/Carousel) |
|---|---|---|
| `silbe-rilke-geduld-hero-burgundy` | echtes Poster-PNG aus `cowork/outputs/sku-png-v3/` (existiert nicht im Bundle, ist im Brain) | `mockups-v3-composites/silbe-rilke-geduld-hero-burgundy-scene-A.jpg` |
| `silbe-rilke-geduld-goldrahmen` | echtes Poster-PNG | `mockups-v3-composites/silbe-rilke-geduld-goldrahmen-scene-B.jpg` |
| `silbe-kafka-axt-goldrahmen` | echtes Poster-PNG | `mockups-v3-composites/silbe-kafka-axt-goldrahmen-scene-B.jpg` |
| `silbe-mann-einsamkeit-hero-charcoal` | echtes Poster-PNG | `mockups-v3-composites/silbe-mann-einsamkeit-hero-charcoal-scene-A.jpg` |
| `silbe-mann-einsamkeit-goldrahmen` | echtes Poster-PNG | `mockups-v3-composites/silbe-mann-einsamkeit-goldrahmen-scene-B.jpg` |
| `silbe-zweig-memorial-staubrose` | echtes Poster-PNG | `mockups-v3-composites/silbe-zweig-memorial-staubrose-scene-A.jpg` |
| `silbe-zweig-unbekannte-goldrahmen` | echtes Poster-PNG | `mockups-v3-composites/silbe-zweig-unbekannte-goldrahmen-scene-B.jpg` |
| `silbe-ee-aphorismus-goldrahmen` | echtes Poster-PNG | `mockups-v3-composites/silbe-ee-aphorismus-goldrahmen-scene-B.jpg` |
| `silbe-stempel-rilke-postkarten-3er` | Postkarten-Front-PNG | `mockups-v3-composites/silbe-stempel-rilke-postkarten-3er-scene-D.jpg` (Café-Tisch) |
| `silbe-stempel-kafka-postkarten-3er` | Postkarten-Front-PNG | `mockups-v3-composites/silbe-stempel-kafka-postkarten-3er-scene-D.jpg` |
| `silbe-stempel-zweig-postkarten-3er` | Postkarten-Front-PNG | `mockups-v3-composites/silbe-stempel-zweig-postkarten-3er-scene-D.jpg` |
| `bundle-goldrahmen-trio` | Bundle-Poster-Composite | `mockups-v3-composites/bundle-goldrahmen-trio-scene-B.jpg` |
| `bundle-stempel-sammler` | Bundle-Postkarten-Composite | `mockups-v3-composites/bundle-stempel-sammler-scene-D.jpg` |

**Wichtig:** Die echten Poster-PNGs liegen NICHT im Creatives-Bundle, sondern im Brain unter `cowork/outputs/sku-png-v3/`. Die müssen separat in das Repo kopiert werden — am besten in `apps/silbe/public/products/` oder noch besser in Shopify als Produkt-Hauptbild hochgeladen.

### 2.4 Stimmen (`/stimmen`)

Autoren-Hub mit fünf Einträgen.

| Autor | Bio-Atmosphäre |
|---|---|
| Rilke | `01-claid-photoshoots/p4-polished-editorial/bio-rilke-worpswede.jpg` (Birken-Feldweg) ✅ |
| Kafka | `01-claid-photoshoots/p4-polished-editorial/bio-kafka-prag.jpg` ⚠️ (sieht zu wienerisch aus — siehe §4) |
| Mann | `01-claid-photoshoots/p4-polished-editorial/bio-mann-luebeck.jpg` ✅ |
| Zweig | `01-claid-photoshoots/p4-polished-editorial/bio-zweig-wien.jpg` ✅ |
| Ebner-Eschenbach | `01-claid-photoshoots/p4-polished-editorial/bio-ebner-eschenbach-bohemia.jpg` ✅ |

Author-Portraits (Wikimedia PD) liegen im Brain `cowork/outputs/silbe-day5/author-portraits/` — separat in `apps/silbe/public/authors/` kopieren.

### 2.5 Bibliothek (`/bibliothek`)

Editorial-Hub. Aesop-Library-Pattern: 8 kuratierte Tiles, kein Feed.

| Article-Slug | Hero-Image |
|---|---|
| `editorial-die-silbe-auswahl` | `01-claid-photoshoots/p4-polished-editorial/meta-dark-academia-hero.jpg` (Schreibtisch-Lampe) ✅ |
| `editorial-warum-fuenf-stimmen` | `about-triptych-deployed/about-triptych-2-postcards-stack.jpg` ⚠️ (siehe §4 — Pseudo-Text auf Karten) |
| `editorial-ee-aphorismus` | `bio-ebner-eschenbach-bohemia.jpg` |
| Weitere Phase-2 | TBD (Brand-Polish-Sprint) |

### 2.6 Werkstatt (`/werkstatt`)

Über-uns / Editorial-Atelier.

| Position | Asset |
|---|---|
| Hero-Triptych Position 1 | **muss neu generiert werden** (siehe §4 — about-triptych-1-hand-on-book ist schwach) |
| Hero-Triptych Position 2 | **muss neu generiert werden** (about-triptych-2-postcards-stack hat Pseudo-Text) |
| Hero-Triptych Position 3 | `about-triptych-deployed/about-triptych-3-olive-sprig.jpg` ✅ — bleibt |
| Schreibtisch-Detail | `meta-dark-academia-hero.jpg` ✅ |
| Optional: Buchregal-Detail | aus `mockups-v3-backdrops-only/` (welches passt) — TBD |

### 2.7 Footer & Cross-Surface

| Position | Asset |
|---|---|
| Wordmark Header | aus Brain `cowork/outputs/logos-final/` (HOT 2 Wordmark — Aleks-canonical) — **separat ins Repo importieren** |
| Wordmark Footer dunkel | HOT 2 Wordmark gold-on-charcoal Variante |
| Apple-Touch-Icon | `03-ideogram/brand-assets/brand-apple-touch-180.png` ✅ |
| Favicon | aus Brain `cowork/outputs/silbe-day5/favicon.ico` — separat importieren |
| Email-Signature-Image | `03-ideogram/brand-assets/brand-email-signature-600.png` ✅ |
| Social-Avatar (1000×1000) | `03-ideogram/brand-assets/brand-social-avatar-1000.png` ✅ |

---

## 3. Was sofort production-ready ist (live-candidate, kein Polish nötig)

### Mockup-Composites (29 Files)

Alles in `05-imagen-editorial/mockups-v3-composites/`. Diese sind **die methodische Goldstandard-Stufe**: echtes SILBE-Poster-PNG einkomponiert auf AI-generierten Hintergrund (Galerie, Café-Tisch, Schreibtisch). Keine AI-Halluzinationen weil das Poster echt ist.

**Asymmetrie-Hinweis:** Wenn alle Goldrahmen-Editionen die identische Galerie-Szene zeigen (gleiche Vase, gleicher Olivenzweig, gleiche Wand), kippt der Premium-Effekt in Wiederholung. Lösung: Im PDP-Build Scene-A vs Scene-B vs Scene-F rotieren — dafür existieren die Suffixe.

### OG-Cards (20 Files)

Alles in `03-ideogram/og-cards/`. Typografie korrekt, deutsche Anführungszeichen, Quellenangaben präzise. Production-ready für Social-Share-Meta-Tags.

OG-Card-Mapping:
- Per-Author: `og-card-rilke-A/B.png`, `og-card-kafka-milena-A/B.png`, `og-card-mann-A/B.png`, `og-card-zweig-A/B.png`, `og-card-ebner-eschenbach-A/B.png`
- Meta: `og-card-five-klassiker-A/B.png`, `og-card-klassiker-meta-A/B.png`
- Editorial: `og-card-dark-academia-A/B.png`, `og-card-tucholsky-essay-A/B.png` (für Bibliothek-Articles)
- ⚠️ `og-card-lasker-schueler-A/B.png` — **deprecated**, Lasker ist archiviert (Mai 2026 Decision). Nicht verwenden.

In `apps/silbe/app/[...]/page.tsx` via `generateMetadata()` pro Route binden.

### Bio-Photoshoots (10 Files, polished via CLAID)

Alles in `01-claid-photoshoots/p4-polished-editorial/`. Hochauflösend (2400×1920), HDR-graded, sharpness 20. Authentisch — keine AI-Hände, keine AI-Schrift.

Eine Ausnahme: **`bio-kafka-prag.jpg`** sieht eher nach Wien aus als Prag. Funktioniert atmosphärisch, aber wer Prag kennt stutzt. Re-Generation in §4.

### Brand-Assets (3 Files)

`03-ideogram/brand-assets/` — Apple-Touch-Icon, Social-Avatar, Email-Signature. Production-ready, in `apps/silbe/public/` kopieren.

### Brand-Texturen (4 Files)

`04-recraft-svgs/textures/`:
- `paper-grain-cream.svg` — als Background-Layer für Cards (subtle 3% opacity overlay)
- `sage-wash.svg` — Akzent-Layer für Stimmen-Page
- `taupe-hairline-grid.svg` — Hintergrund-Pattern für Werkstatt
- `ink-stamp-circle.svg` — Brand-Stamp für Versand-Sektion

SVG kann inline embedded werden in CSS. Performance-impact null.

---

## 4. Was neu generiert werden muss (Re-Generation-Briefs)

### 4.1 Hero — komplett neu (Variant A ist deprecated)

**Aktuelle Live-Asset:** `02-fal-flux/hero-block1-variants/variant_A.jpg` — gelbe Reclam-Bücher, halluziniertes "SILBE"-Wordmark in falscher Typo, Lorem-Ipsum-artiger Pseudotext.

**Neue Strategie:** Hybrid Hero — Quote-LEFT (typografisch), Composite-RIGHT (atmosphärisch).
**Composite-Source:** **`silbe-rilke-geduld-hero-burgundy-scene-A.jpg`** ist bereits production-ready im Bundle. Nicht neu generieren — nur Layout-Implementation. Falls eine cinematic-narrowere 16:10 Variante gebraucht wird (statt 4:5), hier Re-Generation-Brief:

```
Prompt-Brief für Imagen 4 Ultra oder Flux Pro:
"A cinematic editorial scene with cathedral-quiet gravitas. A real SILBE poster
(will be composited in post) sits centered, propped against a deep burgundy-charcoal
wall. Side-light source from camera-left grazes across the cream paper. Beside the
poster: a small stack of vintage cloth-bound German hardcovers and an old Reclam
paperback edge catching a sliver of light. Almost-monochrome: cream and ink dominate,
whisper-faint burgundy and gold-leaf accents in the book bindings. 16:10 horizontal,
dark academia atmosphere, ISO-400 35mm-film aesthetic.
Negative: no text, no typography, no faces, no hands, no flat-lay, no studio-white-bg."

Aspect: 16:10 (1600×1000 minimum)
Compositing: SILBE-Poster-PNG als zentrales Layer einsetzen
Output-Path: apps/silbe/public/heroes/hero-cinema-rilke-burgundy.jpg
```

### 4.2 About-Triptych Bild 1 (Hand-on-Book) — neu

**Problem:** AI-Hand zeigt Plastik-Tells, Buchtext ist Pseudo-Latein.

**Re-Generation-Brief:**

```
"A close-up editorial scene of an open vintage German book on a warm wooden
desk surface, viewed from above at a slight angle. Soft window-light from the
left, golden-hour. The book is open mid-volume, pages slightly yellowed with
age. NO HAND in frame. NO READABLE TEXT — the page rendering should be
intentionally soft-focus blur so individual letters dissolve into typographic
texture. A worn cloth bookmark drapes across the right page. A small stack of
two more vintage books beside it. Cream wall behind. Real-wall context, not
studio.
Negative: no hands, no faces, no readable typography, no Lorem-Ipsum-style
fake text, no flat-lay-white-bg, no harsh shadows."

Aspect: 4:5 portrait (für Triptych-Layout)
Output-Path: apps/silbe/public/werkstatt/triptych-1-book-detail.jpg
```

### 4.3 About-Triptych Bild 2 (Postkarten-Stack) — neu

**Problem:** AI-Pseudo-Text auf den Postkarten ("Tax Nimit", "Sibrudtindt").

**Re-Generation-Brief — Methodik-Switch:**

Statt erneut AI-komplette-Karten zu generieren, **echte SILBE-Postkarten-PNGs aus `cowork/outputs/sku-png-v3/silbe-stempel-*-vorderseite.png` programmatisch in den AI-Hintergrund kompositieren** — gleiche Methodik wie bei den erfolgreichen Mockup-Composites.

```
Step 1: Generiere AI-Backdrop:
"A warm-domestic editorial scene of a wooden desk surface with vintage brass
desk lamp, glass inkwell, fountain pen with wooden barrel, viewed from above
at a slight 30-degree angle. Soft directional light from upper-left, golden-hour.
Empty postcard-rectangle area in center-frame. Real-wall context. Cream and
deep walnut palette.
Negative: no postcards, no text, no readable typography, no hands, no faces."

Step 2: Im Pillow/Imagemagick die echten SILBE-Postkarten-PNGs (Rilke + Kafka +
Zweig Vorderseiten) als gestapelte Composite-Layer auf den Desk-Rectangle einsetzen.
Mit subtle Drop-Shadow (color: rgba(0,0,0,0.15), offset: 2px 4px, blur: 8px).

Aspect: 4:5 portrait
Output-Path: apps/silbe/public/werkstatt/triptych-2-postkarten-real.jpg
```

### 4.4 Bio-Kafka-Prag — neu (Authentizität-Issue)

**Problem:** Aktuelle `bio-kafka-prag.jpg` zeigt eher Wien-Style-Architektur (rote Dächer, Habsburg-Stil) als Prag.

**Re-Generation-Brief:**

```
"A view from a tall window in a Prague Old-Town apartment building, looking out
across the rooftops toward the Týn Cathedral spires. Late afternoon light, slightly
overcast. Distinctive Bohemian baroque architecture — multi-spired Gothic-baroque
churches in distance, terracotta roof tiles, white stucco walls with green shutters.
Old wooden window frame in foreground (slight blur). NO PEOPLE.
Negative: no Vienna-style architecture, no Habsburg domes, no faces."

Aspect: 4:5 portrait (matched zu anderen Bio-Photoshoots)
Output-Path: apps/silbe/public/stimmen/bio-kafka-prag-v2.jpg
```

### 4.5 Recommended Sprint-Reihenfolge

Wenn der Asset-Re-Generation-Sprint priorisiert werden muss:

1. **About-Triptych Bild 1+2** — höchste Priorität (Werkstatt-Page ist Conversion-relevant für Trust).
2. **Bio-Kafka-Prag-v2** — mittlere Priorität (nur Authentizität-Issue).
3. **Hero-Cinema-Variante** (16:10) — niedrige Priorität, aktuelle 4:5-Variante kann als Fallback dienen.

---

## 5. Agentic-Catalog-Optimierung (für UCP / ChatGPT / Copilot / Gemini)

Seit Q1 2026 sind Shopify-Stores via Storefront MCP (`/api/mcp`) und UCP (`/api/ucp/mcp`) für AI-Agents lesbar. Die Audit-Daten zeigen: 41% der Stores haben Produktdaten die zu branded sind und keine AI-Queries matchen. Damit SILBE bei "Welche Geschenke zum Mai für Literatur-Fans" oder "Posters mit Rilke-Zitaten" gefunden wird, müssen die Produktdaten **agent-readable** sein.

### 5.1 Produkt-Title-Pattern

```
{Autor-Vorname} {Autor-Nachname} · ›{Werk}‹ — {Format} ({Größe}) · SILBE
```

Beispiele:

| ❌ Aktuell (zu branded) | ✅ Agent-readable |
|---|---|
| `SILBE Rilke ›Geduld‹ — Goldrahmen-Edition` | `Rainer Maria Rilke · ›Briefe an einen jungen Dichter‹ — Kunstdruck Poster (A3) · SILBE` |
| `Kafka Axt Goldrahmen` | `Franz Kafka · ›Brief an Oskar Pollak‹ — Kunstdruck Poster (A3, gerahmt) · SILBE` |
| `Stempel-Sammler Bundle` | `SILBE Postkarten-Set — Drei literarische Klassiker (Rilke, Kafka, Zweig)` |

Faustregel: Title muss antworten "Was ist es?" + "Von wem?" + "Welches Format?" — bevor "SILBE" kommt.

### 5.2 Produkt-Description-Pattern

200–400 Wörter, structured. Erste 80 Wörter sind das, was AI-Agents als Snippet verwenden.

**Pflicht-Felder im ersten Absatz:**
- Was es ist: "Kunstdruck", "Poster", "Tote Bag", "Postkarten-Set"
- Größe: "Format A3 (29.7 × 42 cm)"
- Material: "Hochweißes Premium-Papier, 200 g/m², matt, säurefrei"
- Druck-Lokalität: "Gedruckt in der EU"
- Lieferzeit: "Versand 3–6 Werktage"
- Quelle: "›Briefe an einen jungen Dichter‹, Brief 4, 1903"

**Zweiter Absatz:** Editorial-Kontext (200–400 Wörter), aus dem MDX-Essay (siehe MEGAPROMPT.md §4) gepullt.

### 5.3 Shopify Metafields

Pflicht-Metafields für Agent-Readability (alle Namespace `silbe`):

| Key | Type | Wert | Zweck |
|---|---|---|---|
| `silbe.author_full_name` | single_line_text | "Rainer Maria Rilke" | Agent-Discovery |
| `silbe.author_handle` | single_line_text | "rilke" | Cross-Linking PDP→Stimmen |
| `silbe.work_title` | single_line_text | "Briefe an einen jungen Dichter" | Werk-Suche |
| `silbe.work_year` | number_integer | 1903 | Period-Filter |
| `silbe.quote_full` | multi_line_text | "Habe Geduld gegen alles Ungelöste in Ihrem Herzen." | Quote-Search |
| `silbe.format` | single_line_text | "A3" / "A2" / "A1" / "Postkarten-3er" / "Tote Bag" | Format-Filter |
| `silbe.dimensions_cm` | single_line_text | "29.7 × 42" | Size-Match |
| `silbe.paper_gsm` | number_integer | 200 | Material-Spec |
| `silbe.print_location` | single_line_text | "EU, überwiegend Deutschland" | Origin-Spec |
| `silbe.editorial_essay_handle` | single_line_text | "rilke-habe-geduld" | MDX-Verbindung |
| `silbe.themes` | json (array) | `["Sehnsucht", "Wien", "Geduld", "Brief", "Sprache"]` | 5–7 thematische Tags pro Quote |

Diese Metafields werden in der GraphQL-Query der PDP gepullt und sind via Storefront API für Agents lesbar.

### 5.4 Catalog-Health-Test

Jede Woche automatisiert via GitHub Action:

```bash
# Test ob Storefront MCP korrekte SILBE-Daten zurückgibt
curl -X POST https://z9xkt0-2v.myshopify.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","id":1,"params":{"name":"search_shop_catalog","arguments":{"query":"Rilke Poster Kunstdruck"}}}'
```

Expected: SILBE-Rilke-SKUs als top-3-Results. Wenn nicht: Catalog-Optimization-Sprint triggern.

### 5.5 OG-Tags pro Surface

Jede Page hat dynamische OG-Tags via `generateMetadata()` in Next.js:

- Homepage: `og-card-five-klassiker-A.png`
- PDP: pro Autor passende OG-Card (z.B. `og-card-rilke-A.png`)
- Bibliothek-Article: passende Editorial-OG-Card
- Stimmen-Detail: pro Autor passende OG-Card

---

## 6. Asset-Pflege & Versionierung

### Repo-Layout für Bundle-Imports

```
apps/silbe/public/
├── heroes/
│   └── hero-cinema-rilke-burgundy.jpg
├── products/                    ← echte SKU-Posters aus Brain importiert
│   ├── silbe-rilke-geduld-hero-burgundy.png
│   └── ...
├── mockups/                     ← live-candidate composites
│   ├── rilke-goldrahmen.jpg
│   └── ...
├── stimmen/                     ← bio-photoshoots
│   ├── rilke-worpswede.jpg
│   └── ...
├── werkstatt/                   ← about-triptych
│   ├── triptych-1-book-detail.jpg
│   ├── triptych-2-postkarten-real.jpg
│   └── triptych-3-olive-sprig.jpg
├── og/                          ← OG-Cards
│   ├── rilke.png
│   └── ...
├── brand/                       ← Wordmarks, Favicon, Email-Sig
│   ├── wordmark-ink.svg
│   ├── wordmark-cream.svg
│   ├── apple-touch-icon.png
│   └── favicon.ico
└── textures/                    ← SVG-Texturen
    ├── paper-grain.svg
    └── ...
```

### Optimierung beim Import

Alle Bundle-JPGs müssen vor dem Repo-Commit durch `next/image`-Pipeline. Concrete:

```bash
# AVIF + WebP Variants generieren
npx @squoosh/cli --avif '{"quality":75}' --webp '{"quality":85}' \
  apps/silbe/public/heroes/*.jpg apps/silbe/public/heroes/*.jpg

# Final: pro Bild liegen .jpg + .webp + .avif vor
# Next.js Image-Component wählt automatisch das beste Format
```

### Bundle-Import als Skript

```typescript
// apps/silbe/scripts/import-bundle.ts
// Liest /path/to/silbe-creatives-bundle/manifest.json
// Filtert nur status === 'live-candidate' oder 'polished'
// Kopiert in apps/silbe/public/ mit umbenanntem Filename
// Generiert AVIF + WebP-Varianten
// Schreibt apps/silbe/lib/asset-manifest.ts mit type-safe Asset-Map
```

Dieses Skript wird in Phase 0 des MEGAPROMPTS erstellt und einmalig ausgeführt.

---

## 7. Out-of-Scope (nicht im Asset-Bundle)

Diese Files leben im Brain-Repo `cowork/outputs/`, nicht im Creatives-Bundle. Müssen separat in das Headless-Repo importiert werden:

- **Echte SKU-Posters:** `cowork/outputs/sku-png-v3/silbe-*.png` — die canonical produktion-bereiten Poster-PNGs.
- **Print-Files:** `cowork/outputs/print-files-v3/silbe-*.pdf` — niemals im Frontend, nur für Gelato-Order-Files.
- **Author-Portraits:** `cowork/outputs/silbe-day5/author-portraits/*.jpg` — Wikimedia PD, mit Lizenz-Attribution.
- **Final Logos:** `cowork/outputs/logos-final/HOT 2 *.png`, `HOT 1 *.png` — Aleks-canonical Wordmarks und Stempel-Marks.
- **Favicon-Set:** `cowork/outputs/silbe-day5/favicon.ico`, `apple-touch-icon-{192,512}.png`.

In der Phase-0-Setup des MEGAPROMPTS ist ein expliziter Step "Brain-Asset-Import" vorgesehen.

---

## 8. Asset-Konsistenz-Tests (Build-Time)

Im Build wird automatisiert geprüft:

- [ ] Alle in `lib/asset-manifest.ts` referenzierten Files existieren in `public/`.
- [ ] Alle JPGs haben korrespondierende AVIF + WebP.
- [ ] Alle Author-Portrait-Files haben Lizenz-Attribution in `public/authors/_credits.json`.
- [ ] Keine deprecated Lasker-Schüler-Assets im Build (Mai 2026 archived).
- [ ] OG-Cards 1200×630, exakt.
- [ ] Hero-Image LCP ≤ 2.0s mobile, ≤ 1.2s desktop.
- [ ] Apple-Touch-Icon 180×180.
- [ ] Favicon im ico-Format vorhanden.

Test-Skript: `apps/silbe/scripts/asset-lint.ts` läuft in CI vor jedem Deploy.

---

## 9. Changelog

- **2026-05-07** — Initial lock. Konsolidiert aus Bundle-Manifest (178 Files, 54 MB) + Brain-Inventar + Site-Review-Findings + Research-Synthese. Re-Generation-Briefs für 3 schwache Assets (About-Triptych 1+2, Kafka-Prag) definiert. Agentic-Catalog-Optimierung als Pflicht-Sektion ergänzt.
