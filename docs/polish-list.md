# Polish List



Cosmetic, vocabulary, and UWG-cleanup items deliberately deferred from the

phase they were noticed in. Per project workflow: polish does not happen

mid-phase — it accumulates here and is addressed in dedicated polish sprints

(Phase 2.5, Phase 8 pre-cutover, etc.) so feature work stays bisectable.



Each entry: **owner**, **phase deferred from**, **gate** (which later phase

this must be resolved before), and the actual finding.



---



## Phase 0 deferrals



### Custom 404-Page mit SILBE-Branding



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

