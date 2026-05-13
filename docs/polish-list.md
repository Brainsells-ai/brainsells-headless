# Polish List



Cosmetic, vocabulary, and UWG-cleanup items deliberately deferred from the

phase they were noticed in. Per project workflow: polish does not happen

mid-phase — it accumulates here and is addressed in dedicated polish sprints

(Phase 2.5, Phase 8 pre-cutover, etc.) so feature work stays bisectable.



Each entry: **owner**, **phase deferred from**, **gate** (which later phase

this must be resolved before), and the actual finding.



---



## Phase 0 deferrals



### Custom 404-Page mit SILBE-Branding ✅ RESOLVED 2026-05-13 (Phase 6 P1, PR #18)



**Phase deferred from:** Phase 0 (war nie gebaut)

**Owner:** Tech / Aleks (Editorial-Copy)

**Gate:** Vor Phase 8 Cutover



Aktueller Stand: Next.js Default-404 (kahler Screen, "404 / This page could

not be found"). Bestätigt am 2026-05-11 unter /editionen/silbe-rilke-geduld-

hero-burgundy auf dem main-Deployment.



Erforderlich vor Cutover:

- `app/not-found.tsx` mit SILBE-Layout (Header + Footer + Brand-Tone)

- Editorial-Copy von Aleks (z.B. „Diese Edition existiert nicht — vielleicht

&#x20; suchen Sie in unserer Bibliothek?")

- Link zurück zu / oder /editionen (sobald letztere Route existiert)

- Brand-Tokens: Cream-Background, Cormorant Garamond für die 404-Zahl,

&#x20; Crimson Pro für den Body-Text

- 404-Status-Code beibehalten (kein soft-404 via 200 + leeres Rendering)



Triggerpunkte testen vor Cutover:

- /editionen/nicht-existierender-handle

- /editionen/{archived-voice-handle} (lasker-schueler, tucholsky)

- /bibliothek, /werkstatt, /stimmen (solange noch nicht implementiert)

- /warenkorb (vor Phase 4 Cart-Build)

- Beliebige Tippfehler-URLs



---



## Phase 1.5b deferrals



### Payload Production-Admin-Bootstrap automatisieren



**Phase deferred from:** Phase 1.5b

**Owner:** Tech

**Gate:** Vor Phase 8 Cutover



Production-Payload zeigt First-Run "Create your first user" weil

Bootstrap-Step keinen Admin-User automatisch anlegt. Manuell durchgeführt

am 2026-05-11 (Email: hello@brainsells.ai, Password im Password Manager).



Fix: `scripts/seed-payload-admin.ts` mit Env-Vars

`PAYLOAD_INITIAL_ADMIN_EMAIL` + `PAYLOAD_INITIAL_ADMIN_PASSWORD` (letzteres

als one-shot, gleich rotiert nach erster Verwendung). Skript läuft als

Step nach DB-Migration in CI/CD.



---



## Phase 2 carry-overs



### Section-Order Homepage



**Phase deferred from:** Phase 2

**Owner:** Aleks (Editorial)

**Gate:** Vor Phase 6 Polish



Aktuell: Hero → TrustBar → FeaturedEditions → FuenfStimmen → EditorialLetter

→ WerkstattTeaser → BibliothekTeaser.



Frage: locked oder swap? Möglicherweise will Aleks die Reihenfolge nochmal

reviewen — hängt mit Editorial-Strategie zusammen. Diskussion vor Phase 6.



### Footer-Wordmark Variant (HOT 2 Gold)



**Phase deferred from:** Phase 2

**Owner:** Aleks (Brand)

**Gate:** Polish-Sprint



Aktuell: HOT 2 Gold-Variante im Footer. Behalten als kanonische

Footer-Variante, oder retire (zurück zu typografischem Wordmark im

Footer für künftige Surfaces wie Marginalia)?



Empfehlung: behalten. Aleks's Logo-Identität ist wertvoll. Kein Blocker.



### SectionHeading Primitive-Extraktion



**Phase deferred from:** Phase 2 → Phase 3 review

**Owner:** Tech

**Gate:** Multi-Brand `packages/ui/` pull-out



Phase 3 hat CapsLabel extrahiert (9 Homepage usages → 1 Primitive). Bei

SectionHeading wurde bewusst NICHT extrahiert weil PDP und Homepage

Variants strukturell divergieren (PDP Detail-Panel headings sind kleiner

und non-italic). Erst bei Multi-Brand `packages/ui/` pull-out generalisieren.



---



## Phase 3 deferrals



### RSC-Prefetch 404er für unimplementierte Routes



**Phase deferred from:** Phase 3 (PR #11 Foundation)

**Owner:** Tech (Claude Code / Merlin)

**Gate:** Wird natürlich gelöst bei Implementation der Routes



5 Routes sind in Header/Footer verlinkt aber noch nicht implementiert:

/bibliothek, /werkstatt, /editionen, /warenkorb, /stimmen.

Next.js RSC-Prefetch versucht sie zu laden, bekommt 404. Plus aktive

"Alle Editionen ansehen"-Navigation führt zu 404.



Nicht als Squash-Merge-Blocker behandelt weil:

- PR #11 ist Foundation, nicht Route-Implementation

- Routes werden in Phase 3-5 sequenziell implementiert

- 404 ist kontrolliert (kein Crash, kein 500)



Selbst-auflösend wenn Phase 3 PDP-Route (/editionen/[handle]) + Phase 5

Listing-Route (/editionen) implementiert sind.



### PDP Multi-Variant "ab"-Preis-Display (PAngV)



**Phase deferred from:** Phase 3 (lib/shopify-queries.ts commit)

**Owner:** Tech (oder Aleks falls Editorial-Copy nötig)

**Gate:** Vor Phase 8 Cutover



Aktuelles Verhalten: SummaryProduct.priceRange.min wird ohne "ab"-Prefix

angezeigt. Multi-Variant-Editions (z.B. A3=39€, A2=59€) zeigen nur

"39,00 €". Das ist Phase-2-Verhalten, bewusst beibehalten in Phase 3.



Tech-Fix: SummaryProduct-Schema um priceRange.max erweitern,

FeaturedEditions/SimilarProducts/etc. nutzen Conditional:



&#x20;   {product.priceRange.min.amount === product.priceRange.max.amount

&#x20;     ? formatPrice(product.priceRange.min)

&#x20;     : `ab ${formatPrice(product.priceRange.min)}`}



Rechtliche Relevanz: PAngV-Compliance bei Preisangaben mit Variants.

In Verbraucherrechts-Grauzone wenn nur untere Grenze ohne "ab"-Prefix

angezeigt wird — sollte vor Cutover gefixt sein.



### Goldrahmen-Editionen — Products vs Variants



**Phase deferred from:** Phase 3 (check-variants.ts Diagnose)

**Owner:** Tech + Aleks (Catalog-Owner)

**Gate:** Phase 2.5 Cleanup oder vor Phase 8 Cutover



Aktueller Stand: silbe-rilke-geduld-hero-burgundy + silbe-rilke-geduld-

goldrahmen sind als separate Products in Shopify modelliert, obwohl sie

inhaltlich dieselbe Edition sind (gleicher Quote, gleicher Werk-Bezug).

Selbe Situation bei Mann-Einsamkeit.



Sauberere Architektur: 1 Product mit 2 Variants (Standard + Goldrahmen).

Editorial-Felder am Product, Format/Rahmen am Variant.



Migration ist nicht trivial — Editions müssen in Shopify Admin neu

strukturiert werden, alte Handles werden 404 (siehe nächstes Item).



### Legacy-SKU 404-Handling



**Phase deferred from:** Phase 3 (asset-mapping.md §2.3 Whitelist)

**Owner:** Tech

**Gate:** Vor Phase 8 Cutover



15 Legacy/Liquid-migration SKUs (rilke-a3-habegeduld, kafka-tote-milena, etc.)

sind aus der Phase-3-PDP-Whitelist (generateStaticParams) ausgeschlossen.

Sie existieren noch in Shopify, werden vom neuen Headless aber nicht

gerendert.



Vor Phase 8 Cutover muss entweder:

- (a) 301-Redirect-Map angelegt werden (alte Handles → neue canonical handles)

- (b) Archive-Page mit Brand-Tone für deprecated Editionen

- (c) Aleks entscheidet welche Legacy-SKUs in Shopify archiviert werden



Risk: alte Newsletter-Links und Kunden-Bookmarks brechen bei Cutover wenn

nichts davon gemacht wird.



### Bundles und Postkarten-Sets aus Phase 3 PDP ausgeklammert



**Phase deferred from:** Phase 3 (product_type-Discriminator im Manifest)

**Owner:** Tech (Implementation) + Aleks (UX-Konzept)

**Gate:** Phase 4



Aus CANONICAL_HANDLES filtered: 2 Bundles (bundle-goldrahmen-trio,

bundle-stempel-sammler) und 3 Postkarten-3er-Sets (rilke/kafka/zweig).



Phase 4 Tasks:

- Bundle-PDP-Template — Multi-Voice-Composition-Render-Pfad

- Postcard-Set-PDP-Template — Multi-Quote-Render-Pfad

- Filter-Logic in /editionen Listing (Phase 5) muss product_type

&#x20; berücksichtigen



### Brand-Asset Replacement (Liquid Theme silbe.at)



**Phase deferred from:** N/A (parallel zu Phase 3)

**Owner:** Aleks

**Gate:** Vor Phase 8 Cutover



KILL-markierte Assets aus Creative-Audit 2026-05-11:

- brand-social-avatar-1000.png (off-token, stale messaging)

- brand-email-signature-600.png (off-token, stale messaging)

- brand-apple-touch-180.png (off-token, stale messaging)



Bei Replacement: Liquid-Theme-References prüfen (Header-Logo,

Apple-Touch-Icon in theme.liquid head, OG-Default-Image in

theme.liquid Open Graph). In silbe.at-Theme, nicht in

brainsells-headless. Phase 8 Cutover muss alle drei vor DNS-Switch

verifizieren.



### Aspect-Ratio-Klärung PDP-Hero-Slot



**Phase deferred from:** N/A (Creative-Audit-Vorbereitung)

**Owner:** Tech + Aleks (Editorial)

**Gate:** Vor PDP-Component-Build (Phase 3 PDP-Implementation PR)



Asset-Inventur aus Creative-Audit 2026-05-11:

- Editorial-Heroes (Composite, polished): 2400×1920 = 5:4

- Poster-Renders: 2:3



Frage vor Hero-Component-Build: welche Ratio plant ihr für den

PDP-Hero-Slot?

- (a) 5:4 — Editorial-Composite ist Hero, Poster-Render geht in

&#x20; Gallery-Section weiter unten

- (b) 2:3 — Poster ist Hero, Editorial-Composite geht in

&#x20; Editorial-Essay-Section

- (c) Both via aspect-ratio prop am Slot — flexibel



Empfehlung aus Creative-Audit-Review: (a) weil Editorial-Composite die

Brand-Stimme trägt, Poster-Render ist Produkt-Detail nicht Hero-Aufgabe.



---



## Tooling / Repo-Hygiene



### Repository Remote URL Drift



**Phase deferred from:** Phase 3 (PR #11 push)

**Owner:** Tech (Merlin)

**Gate:** Wenn Zeit



Lokal: `git remote -v` zeigt alte Repo-URL. Push triggert

GitHub-Redirect-Warning ("This repository moved"). Funktional kein

Problem, kosmetischer Noise.



Fix:

&#x20;   git remote set-url origin https://github.com/Brainsells-ai/brainsells-headless.git



### PR-Title Naming Convention



**Phase deferred from:** Phase 3 (PR #11)

**Owner:** Tech

**Gate:** Beim Erstellen von PR #12



Aktueller PR #11 heißt "feat(silbe): phase-3 prep — metafield infra +

manifest + CapsLabel + shopify-queries". Pattern:



&#x20;   feat(silbe): phase-{N} {scope} — {surface list}



Geplant:

- PR #12: feat(silbe): phase-3 pdp components — EditorialEssays

&#x20; collection + product components

- PR #13: feat(silbe): phase-3 pdp route + tests



### Shopify App Cleanup



**Phase deferred from:** Phase 3 (Token-Setup-Drama)

**Owner:** Tech (Merlin)

**Gate:** Polish-Sprint



Drei Apps existieren im SILBE-Shopify-Store nach Token-Setup-Iterationen:

- SILBE Claude Code (CLI-App, 1 install — Aleks's ursprüngliche)

- SILBE Admin Operations (Dev-Dashboard CLI-App, 1 install — Token-Setup-Versuch)

- SILBE Admin Token (klassische Custom App falls angelegt — final

&#x20; funktionierende für Metafield-Seed)



Nach erfolgreicher Phase-3-Foundation sollten die nicht-genutzten Apps

deinstalliert werden. Vor Uninstall: verifizieren welche der Apps

tatsächlich produktiv genutzt werden (Storefront-Token vs Admin-Token).

### Multi-Blank-Line Cleanup in polish-list.md
- **Owner:** Tech
- **Deferred from:** Phase 3 session-close (2026-05-11)
- **Gate:** Polish-Sprint

### MockupCarousel — Multi-Image PDP Gallery
- **Owner:** Tech
- **Deferred from:** Phase 3 PDP day-2 DoD (2026-05-12)
- **Gate:** Phase-3.5 Polish oder Phase 6

PDP rendert nur Single featured-image im Hero. Multi-Image-Gallery (mehrere Composite-Mockups pro SKU mit Thumbnails / Carousel-Navigation) ist deferred — siehe Phase-3-Spec §3.3 MockupCarousel-Section für Original-Scope. Asset-mapping.md hat pro SKU 2-3 verfügbare Composites die ungenutzt bleiben.

### VariantSelector — A3/A2 Picker für Multi-Variant SKUs ✅ RESOLVED 2026-05-13 (Phase 6 P3, PR #20)
- **Owner:** Tech
- **Deferred from:** Phase 3 PDP day-2 DoD (2026-05-12)
- **Gate:** Phase 4 (Cart) — wenn Multi-Variant cart-add user-facing wird

3 Hero-SKUs sind Multi-Variant (Rilke-Geduld-Hero-Burgundy, Mann-Einsamkeit-Hero-Charcoal, Zweig-Memorial-Staubrose haben je A3 + A2). PDP rendert ohne Selector → User landet auf Standard-Variante (`variants[0]`, typischerweise A3 weil minVariantPrice). Add-to-Cart greift diese Standard-Variante. A2-Auswahl nicht möglich bis VariantSelector kommt.

### ProductJsonLd — Agentic-Discovery `<script type="application/ld+json">`
- **Owner:** Tech
- **Deferred from:** Phase 3 PDP day-2 DoD (2026-05-12)
- **Gate:** Phase 7 (Agentic-Catalog-Optimization) oder Phase 8 Cutover

Phase-3-Spec §3.4 Test 2 forderte JSON-LD-Product-Schema-Block für SEO + MCP/UCP-Agent-Read-Path. Deferred — PDP rendert ohne strukturierte-Daten-Block. SEO-Crawler (Google) sehen nur reguläre HTML; Storefront-MCP-Agents lesen direkt Storefront-API (kein PDP-Scrape nötig). JSON-LD-Block ergänzt Discoverability via Web-Search, wichtig vor Cutover.

### Hover-States für interaktive PDP-Elemente
- **Owner:** Tech
- **Deferred from:** Phase 3 PDP day-2 web-design-guidelines audit (2026-05-12)
- **Gate:** Polish-Sprint

Web Interface Guidelines fordern „Buttons/links need :hover state". Aktuell: AddToCartButton (inline-styled, kein hover), Breadcrumbs-Links (no color shift on hover), CrossLinks-Card-Links (no card-lift/underline/border-shift). Visual-Feedback fehlt komplett auf interaktiven PDP-Surfaces. Fix-Skizze: add `:hover` rules zu `.silbe-cart-button`, `.silbe-breadcrumb-link`, `.silbe-related-card-link` in globals.css. Konsistente Hover-Behavior pro Pattern.

### Touch-action manipulation auf interaktive Elemente
- **Owner:** Tech
- **Deferred from:** Phase 3 PDP day-2 web-design-guidelines audit (2026-05-12)
- **Gate:** Polish-Sprint

Web Interface Guidelines: `touch-action: manipulation` verhindert mobile-double-tap-zoom-delay. Aktuell nirgendwo gesetzt (PDP-Buttons, Header-Hamburger, etc.). Fix: globales selector `button, a, [role="button"] { touch-action: manipulation; }` oder explizit pro interaktivem Element.

### Pre-Seed PDP Hero rendert 0 h1 (a11y)
- **Owner:** Aleks (Editorial) + Tech
- **Deferred from:** Phase 3 PDP day-2 web-design-guidelines audit (2026-05-12)
- **Gate:** Wenn Aleks erste quote_full-Metafields seeded

Hero rendert `<h1>` nur wenn `silbe.quote_full` metafield gesetzt. Pre-seed: kein h1 auf der PDP → a11y-Violation („Headings hierarchical h1–h6" → page sollte exakt einen h1 haben). Self-resolving sobald Aleks die Quote-Texte byte-identisch zum Poster pro SKU seeded (~15 distinct TODOs in scripts/metafields-manifest.ts). Kein Code-Fix in Phase 3 — die fallback-Lösung („product.title als h1 wenn quote leer") würde editorial Marketing-Sprache als h1 setzen (vocab §5.1-konflikt).

### Brand-Token taupe-on-cream — Color-Contrast WCAG AA
- **Owner:** Aleks (Brand)
- **Deferred from:** Phase 3 PDP day-2 web-design-guidelines audit (2026-05-12)
- **Gate:** Vor Phase 8 Cutover

`var(--color-taupe)` `#8B7865` auf `var(--color-cream)` `#F2EBDB` hat Contrast-Ratio ~3.5:1. WCAG AA fordert 4.5:1 für normal-size text (<18pt) — fails. Betrifft alle CapsLabels (11px Inter), source-captions (15px Crimson italic), 13px price/caption-meta-text auf PDP + Homepage. Brand-Token-Level concern, nicht PDP-spezifisch. Aleks-Decision: taupe leicht abdunkeln (z.B. `#7A6B5A` für ratio 4.6:1), oder ausschließlich für >18pt/bold large-text-Kontexte einsetzen.

### EditorialEssays Postgres-Migration auf Production-DB pushen
- **Owner:** Tech
- **Deferred from:** Phase 3 PDP day-2 (2026-05-12)
- **Gate:** Vor Phase 8 Cutover (oder wenn Aleks erste essays seeden will)

Production-Railway-Postgres hat noch keine `editorial_essays` Tabelle. Lokal-Build überspringt das via try/catch in `getEditorialEssayBySlug` (returns null on DB error, console.warn loggt). PDP rendert „Editorial-Kontext folgt."-Placeholder statt Essay-Content. Vor Cutover: Payload-Migration auf Production pushen — manuell oder via Phase-1.5b-Bootstrap-Automation. Selbe Gate-Bedingung wie der Admin-User-Bootstrap.

### Payload `generate:types` fails on Node 25
- **Owner:** Tech
- **Deferred from:** Phase 3 PDP day-2 (2026-05-12)
- **Gate:** Phase 8 Cutover

Same upstream ESM-interop bug as Phase-1.5b seed-pages: `pnpm payload:generate-types` errors on `ERR_MODULE_NOT_FOUND` for collection imports without explicit `.ts` extensions under Node 25. `apps/silbe/payload-types.ts` never generated. Workaround: inline EditorialEssay type in `lib/payload-queries.ts` with `body: unknown` (lexical isn't a direct dep). Replace with `import type { EditorialEssay } from '../payload-types'` once Node 22 runtime path or upstream fix lands.

## Phase 4 deferrals

### Hero `formatPrice` → consume `components/cart/format.ts`
- **Owner:** Tech
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** Polish-Sprint

`components/cart/format.ts` exposes the locale-pinned `Intl.NumberFormat('de-DE', currency)` helper. `components/product/Hero.tsx` carries a byte-identical local copy. Refactor Hero to import the shared helper. Kept out of Phase-4 blast radius (atomic drawer commit); trivial follow-up.

### Playwright e2e suite for cart-drawer golden path
- **Owner:** Tech
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** Vor Phase 8 Cutover

Phase 4 shipped with `scripts/smoke-cart-api.ts` (live API round-trip) + a manual Playwright-MCP smoke (add → drawer → qty+ → Esc → reopen → Entfernen → empty-state). No formal `tests/e2e/cart.spec.ts` yet. Polish: codify the golden path + edge cases (CartUserError surfacing, expired-cart hydration, Vergriffen-line in cart, multi-line cart visual). Tag `@cart` and `@cart-a11y` (focus-trap, Esc, aria-modal verified by axe).

### Optimistic qty-update with rollback
- **Owner:** Tech
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** Polish-Sprint (or when perceived latency complaint surfaces)

Every cart mutation currently waits for the Shopify Storefront round-trip before the UI updates (typical 200–600ms). Polish: optimistic store update with rollback if Shopify throws `CartUserError` or network error. Subtle UX win; not required for Phase 4 DoD.

### Toast / inline error styling refinement
- **Owner:** Aleks (Editorial-Copy) + Tech
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** Polish-Sprint

Cart-store errors (`CartUserError`, network) currently surface as a hairline burgundy strip above the drawer footer with a `×` dismiss. Functional but minimal. Polish: editorial copy for the common cases (variant out-of-stock mid-add, cart expired during checkout, network down), considered surface design (toast vs inline vs banner), and a Klasse-2 vocab review.

### Hardcoded €39 free-ship threshold → config
- **Owner:** Tech (mit Aleks-Confirm für Werte)
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** Phase 5 (CH-Geo-Detection lands)

`components/cart/FreeShipBar.tsx` carries `const THRESHOLD = 39.0` as a literal. Phase-5 adds CH-€69 with geo-detection, so the threshold becomes a zone-keyed lookup. Move into `lib/constants/shipping.ts` (or similar) with `{ DE: 39, AT: 39, CH: 69 }` shape, and `SURFACE_COPY.free_shipping_threshold` canonical strings (was removed in Klasse-2 review per `scripts/metafields-manifest.ts` SURFACE_COPY comment — add back with the zone-keyed shape).

### `/warenkorb` route — placeholder cleanup
- **Owner:** Tech
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** Phase 5 (when `not-found.tsx` + custom 404 lands)

Phase 4 deprecates the `/warenkorb` route: checkout flow is drawer → Shopify-hosted checkout, no intermediate cart page. `CartIndicator` was the only link to `/warenkorb` and now opens the drawer instead. The route itself doesn't exist (returns Next default 404). Two options:
- (a) Add a `permanentRedirect('/')` route handler so any external bookmarks land on home (drawer can self-open if `?cart=open` query param wired).
- (b) Wire `/warenkorb` to render the EmptyCart-style page so users with the URL bookmarked still see editorial framing.

Either fine; (a) is one line, (b) is editorial polish. Resolves alongside the Custom-404 polish item from Phase 0.

### `framer-motion` drawer transition (only if CSS feels stiff)
- **Owner:** Tech
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** When real-device testing surfaces a complaint

Drawer uses a 320ms `cubic-bezier(0,0,0.2,1)` CSS `transform: translateX` transition. No animation library imported. If real-device QA (lower-end Android, older iOS) shows jank or the transition feels editorial-soft enough on desktop but flat on mobile, swap in framer-motion with spring physics. Keep CSS-only as the default to avoid bundle-size cost for a single component.

### Cart-line `availableForSale=false` — explicit removal nudge
- **Owner:** Aleks (Editorial-Copy) + Tech
- **Deferred from:** Phase 4 cart-drawer (2026-05-12)
- **Gate:** Polish-Sprint

When a variant goes out-of-stock while it sits in a customer's cart, `CartLineItem` shows the „Vergriffen" badge and disables the `+` button. Currently no explicit nudge to remove the line — the user can hit „Zur Kasse" with a Vergriffen line in the cart and Shopify checkout will reject it. Polish: inline copy „Diese Edition ist vergriffen — bitte entfernen, um fortzufahren." plus disable the „Zur Kasse" CTA when any line has `availableForSale === false`.



## Phase 5 — Header / Footer / Navigation (deferrals)

_Added 2026-05-12. Phase-5 ships Header trim, Footer 3-column refit, MobileDrawer restructure, Klaviyo newsletter wiring, /werkstatt → /ueber-uns rename + 301. The items below were scoped out._

### `/ueber-uns` — editorial pass
- **Owner:** Aleks (Editorial-Copy)
- **Deferred from:** Phase 5 (2026-05-12)
- **Gate:** Brand-Editorial-Sprint

Phase 5 ships `/ueber-uns` as a 2-paragraph stub. Final copy needs Aleks-editorial pass — origin story, Wien-Verortung, Editions-Begriff, evtl. ein Stimmen-Statement. Same Cormorant+Crimson typography as PDP. No images in scope yet.

### Rechtsseiten-Content (Impressum / AGB / Datenschutz / Widerrufsrecht / Widerrufsformular / Versand / Cookie-Einstellungen)
- **Owner:** Aleks + IT-Recht Kanzlei
- **Deferred from:** Phase 5 (2026-05-12)
- **Gate:** Legal-Sprint with IT-Recht Kanzlei

Footer + MobileDrawer linken auf 7 flach-strukturierte Rechtsrouten. Keine Routes physisch gebaut → 404 by design bis Legal-Sprint. Content kommt von IT-Recht Kanzlei (Phase-3-handoff polish-list §45). Pfade locked: `/impressum`, `/agb`, `/datenschutz`, `/widerrufsrecht`, `/widerrufsformular`, `/versand`, `/cookie-einstellungen`.

### Cookiebot Integration
- **Owner:** Tech
- **Deferred from:** Phase 5 (2026-05-12)
- **Gate:** Cookiebot-Sprint (separat von Klaviyo, separat von GA4)

Newsletter-Form sammelt Email via Klaviyo. Cookie-Banner + Consent-Management-Plattform kommt separat. Bis dahin: keine GA4, kein Meta Pixel, kein Loox-Tracking — nur die strikt funktional notwendigen First-Party-Cookies.

### Klaviyo Profile-Properties enrichment
- **Owner:** Tech
- **Deferred from:** Phase 5 (2026-05-12)
- **Gate:** Klaviyo-Polish-Sprint

`lib/klaviyo.ts` sendet aktuell nur `email` + `custom_source: silbe.at footer`. Polish: Landing-Page, UTM-Parameter, Referrer, Locale (de-AT vs de-DE) als Profile-Properties anhängen für spätere Segmentierung. Frontend-side: hidden form fields oder Server-Action-Args.

### Newsletter Anti-Spam (Honeypot / hCaptcha)
- **Owner:** Tech
- **Deferred from:** Phase 5 (2026-05-12)
- **Gate:** Wenn Klaviyo Spam-Subscribes meldet (List Hygiene)

`NewsletterForm` hat keinen Honeypot + kein hCaptcha. Klaviyo erkennt offensichtliche Bot-Subscribes selber, aber bei Volumen-Spam hilft ein Honeypot (versteckter Pflicht-Field, Bot füllt aus → reject) als billigste Defense.

### 301-Map vom alten Liquid-Theme
- **Owner:** Tech (mit SEO-Audit)
- **Deferred from:** Phase 5 (2026-05-12)
- **Gate:** Eigener Sprint vor DNS-Switch

Phase 5 fügt nur `/pages/ueber-uns → /ueber-uns` und `/werkstatt → /ueber-uns` als 308-Redirects ein. Komplette Map vom alten Liquid-Theme (alle `/pages/*`, `/blogs/journal/*`, `/products/*` → `/editionen/*`) muss vor DNS-Switch ausgearbeitet werden. Bestehende Redirects in `next.config.ts` Zeilen 14-23 sind nur ein Anfang.

### Listing-Routes `/stimmen` und `/bibliothek`
- **Owner:** Tech
- **Deferred from:** Phase 5 (2026-05-12)
- **Gate:** Phase 7+

MobileDrawer hatte vorher `/stimmen` (Sub-Menü mit 5 Autoren) + `/bibliothek` + `/werkstatt` + `/kontakt` in der Primary-Nav. Phase 5 trimmt das auf Editionen + Über uns. `/stimmen` und `/bibliothek` kommen mit Phase 7+ als eigene Listing-Routes mit Inhalt. Bis dahin: nicht verlinken.

---

## Phase 6 — `not-found` / `/editionen` / `VariantSelector` (deferrals)

_Added 2026-05-13. Phase-6 ships SILBE-branded `not-found.tsx` + `/[...notFound]` catch-all (PR #18), `/editionen` listing route + `getAllEditionsSummary()` (PR #19), and `VariantSelector` PDP island with A3/A2 picker + URL-state (PR #20). The items below were scoped out._

### VariantSelector deep-link hydration flash
- **Owner:** Tech
- **Deferred from:** Phase 6 (2026-05-13)
- **Gate:** Brand-Polish-Sprint oder vor Marketing-Push der per-Variant-URLs verlinkt

User die `/editionen/silbe-rilke-geduld-hero-burgundy?variant=A2` direkt öffnen (Marketing-Link, Bookmark, Share) sehen A3 (SSR-Fallback) für ~50–200 ms bevor Client-Hydration auf A2 swappt. `useSearchParams` ist client-only — SSR-Pfad weiß nicht welche Variant der User will. Eliminator: Cookie- oder Header-basierte Variant-Resolution + dynamic-PDP, würde aber die PDPs aus pure SSG pullen (Lighthouse-Hit). Akzeptable Interim-UX; sharable URLs work correctly nach Hydration.

### `formatPrice` Duplikation across 4 Callsites
- **Owner:** Tech
- **Deferred from:** Phase 6 (2026-05-13)
- **Gate:** Cleanup-Sprint (jederzeit, keine User-Impact)

Selbe `formatPrice(money)`-Funktion (Intl.NumberFormat 'de-DE' EUR, 2 Decimal-Digits) ist in `components/product/Hero.tsx`, `components/home/FeaturedEditions.tsx`, `app/(frontend)/editionen/page.tsx`, und `components/product/VariantSelector.tsx` dupliziert. Polish: nach `lib/format.ts` extract, alle 4 Callsites umstellen. Currency-Currency-Code würde aus Money kommen, ist heute überall EUR, also de-DE-Hardcode ist OK.

### Stale `.next/dev/types/validator.ts` über Branch-Switches
- **Owner:** Tech (oder Next.js-Upstream-Bug)
- **Deferred from:** Phase 6 (2026-05-13)
- **Gate:** Wenn Next.js-Turbopack Cache-Invalidation auf Branch-Switch fixt — sonst dauerhafter Workaround

Wenn man zwischen Branches mit unterschiedlichen Route-Sets switcht (z.B. P1-Branch mit `[...notFound]/page.tsx` vs P2-Branch ohne), persistiert `.next/dev/types/validator.ts` Phantom-References auf nicht-mehr-existente Files. Folge: `pnpm exec tsc --noEmit` und `pnpm build` failen mit `Cannot find module '../../../app/(frontend)/[...notFound]/page.js'`. Workaround: `Remove-Item -Recurse -Force '.next'` (PowerShell) oder `rm -rf .next` zwischen Branch-Switches. Polish-Lessen für nächste stacked-PR-Sprints.

### Variant-aware Metadata / OG / JSON-LD on PDP
- **Owner:** Tech
- **Deferred from:** Phase 6 (2026-05-13)
- **Gate:** SEO-Polish-Sprint oder vor Cutover (Phase 8)

`generateMetadata` in `app/(frontend)/editionen/[handle]/page.tsx` ignoriert `?variant=` — Title, Description, OG-Image sind product-level, nicht variant-level. Folge: Shared `?variant=A2`-URLs zeigen in Slack/WhatsApp/Twitter immer A3-Preview. Polish: searchParams in `generateMetadata` lesen + variant-spezifische Title-Suffix („A2") + variant-spezifisches Preis-Tag. JSON-LD ist eh noch deferred (Phase-3-polish-item).

### Multi-Option-Support beyond `Format`
- **Owner:** Tech
- **Deferred from:** Phase 6 (2026-05-13)
- **Gate:** Wenn ein Edition-SKU eine zweite Option kriegt (Color, Frame, Paper)

`VariantSelector.findFormatOption` ist hardcoded auf `o.name.toLowerCase() === 'format'`. Aktuell haben alle Multi-Variant-Editions nur die Format-Option (A3 / A2). Wenn z.B. Goldrahmen-Editions eine Frame-Color-Option kriegen (gold / silber), bräuchte der Selector eine Generalisierung: pro Option ein Fieldset rendern, URL-Param wird `?format=A3&color=gold` etc. Polish wenn der Bedarf real wird.

### ISR-Tagging für `/editionen` pro Edition
- **Owner:** Tech
- **Deferred from:** Phase 6 (2026-05-13)
- **Gate:** Wenn Catalog über ~50 Editionen wächst und full-flush zu teuer wird

`getAllEditionsSummary()` taggt mit `[SHOPIFY_TAGS.products]` — jeder Product-Update invalidiert die gesamte Listing-Cache. Bei 8 Editionen unproblematisch. Polish bei größerem Katalog: per-handle-tags emittieren damit nur die geänderte Edition den Listing-Cache invalidiert.

### `getFeaturedEditions()` returnt `formatOptions` ungenutzt auf Homepage
- **Owner:** Tech
- **Deferred from:** Phase 6 (2026-05-13)
- **Gate:** Wenn die Homepage Format-Hint zeigen soll — sonst nicht zwingend

`SummaryProduct.formatOptions` wurde in Phase 6 P2 zugefügt. `FeaturedEditions` konsumiert den Type und kriegt das Feld implizit, rendert aber keinen Format-Hint. Minimaler GraphQL-Payload-Overhead (4 Items × 1 Option-Liste). Kein Bug; entweder Homepage zeigt den Hint analog zum Listing, oder das Feld bleibt ungenutzt-aber-available auf der Homepage.
