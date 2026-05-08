# SILBE MEGAPROMPT — Build the Editorial Commerce Engine

**Status:** kanonisch — dies ist der vollständige Build-Plan für `apps/silbe/` im Brainsells-Headless-Mono-Repo.
**Stand:** 2026-05-07
**Für:** Claude Code als primärer Build-Agent · Merlin als Reviewer · Aleks als Editorial Owner.
**Ziel:** Eine editorial Commerce-Site auf State-of-the-Art-2026-Niveau, agent-readable, agent-deployable, agent-improvable. Wegweiser für künftige Brainsells-Brands.
**Begleit-Dokumente (Pflicht-Lektüre vor dem Build):**
1. `brand-tokens.md` — Farben, Typo, Spacing, Motion, Photography
2. `vocabulary.md` — Wortwahl, Tonalität, Verbote, deutsche Anführungszeichen
3. `asset-mapping.md` — Welcher Asset wo, was muss neu

---

## 0. Wie dieses Dokument zu lesen ist

Dieses Dokument ist in **neun Phasen** strukturiert (Phase 0.5 + Phase 0–8). Jede Phase hat:

- **Scope** — was in dieser Phase gebaut wird, klar abgegrenzt
- **Files-to-Create / Files-to-Edit** — exakte Pfade
- **Implementation-Brief** — die wichtigsten Code-Patterns
- **Acceptance-Tests** — wie geprüft wird ob Phase fertig ist (manuell + automatisiert)
- **Commit-Strategie** — pro Phase ein Git-Commit mit standardisierter Message

Phasen werden **strikt sequenziell** abgearbeitet. Niemals Phase 4 anfangen wenn Phase 3 nicht "done" ist. Done = alle Acceptance-Tests grün.

**Phase 0.5 ist Pflicht-Pre-Phase** und read-only — sie inventarisiert den existierenden Repo-Zustand, verifiziert Shopify-Scopes und Vercel Env Vars, ohne Code zu ändern. Das verhindert dass Claude Code in Phase 0 versehentlich bestehende Konfiguration überschreibt.

Phase-Trigger werden via Claude Code wie folgt aufgerufen:

```
"Run Phase {N}: {Phase Name}"
```

Claude Code liest die jeweilige Phase, führt aus, läuft Acceptance-Tests, committet. Bei Failure: HITL (Human-in-the-Loop) für Approval.

---

## 1. Architektur-Übersicht (Triadic Stack)

### 1.1 Die drei Schichten

```
┌──────────────────────────────────────────────────────────┐
│  Layer 3: FULFILLMENT + AGENT LAYER                       │
│  ├── Gelato REST API (orders, webhooks)                   │
│  └── Brainsells Brain (cowork/, sessions/, knowledge/)    │
└──────────────────────────────────────────────────────────┘
                          ▲
                          │ Webhooks + Events
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 2: CONTENT + FRONTEND ENGINE                       │
│  ├── Payload 3.0 (in /app/(payload), Local API)           │
│  └── Next.js 16 App Router (in /app/(storefront))         │
│      ├── Server Components first                          │
│      ├── Cart als Client-Insel (Zustand)                  │
│      └── ISR + SSG mit revalidate-Webhooks                │
└──────────────────────────────────────────────────────────┘
                          ▲
                          │ Storefront API (GraphQL) + MCP
                          ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 1: COMMERCE BACKEND                                │
│  ├── Shopify (z9xkt0-2v.myshopify.com)                    │
│  │   ├── Products, Variants, Inventory                    │
│  │   ├── Cart, Checkout, Customer Accounts                │
│  │   ├── Storefront MCP /api/mcp                          │
│  │   └── UCP /api/ucp/mcp (Agentic Storefronts)           │
│  └── Klaviyo (Newsletter, Transactional)                  │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Warum diese Architektur

- **Shopify bleibt unverletzt:** Cart, Checkout, Payment, Inventory — Shopify macht das alles besser als wir es in 2 Wochen bauen könnten.
- **Payload statt MDX:** Aleks bekommt einen visuellen Editor (Live Preview, Visual Editing). MDX-im-Repo wäre für eine technische Person akzeptabel, aber Aleks ist Editorial — er soll im Browser editieren, nicht im VS Code.
- **Payload 3.0 in Next.js /app:** Local API = direkter DB-Call ohne HTTP-Roundtrip. Bei jeder PDP wird parallel Shopify (für Preise/Inventory) und Payload (für Editorial-Essay, themen-Tags, Cross-Links) gequeried — beides auf dem gleichen Server, eine Codebase.
- **Server Components first:** Performance ist nicht-verhandelbar (Lighthouse ≥90 mobile). RSC reduziert JS-Bundle um 40-60%. Cart ist die einzige Client-Insel.
- **Agent-readable:** Drei Layer = drei Tool-API-Surfaces für Agents. Shopify Storefront MCP existiert schon. Payload Local API ist agent-aufrufbar via Next.js Server Actions. Gelato REST API ist agent-callable via Webhooks.

### 1.3 Tech-Stack final

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js | 16.2.x (App Router) |
| Runtime | React | 19.2.5+ (CVE-2026-23869 patched) |
| Language | TypeScript | 5.x strict |
| CMS | Payload | 3.x (latest) |
| Database | Postgres | via Neon (Vercel-managed) |
| Styling | Tailwind CSS | 4.x (CSS-first config) |
| Commerce | Shopify Storefront API | 2026-01 (latest stable) |
| Fulfillment | Gelato REST API | order.gelatoapis.com |
| Newsletter | Klaviyo | EU-region |
| Hosting | Vercel | Hobby/Pro |
| Repo | Turborepo (mono-repo) | latest |

### 1.4 Mono-Repo Struktur (final)

```
brainsells-headless/                    ← github.com/Brainsells-ai/brainsells-headless
├── apps/
│   └── silbe/
│       ├── app/
│       │   ├── (storefront)/           ← Public-facing pages (SSG/ISR)
│       │   │   ├── page.tsx            ← Homepage
│       │   │   ├── editionen/
│       │   │   ├── stimmen/
│       │   │   ├── bibliothek/
│       │   │   ├── werkstatt/
│       │   │   ├── kontakt/
│       │   │   └── (legal)/            ← Impressum, AGB, Datenschutz, Widerrufsrecht, Versand
│       │   ├── (payload)/              ← Payload Admin Panel (auto-generiert)
│       │   │   └── admin/
│       │   ├── api/
│       │   │   ├── revalidate/         ← Webhook Handler für Shopify + Payload
│       │   │   └── shopify/            ← Shopify Webhook Handler
│       │   ├── globals.css
│       │   └── layout.tsx              ← Root Layout (Header, Footer, Tokens)
│       ├── collections/                ← Payload Collections
│       │   ├── EditorialEssays.ts
│       │   ├── Authors.ts
│       │   ├── Werkstatt.ts
│       │   ├── Bibliothek.ts
│       │   └── Pages.ts
│       ├── components/
│       │   ├── ui/                     ← Buttons, Cards, Forms (token-based)
│       │   ├── product/                ← PDP-spezifisch
│       │   ├── editorial/              ← Bibliothek-spezifisch
│       │   └── layout/                 ← Header, Footer, Nav
│       ├── lib/
│       │   ├── tokens.ts               ← Brand-Tokens als TS (Mirror von brand-tokens.md)
│       │   ├── shopify.ts              ← Storefront API Client
│       │   ├── shopify-queries.ts      ← GraphQL Queries
│       │   ├── gelato.ts               ← Gelato API Client (Phase 7)
│       │   ├── asset-manifest.ts       ← type-safe Asset-Map (Phase 0)
│       │   └── content-lint.ts         ← Vocabulary Linter
│       ├── public/                     ← Static Assets (siehe asset-mapping.md §6)
│       ├── scripts/
│       │   ├── import-bundle.ts        ← Bundle → public/ Import
│       │   ├── asset-lint.ts           ← Asset-Konsistenz-Test
│       │   └── content-lint.ts         ← Vocabulary-Test
│       ├── tests/
│       │   ├── e2e/                    ← Playwright E2E
│       │   └── unit/                   ← Vitest Unit-Tests
│       ├── payload.config.ts           ← Payload Config (Database, Collections, Admin UI)
│       ├── next.config.ts              ← Next.js Config (remotePatterns, redirects)
│       ├── tailwind.config.ts          ← Tailwind 4 Config (token-driven)
│       ├── tsconfig.json
│       ├── package.json
│       └── lighthouse-budget.json      ← Performance-Budget (siehe brand-tokens.md §8)
├── packages/
│   ├── eslint-config/                  ← shared linting
│   └── typescript-config/              ← shared TS config
├── docs/                               ← diese Datei + Begleiter
│   ├── MEGAPROMPT.md
│   ├── brand-tokens.md
│   ├── vocabulary.md
│   └── asset-mapping.md
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 2. Globale Constraints (gelten für alle Phasen)

Diese Constraints sind nicht-verhandelbar. Wenn sie verletzt werden, schlägt CI fehl.

1. **Server Components first.** Jede Page-Komponente startet als Server Component. Client-Komponenten werden explizit als `'use client'` markiert und so klein wie möglich gehalten.
2. **Cart ist die einzige Client-Insel.** State-Management mit Zustand (`zustand@4.x`). Kein Redux, kein React Query.
3. **`prefers-reduced-motion: reduce` global respektieren.**
4. **`font-display: swap` Pflicht.**
5. **AVIF → WebP → JPEG via `next/image`.**
6. **Lighthouse Mobile Performance ≥ 90, Accessibility ≥ 95, SEO 100.** CI failed bei Verstoß.
7. **Keine Hardcoded Hex-Farben.** Alle Farben kommen aus `lib/tokens.ts` oder via CSS-Variable.
8. **TypeScript strict mode.** Kein `any` ohne `// eslint-disable-next-line` mit Begründung.
9. **Vocabulary-Lint im Build:** `scripts/content-lint.ts` läuft pre-commit + in CI. Build failed bei verbotenen Phrasen aus `vocabulary.md` §7.
10. **DSGVO-Compliance:** Cookiebot integration ist Pflicht. Newsletter-Form mit Datenschutz-Checkbox. Double-Opt-In via Klaviyo.

---

## 3. Pre-Flight Checks (vor Phase 0)

Vor dem Start des Builds müssen folgende Voraussetzungen erfüllt sein. Wenn nicht: HITL-Stop, Aleks/Merlin handlen.

### 3.1 Credentials verfügbar (in `.env.local` oder Vercel Env Variables)

```bash
# Shopify
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=z9xkt0-2v.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=...        # public, für Client
SHOPIFY_STOREFRONT_PRIVATE_TOKEN=...            # private, für Server Components
SHOPIFY_ADMIN_TOKEN=shpat_...                   # für Webhook-Setup, optional

# Payload
DATABASE_URI=postgres://user:pass@host/db        # Neon Connection String
PAYLOAD_SECRET=...                              # 32+ char random
PAYLOAD_PUBLIC_SERVER_URL=https://brainsells-headless.vercel.app

# Gelato (Phase 7)
GELATO_API_KEY=...
GELATO_WEBHOOK_SECRET=...

# Klaviyo (Phase 5)
KLAVIYO_PRIVATE_KEY=pk_...
KLAVIYO_PUBLIC_KEY=...

# Cookiebot
COOKIEBOT_DOMAIN_GROUP_ID=...
```

### 3.2 Externe Services bereit

- [ ] Shopify Custom-App existiert mit den Scopes aus dem Handover-Doc.
- [ ] Neon Postgres-Database angelegt (kostenloser Tier reicht für MVP).
- [ ] Vercel-Projekt verlinkt mit GitHub-Repo `Brainsells-ai/brainsells-headless`.
- [ ] silbe.at DNS noch nicht umgehängt (Liquid-Theme bleibt live während des Builds).
- [ ] Klaviyo-Account existiert, EU-Server.
- [ ] Cookiebot-Account existiert (oder Alternative wie Iubenda).

### 3.3 Brain-Assets verfügbar

Die canonical Production-Assets liegen im Brain-Repo unter `cowork/outputs/`. Vor Build muss ein lokaler Klon des Brain-Repos verfügbar sein:

```bash
git clone git@github.com:Brainsells-ai/brainsells-brain.git ~/brainsells-brain
```

Phase 0 importiert daraus.

### 3.4 Acceptance-Test Pre-Flight

```bash
# Test 1: Shopify Storefront API erreichbar
curl -X POST https://z9xkt0-2v.myshopify.com/api/2026-01/graphql.json \
  -H "X-Shopify-Storefront-Access-Token: $NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ shop { name } }"}'
# Expected: {"data":{"shop":{"name":"SILBE"}}}

# Test 2: Storefront MCP erreichbar (für Phase 8 Validation)
curl -X POST https://z9xkt0-2v.myshopify.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
# Expected: List of MCP tools

# Test 3: Neon Postgres erreichbar
psql $DATABASE_URI -c "SELECT version();"
# Expected: PostgreSQL 15+ banner
```

Wenn einer dieser Tests fehlschlägt: **STOP** und Setup fixen.

---

## PHASE 0.5 — Ist-Zustand & Verification (vor Phase 0)

**Goal:** Den existierenden Repo-Zustand respektieren, nichts versehentlich überschreiben, Lücken sauber identifizieren bevor Phase 0 startet.

**Wichtig für Claude Code:** Diese Phase ist **read-only** — kein Code wird geschrieben, keine Configs geändert. Es ist eine 15-Minuten-Inventur die danach klare Anweisungen für Phase 0 liefert.

### 0.5.1 Was bereits existiert (nicht neu erstellen)

Diese Dinge sind im Mai 2026 bereits aufgesetzt und müssen **respektiert, nicht ersetzt** werden:

#### Repository

- **GitHub:** `github.com/Brainsells-ai/brainsells-headless` existiert
- **Mono-Repo-Setup:** Turborepo ist konfiguriert (`turbo.json`, `pnpm-workspace.yaml` vorhanden)
- **Inhalt:** Next.js 16 Default-Scaffold in `apps/silbe/` + Turborepo-Skeleton
- **Status:** kein Custom-Code yet, nur Default-Page + Boilerplate

#### Vercel

- **Projekt verlinkt:** Auto-Deploy von `main`-Branch ist aktiv
- **Preview-URL:** `brainsells-headless.vercel.app` (oder vergleichbar)
- **Env Variables:** **teilweise gesetzt** — Liste muss verifiziert werden (siehe §0.5.4)
- **Custom Domain:** **NICHT angehängt** — `silbe.at` zeigt aktuell auf das alte Liquid-Theme (Shopify Online Store). Domain-Switch erfolgt explizit in Phase 8, nicht früher.

#### Shopify

- **Store:** `z9xkt0-2v.myshopify.com` (NICHT `silbe-shop` — das war ein 3-Stunden-Debug-Issue, der canonical Handle ist `z9xkt0-2v`)
- **Liquid-Theme:** läuft live unter `silbe.at`. Bleibt **unangetastet** während des Builds. Erst in Phase 8 wird es deaktiviert.
- **Custom-App für Storefront API:** existiert, aber **Scopes müssen verifiziert werden** (siehe §0.5.3)
- **Storefront API Token:** existiert, ist in Vercel Env Variables (möglicherweise nicht canonical-gepflegt)
- **Storefront MCP & UCP:** automatisch aktiv via Shopify (jeder Store hat `/api/mcp` und `/api/ucp/mcp` seit Q1 2026)

#### Brainsells Brain

- **Repo:** `github.com/Brainsells-ai/brainsells-brain` existiert mit ~130 MB Knowledge/Sessions/Cowork
- **Status:** lokal geklont auf Merlin's Maschine
- **Use:** wird in Phase 0 als Quelle für Brain-Asset-Import (sku-png-v3, logos-final, favicon, author-portraits) genutzt

#### Was NICHT existiert (muss in Phase 0 erstellt werden)

- Payload 3.0 — noch nicht installiert
- Neon Postgres — noch nicht angelegt
- Klaviyo Integration — noch nicht aufgesetzt
- Cookiebot — noch nicht aufgesetzt
- Gelato API — Webhook-Integration noch nicht aufgesetzt (das Liquid-Theme nutzt aktuell die Gelato-Shopify-App, das funktioniert weiter; die headless-Webhook-Integration kommt in Phase 7)
- Custom Components — alle noch zu schreiben

### 0.5.2 Repo-State Verification (Claude Code: read-only checks)

Bevor Phase 0 startet, führt Claude Code diese Inspektion durch und reportet:

```bash
# Im Repo-Root
cd ~/Developer/brainsells-headless

# Check 1: Mono-Repo-Struktur
ls -la
cat turbo.json | head -20
cat pnpm-workspace.yaml

# Check 2: Apps-Verzeichnis
ls apps/
ls apps/silbe/

# Check 3: Aktuelle Dependencies
cat apps/silbe/package.json

# Check 4: Was bereits an Code da ist
find apps/silbe/app -type f -name "*.tsx" -o -name "*.ts" 2>/dev/null
find apps/silbe -type f -name "*.config.*" -not -path "*/node_modules/*"

# Check 5: Git-State
git log --oneline -10
git status
git branch -a
```

**Erwartet:** Ein cleanes Default-Scaffold ohne Custom-Code. Wenn doch Custom-Files gefunden werden (z.B. Test-Components von Experimentier-Sessions): Claude Code listet sie und fragt vor dem Löschen.

### 0.5.3 Shopify Custom-App Scope-Verification

Die Custom-App existiert, aber die Scopes müssen geprüft werden. **Du (Merlin) machst das in der Shopify-Admin-UI**, nicht Claude Code. Anleitung:

#### Pflicht-Scopes für Storefront API (Phase 1-4)

Geh in Shopify Admin → Settings → Apps and sales channels → Develop apps → [eure App] → Configuration:

**Storefront API access scopes:**
- [ ] `unauthenticated_read_product_listings` — für `/editionen` Listing
- [ ] `unauthenticated_read_product_inventory` — für Verfügbarkeit/Vergriffen-States
- [ ] `unauthenticated_read_product_pickup_locations` — kann für später nützlich sein, optional
- [ ] `unauthenticated_read_product_tags` — für Filter
- [ ] `unauthenticated_read_collection_listings` — für "Featured" Collection auf Homepage
- [ ] `unauthenticated_read_metaobjects` — für Editorial-Metafields
- [ ] `unauthenticated_write_checkouts` — für Cart-Erstellung
- [ ] `unauthenticated_read_checkouts` — für Cart-State
- [ ] `unauthenticated_write_customers` — für Newsletter Sign-Up via Customer-Account (optional)

**Admin API access scopes (für Phase 7 Webhooks + Phase 8 Catalog-Optimization):**
- [ ] `read_products` — Produkt-Daten lesen
- [ ] `write_products` — für Phase-8 Catalog-Optimierung (Title-Pattern, Metafields)
- [ ] `read_orders` — für Phase-7 Gelato-Order-Push
- [ ] `read_customers` — für Order-Customer-Daten (Versand-Adresse → Gelato)
- [ ] `read_inventory` — optional, für künftige Inventory-Sync
- [ ] `write_inventory` — optional

**Webhooks (in Phase 7 nötig — für Phase 0 noch nicht aktivieren):**
- `products/update`, `products/create`, `orders/create`, `orders/cancelled`

#### Verification-Step (du, nicht Claude Code)

1. Logge in Shopify Admin ein
2. Settings → Apps and sales channels → Develop apps
3. Klick auf eure existierende Custom-App
4. Configuration tab → check ob alle Pflicht-Scopes oben angehakt sind
5. Wenn nicht: anhaken → "Save"
6. Wenn neue Scopes hinzugefügt: ein neuer Storefront-Token muss generiert werden (alter wird invalid sein)
7. API credentials tab → kopiere:
   - Storefront API access token (für `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`)
   - Admin API access token (für `SHOPIFY_ADMIN_TOKEN`, falls schon nicht in Vercel Env Vars)

#### Ergebnis dokumentieren

Nach Verification: schreib in `docs/setup-status.md` (das du selbst anlegst, nicht Claude Code):

```markdown
# Setup Status — 2026-XX-XX

## Shopify Custom-App
- App-Name: [name]
- Storefront-Scopes: alle gesetzt ✅ / fehlen: [list]
- Admin-Scopes: alle gesetzt ✅ / fehlen: [list]
- Token rotiert: ja/nein
- Datum der Verifikation: 2026-XX-XX

## Vercel Env Variables
[siehe §0.5.4]
```

### 0.5.4 Vercel Env Variables Verification

Du (Merlin) machst das via Vercel-Dashboard oder Vercel CLI. Claude Code hat keinen Zugriff.

#### Was muss in Vercel gesetzt sein vor Phase 0

```bash
# Pflicht für Phase 1+
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=z9xkt0-2v.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=...    # public, für Client-Seite
SHOPIFY_STOREFRONT_PRIVATE_TOKEN=...        # private, für Server-Komponenten (kann gleicher Wert sein wenn nicht separat erstellt)

# Pflicht ab Phase 0 (Payload-Setup)
DATABASE_URI=postgres://...                 # Neon Connection String — NEU, in Phase 0 anzulegen
PAYLOAD_SECRET=...                          # 32+ char random — NEU
PAYLOAD_PUBLIC_SERVER_URL=https://brainsells-headless.vercel.app

# Pflicht ab Phase 5 (Newsletter)
KLAVIYO_PRIVATE_KEY=pk_...
KLAVIYO_PUBLIC_KEY=...
KLAVIYO_LIST_ID_NEWSLETTER=...

# Pflicht ab Phase 6 (Cookiebot)
COOKIEBOT_DOMAIN_GROUP_ID=...

# Pflicht ab Phase 7 (Gelato)
GELATO_API_KEY=...
GELATO_WEBHOOK_SECRET=...

# Pflicht ab Phase 7 (Shopify Webhooks Verification)
SHOPIFY_WEBHOOK_SECRET=...                  # wird beim Webhook-Setup generiert

# Pflicht ab Phase 8 (Catalog-Optimization)
SHOPIFY_ADMIN_TOKEN=shpat_...
```

#### Verification (du, via Vercel-Dashboard)

1. Vercel-Dashboard → Project → Settings → Environment Variables
2. Liste durchgehen, abhaken was schon da ist
3. Was fehlt: erstmal aufschreiben, in der jeweiligen Phase nachholen
4. **Phase-0-Minimum:** alle `NEXT_PUBLIC_SHOPIFY_*` plus `DATABASE_URI` + `PAYLOAD_SECRET` müssen vor Phase 0 gesetzt sein
5. **Wichtig:** Vercel Env Variables haben drei Scopes (Production, Preview, Development). Setze alle in **alle drei Scopes** außer du hast einen Grund nicht.

#### Neon Postgres anlegen (vor Phase 0)

Falls noch nicht da:

1. neon.tech → Sign up (free tier reicht für MVP)
2. Create new project → Region: EU (Frankfurt empfohlen wegen DSGVO-Datenresidenz)
3. Database-Name: `silbe_payload` (oder ähnlich)
4. Connection String kopieren — **mit `?sslmode=require` am Ende**
5. In Vercel als `DATABASE_URI` setzen
6. `PAYLOAD_SECRET` generieren: `openssl rand -base64 32` → in Vercel setzen

### 0.5.5 Was Claude Code in Phase 0 NICHT tun soll

Damit kein bestehender State versehentlich zerstört wird:

- **Vercel-Konfiguration NICHT anfassen.** Env Variables sind dein Territory, nicht Claude Code's.
- **silbe.at Domain NICHT umhängen.** Das passiert explizit in Phase 8 mit deiner expliziten Approval.
- **Liquid-Theme in Shopify NICHT deaktivieren.** Bleibt live bis Phase 8.
- **Bestehende Branches NICHT löschen.** Nur in `phase-N-name` Branches arbeiten.
- **Brain-Repo NICHT bearbeiten.** Nur lesend zugreifen für Asset-Import. Hand-off-Memos schreibst du (Merlin) selbst nach jeder Phase ins Brain.
- **Shopify-Produkte NICHT mutieren.** Erst in Phase 8 mit dem Catalog-Optimization-Skript, und nur nach Dry-Run-Approval.

### 0.5.6 Phase-0.5 Verification (Pre-Flight Final Check)

Nach Abarbeiten von §0.5.2-§0.5.5 sollte folgendes erfüllt sein. Diese Liste ist die **harte Pre-Flight für Phase 0**:

- [ ] Repo geklont, Mono-Repo-Struktur verifiziert (Turborepo + Next.js Default in `apps/silbe/`)
- [ ] Shopify Custom-App Scopes verifiziert (alle Pflicht-Scopes aus §0.5.3 gesetzt)
- [ ] Storefront-Token in Vercel + lokaler `.env.local` gesetzt
- [ ] Neon Postgres-Database angelegt, Connection-String in Vercel
- [ ] `PAYLOAD_SECRET` generiert und in Vercel
- [ ] Brain-Repo lokal geklont und Pfad notiert
- [ ] `docs/setup-status.md` angelegt mit aktuellem Status
- [ ] Test 1 aus §3.4 läuft erfolgreich (Shopify Storefront API erreichbar)
- [ ] Test 3 aus §3.4 läuft erfolgreich (Neon Postgres erreichbar)

**Wenn alle Checks grün:** Phase 0 kann starten.

**Wenn Checks rot:** STOP, fixen, dann Phase 0.

### 0.5.7 Schätzung Zeitaufwand für Phase 0.5

- Repo-State Verification (Claude Code, automatisiert): 5 Min, ~2K Tokens
- Shopify Scope-Check (du, Shopify-UI): 15-20 Min
- Vercel Env Vars Audit (du, Vercel-Dashboard): 10-15 Min
- Neon Postgres anlegen (du, Neon-UI): 5-10 Min
- Setup-Status-Doc schreiben (du): 5 Min

**Total: 40-55 Minuten** — primär dein Aufwand, nicht Claude Code's. Das ist gut investiert weil Phase 0 dann ohne Surprises läuft.

---

## PHASE 0 — Setup & Foundation

**Goal:** Repo bereinigen, Tech-Stack installieren, Brand-Tokens als TS spiegeln, Asset-Bundle importieren.

**Branch:** `phase-0-setup`

### 0.1 Scope

- Test-Page (`app/test/`) löschen.
- `package.json` updaten: Payload 3.x, Tailwind 4.x, Zustand, Lucide-React, Sharp, etc.
- Tailwind 4 mit CSS-First-Config aufsetzen.
- `lib/tokens.ts` aus `brand-tokens.md` generieren.
- `next.config.ts` mit `remotePatterns` für Shopify CDN, Redirects vom alten Liquid-Theme.
- Bundle-Import-Skript erstellen und ausführen.
- Brain-Asset-Import (sku-png-v3, logos-final, favicon, author-portraits) durchführen.
- Vocabulary-Linter implementieren.

### 0.2 Files-to-Create / Files-to-Edit

```
EDIT:    apps/silbe/package.json           ← deps update
EDIT:    apps/silbe/next.config.ts         ← remotePatterns, redirects
DELETE:  apps/silbe/app/test/              ← cleanup
CREATE:  apps/silbe/lib/tokens.ts          ← TS-mirror von brand-tokens.md
CREATE:  apps/silbe/app/globals.css        ← @theme directive (Tailwind 4)
CREATE:  apps/silbe/tailwind.config.ts     ← minimal config (Tailwind 4 ist CSS-first)
CREATE:  apps/silbe/scripts/import-bundle.ts
CREATE:  apps/silbe/scripts/import-brain-assets.ts
CREATE:  apps/silbe/scripts/content-lint.ts
CREATE:  apps/silbe/lib/asset-manifest.ts  ← auto-generiert von import-bundle.ts
CREATE:  apps/silbe/.env.example
CREATE:  apps/silbe/lighthouse-budget.json
```

### 0.3 Implementation-Brief

#### `lib/tokens.ts`

```typescript
export const tokens = {
  colors: {
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
  },
  fonts: {
    serif: 'var(--font-cormorant), Georgia, serif',
    body: 'var(--font-crimson), Georgia, serif',
    sans: 'var(--font-inter), system-ui, sans-serif',
  },
  spacing: {
    1: '4px', 2: '8px', 3: '12px', 4: '16px',
    6: '24px', 8: '32px', 12: '48px', 16: '64px', 24: '96px',
  },
  containers: {
    prose: '640px',
    narrow: '720px',
    default: '1120px',
    wide: '1440px',
  },
  // ... siehe brand-tokens.md für alle Tokens
} as const;

export type Tokens = typeof tokens;
```

#### `app/globals.css` (Tailwind 4 CSS-First)

```css
@import "tailwindcss";

@theme {
  --color-cream: #F2EBDB;
  --color-ink: #1A1814;
  --color-burgundy: #5C1A1B;
  --color-sage: #9AA393;
  --color-taupe: #8B7865;
  --color-staubrose: #D4A894;
  --color-gold: #B8955C;
  --color-deep-olive: #4A5640;
  --color-soft-beige: #E8DCC7;
  --color-charcoal: #3A3835;

  --font-serif: var(--font-cormorant);
  --font-body: var(--font-crimson);
  --font-sans: var(--font-inter);

  --container-prose: 640px;
  --container-narrow: 720px;
  --container-default: 1120px;
  --container-wide: 1440px;
}

html {
  background-color: var(--color-cream);
  color: var(--color-ink);
  font-family: var(--font-body);
  font-size: 17px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  hyphens: auto;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### `next.config.ts`

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: 'images.silbe.at' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      { source: '/collections/alle-werke', destination: '/editionen', permanent: true },
      { source: '/blogs/journal/:slug*', destination: '/bibliothek/:slug*', permanent: true },
      { source: '/pages/ueber-uns', destination: '/werkstatt', permanent: true },
      { source: '/pages/autoren', destination: '/stimmen', permanent: true },
      { source: '/pages/widerruf', destination: '/widerrufsrecht', permanent: true },
      { source: '/pages/journal', destination: '/bibliothek', permanent: true },
    ];
  },
  // CVE-2026-23869 mitigation: pin React to patched version in package.json
};

export default nextConfig;
```

#### `package.json` Dependencies

```json
{
  "dependencies": {
    "next": "16.2.4",
    "react": "19.2.5",
    "react-dom": "19.2.5",
    "@shopify/storefront-api-client": "^1.0.10",
    "payload": "^3.0.0",
    "@payloadcms/db-postgres": "^3.0.0",
    "@payloadcms/richtext-lexical": "^3.0.0",
    "@payloadcms/next": "^3.0.0",
    "zustand": "^4.5.0",
    "lucide-react": "^0.383.0",
    "sharp": "^0.33.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "tailwindcss": "^4",
    "typescript": "^5",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/node": "^20",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "@playwright/test": "^1.45.0",
    "vitest": "^2.0.0",
    "lighthouse-ci": "^0.13.0"
  }
}
```

#### `scripts/import-bundle.ts`

Liest `manifest.json` aus dem Bundle, filtert auf `live-candidate` und `polished`, kopiert in `public/` mit standardisiertem Naming, generiert AVIF + WebP via Sharp, schreibt `lib/asset-manifest.ts`.

#### `scripts/content-lint.ts`

```typescript
// Liest alle .tsx/.mdx Files unter apps/silbe/
// Sucht nach verbotenen Phrasen aus vocabulary.md §7
// Exit Code 1 bei Fund

const FORBIDDEN_PHRASES = [
  'limitiert', 'Limited Edition', 'limited edition',
  'handgesetzt', 'handgedruckt', 'handnummeriert',
  'Mission-F', 'Mission-A', 'Mission-B', 'Mission-C',
  'Lorem ipsum', 'Pair text with an image',
  'Subscription', 'Cancellation Policy',
  'Buettenpapier', 'Büttenpapier',
  // ... siehe vocabulary.md §7
];

const REQUIRED_GERMAN_QUOTES = /„[^"]+"/;
const FORBIDDEN_US_QUOTES = /"[A-ZÄÖÜa-zäöüß]/;

// Walk through, scan, report.
```

### 0.4 Acceptance-Tests Phase 0

```bash
# Test 1: Build läuft ohne Errors
pnpm install
pnpm build
# Expected: Exit 0

# Test 2: Tokens sind in Tailwind verfügbar
echo "<div class='bg-cream text-ink'></div>" | pnpm tailwind --content stdin
# Expected: CSS rules with #F2EBDB and #1A1814

# Test 3: Bundle-Import erfolgreich
pnpm tsx scripts/import-bundle.ts
ls apps/silbe/public/mockups/ | wc -l
# Expected: 29+ files

# Test 4: Brain-Assets importiert
ls apps/silbe/public/products/ | wc -l
# Expected: 14+ SKU-Posters

# Test 5: Content-Linter funktioniert
echo "Limitierte Edition" > /tmp/test.tsx
pnpm tsx scripts/content-lint.ts /tmp/test.tsx
# Expected: Exit 1, Error: "limitiert" forbidden

# Test 6: Lighthouse-Budget definiert
cat apps/silbe/lighthouse-budget.json
# Expected: JSON with performance: 90, accessibility: 95
```

### 0.5 Commit

```bash
git add -A
git commit -m "feat(silbe): phase-0 setup — tokens, bundle import, content lint, redirects"
git push origin phase-0-setup
```

**HITL-Gate:** Vercel Preview-URL überprüfen. Wenn Homepage rendert (auch nur als Skeleton): Phase 0 ist done.

---

## PHASE 1 — Layout System (Header, Footer, Navigation)

**Goal:** Globales Layout, Header mit Navigation, Footer mit Manifest und Pflicht-Links, mobile Hamburger-Menü.

**Branch:** `phase-1-layout`

### 1.1 Scope

- Root Layout (`app/layout.tsx`) mit Tokens-Loading, Font-Preload, OG-Defaults.
- Header-Komponente: SILBE-Wordmark center, Hamburger left (mobile), Cart-Icon right.
- Footer-Komponente: Manifest-Paragraph, vier Spalten (Editionen / Stimmen / Werkstatt / Rechtliches), Newsletter-Form (UI-only, Logic in Phase 5).
- Mobile Drawer: Off-Canvas Hamburger-Menu mit Progressive-Disclosure für Stimmen.
- Cookie-Banner-Slot (Cookiebot Wire-up in Phase 6).

### 1.2 Files-to-Create

```
CREATE:  apps/silbe/app/layout.tsx
CREATE:  apps/silbe/components/layout/Header.tsx
CREATE:  apps/silbe/components/layout/Footer.tsx
CREATE:  apps/silbe/components/layout/MobileDrawer.tsx
CREATE:  apps/silbe/components/layout/Wordmark.tsx
CREATE:  apps/silbe/components/layout/CartIndicator.tsx       (Server Component, nur Counter, kein Drawer)
CREATE:  apps/silbe/components/ui/Button.tsx
CREATE:  apps/silbe/components/ui/HairlineDivider.tsx
```

### 1.3 Implementation-Brief

#### `app/layout.tsx`

```typescript
import type { Metadata } from 'next';
import { Cormorant_Garamond, Crimson_Pro, Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import './globals.css';

const cormorant = Cormorant_Garamond({
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-cormorant',
  display: 'swap',
});

const crimson = Crimson_Pro({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-crimson',
  display: 'swap',
});

const inter = Inter({
  weight: ['400', '500'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://silbe.at'),
  title: {
    default: 'SILBE — Editorial Klassiker für Lesende im deutschsprachigen Raum',
    template: '%s · SILBE',
  },
  description: 'Worte deutschsprachiger Klassiker als Kunstdrucke. Rilke, Kafka, Mann, Zweig, Ebner-Eschenbach. Hochweißes Premium-Papier 200 g/m², matt, säurefrei. Versand DE/AT 3–6 Werktage.',
  openGraph: {
    type: 'website',
    locale: 'de_AT',
    siteName: 'SILBE',
    images: [{ url: '/og/five-klassiker.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-AT" className={`${cormorant.variable} ${crimson.variable} ${inter.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

#### `components/layout/Header.tsx`

Sticky Header. Mobile: Hamburger left, Wordmark center, Cart right. Desktop: Wordmark left, Nav-Links center (Editionen / Stimmen / Bibliothek / Werkstatt), Cart right. Hairline-Border-Bottom statt Box-Shadow.

#### `components/layout/Footer.tsx`

Vier-Spalten-Layout (Desktop) / Stacked (Mobile):
- Spalte 1: Editionen (Links zu Kollektion, Bundles, Postkarten)
- Spalte 2: Stimmen (Links zu Autoren-Detail-Pages)
- Spalte 3: Werkstatt (Über uns, Bibliothek, Kontakt)
- Spalte 4: Rechtliches (Impressum, AGB, Datenschutz, Widerrufsrecht, Versand, Cookie-Einstellungen)

Unterhalb: Manifest-Paragraph (siehe `vocabulary.md` §9), Wordmark, Copyright "© 2026 SILBE · Wien · silbe.at · UID ATU83140245", Newsletter-Form-Slot.

### 1.4 Acceptance-Tests Phase 1

```bash
# Test 1: Lighthouse Performance ≥ 90 mobile bei leerer Page
pnpm lhci autorun --collect.url=https://localhost:3000
# Expected: Performance ≥ 90, Accessibility ≥ 95

# Test 2: Visual Regression — Mobile + Desktop Snapshot
pnpm playwright test --grep="layout snapshot"
# Expected: 0 visual diffs

# Test 3: Hamburger funktioniert auf Mobile
pnpm playwright test --grep="mobile drawer opens"
# Expected: Click hamburger → drawer slides in

# Test 4: Footer-Links zeigen auf korrekte Routes
pnpm playwright test --grep="footer links"
# Expected: /widerrufsrecht (NICHT /widerruf), /editionen (NICHT /collections/alle-werke)

# Test 5: Content-Linter findet kein verbotenes Wort
pnpm tsx scripts/content-lint.ts apps/silbe/components/
# Expected: Exit 0
```

### 1.5 Commit

```bash
git commit -m "feat(silbe): phase-1 layout — header, footer, mobile drawer, cookie-slot"
```

---

## PHASE 2 — Homepage

**Goal:** Hybrid Hero (Quote-LEFT + Composite-RIGHT), Trust-Bar, "Fünf Stimmen"-Sektion, Featured Editionen, Werkstatt-Teaser, Bibliothek-Teaser.

**Branch:** `phase-2-homepage`

### 2.1 Scope

- Server Component, alle Daten zur Build-Time fetched (Shopify Storefront API für Featured Products).
- ISR mit `revalidate: 3600` (stündlich revalidieren) — gepaart mit Webhook-Trigger bei Produkt-Updates.
- Dynamisches OG-Image basierend auf einem rotierenden Pool der Five-Klassiker-OG-Cards.
- Editorial-Letter-Sektion ("Warum fünf Stimmen — und nicht fünfzig.") aus Payload `Pages` Collection, nicht hardcoded.

### 2.2 Files-to-Create

```
CREATE:  apps/silbe/app/(storefront)/page.tsx           ← Homepage Server Component
CREATE:  apps/silbe/components/home/Hero.tsx
CREATE:  apps/silbe/components/home/TrustBar.tsx
CREATE:  apps/silbe/components/home/FuenfStimmen.tsx
CREATE:  apps/silbe/components/home/FeaturedEditions.tsx
CREATE:  apps/silbe/components/home/WerkstattTeaser.tsx
CREATE:  apps/silbe/components/home/BibliothekTeaser.tsx
CREATE:  apps/silbe/components/home/EditorialLetter.tsx
```

### 2.3 Implementation-Brief

#### Hero (Hybrid)

12-col Grid Desktop (5 LEFT + 7 RIGHT), stacked Mobile.

**LEFT (5/12):**
```
- Caps-Sub-Label "Editorial Klassiker · Wien" (Inter 11px tracking-wider taupe)
- Cormorant Italic Quote (clamp 44–96px) "„Habe Geduld gegen alles Ungelöste in Ihrem Herzen."
- Crimson Pro Italic Caption (13px) "Rainer Maria Rilke · ›Briefe an einen jungen Dichter‹ · 1903"
- Crimson Pro Tagline (15px line-height 1.6 max-width 360px)
  "Worte deutschsprachiger Klassiker als Kunstdrucke auf hochweißem Premiumpapier, gedruckt in der EU, versendet aus Wien."
- Button-Pair: Primary "Editionen ansehen" → /editionen, Tertiary "Bibliothek lesen →" → /bibliothek
```

**RIGHT (7/12):**
```
- Composite-Image: silbe-rilke-geduld-hero-burgundy-scene-A.jpg
- aspect-ratio 4:5, dark vignette, position: relative
- Bottom-right Caption (Inter 9px, 50% opacity cream) "Goldrahmen-Edition · Atelier Wien"
```

**Mobile (stacked):** Quote oben, Image darunter, CTA-Buttons in Quote-Sektion (vor Image).

#### Trust-Bar

Direkt unter Hero, 4 Spalten Desktop / 2×2 Mobile:
- "Hochweißes Premium-Papier · 200 g/m² · matt · säurefrei"
- "Gedruckt in der EU · überwiegend Deutschland"
- "Versand 3–6 Werktage · DE · AT · ab €39 frei"
- "Kuratiert in Wien · Per Hand · primärquellenverifiziert"

#### Fünf Stimmen

Section-Title "Die SILBE-Auswahl" (H2 Cormorant 36–52px).
Sub-Caption "Keine Beliebigkeit. Keine Trends. Fünf Autor:innen, deren Worte länger Bestand haben als jede Mode."

Liste der fünf Stimmen, jeweils:
- Initial-Letter R/K/M/Z/E in Cormorant 96pt
- Vollform-Name + Lebensdaten + Lebensorte
- Quote + Werkbezug
- Link "Mehr erfahren →" zu `/stimmen/{slug}`

CTA am Ende: "Alle Stimmen kennenlernen →" zu `/stimmen`.

#### Featured Editions

3-4 Produkt-Cards in Grid. Server-Side via Shopify Storefront API geladen:

```graphql
query FeaturedEditions {
  collection(handle: "featured") {
    products(first: 4) {
      nodes {
        id
        handle
        title
        priceRange { minVariantPrice { amount currencyCode } }
        featuredImage { url altText width height }
      }
    }
  }
}
```

Wenn keine `featured` Collection in Shopify existiert: Fallback auf `products(first: 4, sortKey: BEST_SELLING)`.

#### Werkstatt-Teaser

Drei-Spalten-Layout: Triptych mit `triptych-1-book-detail.jpg` + `triptych-2-postkarten-real.jpg` + `triptych-3-olive-sprig.jpg` (sobald 1+2 neu generiert sind — solange Fallback auf nur Bild 3 + Olivenzweig prominent).

Headline: "Editorial-Atelier in Wien". Sub-Headline: "Wir lesen jedes Zitat zur Quelle. Wir kuratieren jede Edition. Wir sind kein Druckatelier — wir sind ein Editorial-Atelier."

CTA: "In die Werkstatt →" zu `/werkstatt`.

#### Editorial Letter

Aus Payload `Pages` Collection, Slug `editorial-letter-homepage`. Lebt im Payload, nicht hardcoded — Aleks kann ohne Code-Change ändern.

#### Bibliothek-Teaser

Drei Article-Cards (typografisch, kein Hero-Image pro Card). Server-Side via Payload Local API geladen.

### 2.4 Acceptance-Tests Phase 2

```bash
# Test 1: Homepage rendert ohne Errors
pnpm dev
curl -s http://localhost:3000 | grep -q "SILBE"
# Expected: Title contains SILBE

# Test 2: LCP unter 2.0s mobile
pnpm lhci autorun --collect.url=https://[preview-url]
# Expected: Performance ≥ 90, LCP ≤ 2000ms

# Test 3: Hero-Composite lädt mit AVIF
curl -I "https://[preview-url]/_next/image?url=/mockups/rilke-burgundy.jpg&w=1280&q=75" -H "Accept: image/avif"
# Expected: Content-Type: image/avif

# Test 4: Featured Editions zeigen echte Shopify-Produkte
pnpm playwright test --grep="featured editions render"
# Expected: 4 product cards with prices in EUR

# Test 5: Vocabulary-Lint
pnpm tsx scripts/content-lint.ts apps/silbe/app/\(storefront\)/page.tsx apps/silbe/components/home/
# Expected: Exit 0

# Test 6: A11y — keine fehlenden Alt-Texts, keine fehlenden Labels
pnpm playwright test --grep="a11y homepage"
# Expected: 0 violations
```

### 2.5 Commit

```bash
git commit -m "feat(silbe): phase-2 homepage — hybrid hero, trust-bar, fünf stimmen, featured editions"
```

---

## PHASE 3 — PDP (Produkt-Detail-Page)

**Goal:** Editorial PDP mit Quote-Hero, Mockup-Carousel, 200–400 Wörter Editorial-Essay (aus Payload), Material-Specs, Cross-Links zu Autor + verwandte Editionen.

**Branch:** `phase-3-pdp`

### 3.1 Scope

- Dynamische Route `app/(storefront)/editionen/[handle]/page.tsx`
- Parallel-Fetch: Shopify (Produkt + Varianten + Preise) + Payload (Editorial-Essay + Themen-Tags + Cross-Links).
- Quote-Hero: Cormorant Italic 36-52px Quote + Quellen-Caption + Werk-Kontext.
- Mockup-Carousel: 2-3 Composites pro SKU (Goldrahmen-Setting, Lifestyle-Setting, Detail).
- Pricing + Variant-Selector (A3 / A2 / A1).
- "In den Warenkorb"-CTA → Cart Drawer (Phase 4).
- Editorial-Essay-Sektion (200–400 Wörter, aus Payload).
- Material-Specs-Box: Format, Dimensionen, Papier, Druck, Versand.
- Cross-Links: Autor-Profil + verwandte Editionen + Bibliothek-Article.
- 5–7 Themen-Tags (aus Payload `themes` Field).
- JSON-LD `Product` Schema für Agentic-Discovery (siehe §8.5).

### 3.2 Files-to-Create

```
CREATE:  apps/silbe/app/(storefront)/editionen/[handle]/page.tsx
CREATE:  apps/silbe/app/(storefront)/editionen/[handle]/loading.tsx
CREATE:  apps/silbe/components/product/QuoteHero.tsx
CREATE:  apps/silbe/components/product/MockupCarousel.tsx
CREATE:  apps/silbe/components/product/VariantSelector.tsx
CREATE:  apps/silbe/components/product/AddToCartButton.tsx
CREATE:  apps/silbe/components/product/EditorialEssay.tsx
CREATE:  apps/silbe/components/product/MaterialSpecs.tsx
CREATE:  apps/silbe/components/product/CrossLinks.tsx
CREATE:  apps/silbe/components/product/ThemeTags.tsx
CREATE:  apps/silbe/components/product/ProductJsonLd.tsx
CREATE:  apps/silbe/lib/shopify-queries.ts
```

### 3.3 Implementation-Brief

#### `app/(storefront)/editionen/[handle]/page.tsx`

```typescript
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/shopify-queries';
import { getEditorialEssay } from '@/lib/payload-queries';
import { QuoteHero } from '@/components/product/QuoteHero';
// ... weitere imports

export async function generateStaticParams() {
  // Alle Produkt-Handles aus Shopify holen
  const products = await getAllProductHandles();
  return products.map((handle) => ({ handle }));
}

export const revalidate = 3600;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const [product, essay] = await Promise.all([
    getProduct(handle),
    getEditorialEssay(handle),
  ]);

  if (!product) notFound();

  return (
    <>
      <QuoteHero product={product} essay={essay} />
      <MockupCarousel images={product.images} />
      <article className="container-narrow">
        <VariantSelector variants={product.variants} />
        <AddToCartButton product={product} />
        <EditorialEssay essay={essay} />
        <MaterialSpecs product={product} />
        <ThemeTags themes={product.themes} />
        <CrossLinks product={product} />
      </article>
      <ProductJsonLd product={product} essay={essay} />
    </>
  );
}

export async function generateMetadata({ params }) {
  const { handle } = await params;
  const product = await getProduct(handle);
  return {
    title: product.title,
    description: product.description.slice(0, 160),
    openGraph: {
      images: [`/og/products/${handle}.png`],
    },
  };
}
```

#### Quote-Hero

Above-the-Fold:
- Caps-Label "›{Werk}‹ · {Jahr}" (Inter 11px taupe tracking-wider)
- Cormorant Italic Quote (clamp 36–52px) — voll und ungekürzt
- Crimson Italic Source-Caption "Rainer Maria Rilke · ›Briefe an einen jungen Dichter‹ · Brief 4, 16.07.1903"
- 2 Sentences Editorial Lead aus Payload `essay.intro` (Crimson Pro 18px line-height 1.6 max-width 640px)

Background: `var(--color-cream)`.

#### Mockup-Carousel

Server-rendered, JS-progressive für Carousel-Logic. Zeigt 2-3 Mockup-Composites pro SKU. Auf Mobile: Single-Image + Swipe-Indicators. Auf Desktop: 2-Column-Layout mit Hauptbild + 2 Thumbnails.

Aspect Ratio: 4:5. Lazy-loading für alle nach dem ersten.

#### Variant-Selector

Format-Buttons: A3, A2, A1, oder bei Postkarten: 3er-Set, 6er-Set, etc.
Pro Variante: Preis dynamisch updated. State-Management via URL-Params (`?variant=...`), nicht Client-State — damit Sharing-Links die Variante mitgeben.

#### Add-to-Cart-Button

Ist die einzige Client-Komponente in der PDP. Nutzt Zustand-Cart-Store (siehe Phase 4). Optimistic-Update: Cart-Counter inkrementiert sofort, Sync mit Shopify Cart API im Hintergrund.

#### Editorial-Essay

Aus Payload Collection `EditorialEssays`, gefiltert auf `productHandle === handle`. Rich-Text-Rendering via Lexical (Payload's default Rich-Text-Engine).

Structure:
- Lead-Paragraph (große Crimson Pro 18px Italic)
- Body (Crimson Pro 17px)
- Pull-Quote in der Mitte (Cormorant Italic 28px, mit `@starting-style` reveal)
- Optional: Foto-Inset (z.B. Wikimedia-PD-Bild des Autors mit Lizenz-Caption)

Word-Count Target: 200–400. Linter prüft.

#### Material-Specs

Strukturierte Liste:
- Format · Dimension
- Papier (200 g/m² Premium matt säurefrei)
- Druck (EU, überwiegend Deutschland)
- Versand (3–6 Werktage DE/AT, ab €39 frei)
- Verpackung (Versandzylinder aus recyceltem Material)

Daten aus Shopify Metafields (siehe `asset-mapping.md` §5.3).

#### Cross-Links

Drei-Spalten-Block am Ende:
- Autor-Card → `/stimmen/{author-handle}`
- 2 verwandte Editionen aus selber Stimme
- Bibliothek-Article zum Werk → `/bibliothek/{essay-handle}`

#### Theme-Tags

5–7 thematische Tags am Ende der PDP (z.B. "Sehnsucht · Wien · Geduld · Brief · Sprache"). Nicht klickbar für Phase 1 — werden Phase 2 zu Filter-Routen verlinkt.

#### Product-JsonLd

```typescript
'use client'; // Für strukturierte Daten reicht Server-Side, aber `<script>` muss client-rendered für SEO.
// Tatsächlich: Server Component reicht, JSON-LD wird inline in HTML gerendert.

export function ProductJsonLd({ product, essay }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: essay?.intro || product.description,
    image: product.images.map(img => img.url),
    brand: { '@type': 'Brand', name: 'SILBE' },
    offers: {
      '@type': 'Offer',
      price: product.priceRange.minVariantPrice.amount,
      priceCurrency: product.priceRange.minVariantPrice.currencyCode,
      availability: 'https://schema.org/InStock',
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'Author', value: product.metafields.author_full_name },
      { '@type': 'PropertyValue', name: 'Work', value: product.metafields.work_title },
      { '@type': 'PropertyValue', name: 'Material', value: '200 g/m² Premium-Papier matt säurefrei' },
    ],
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
}
```

### 3.4 Acceptance-Tests Phase 3

```bash
# Test 1: PDP lädt für alle 14+ SKUs
for handle in $(pnpm tsx scripts/list-shopify-handles.ts); do
  curl -s "http://localhost:3000/editionen/$handle" | grep -q "$handle" || echo "FAIL: $handle"
done
# Expected: 0 FAIL

# Test 2: JSON-LD valid
pnpm playwright test --grep="json-ld validates"
# Expected: schema.org Product valid

# Test 3: Editorial Essay renders aus Payload
pnpm playwright test --grep="editorial essay loaded from payload"
# Expected: 200+ words rendered

# Test 4: Variant-Selector funktioniert (URL-Param)
pnpm playwright test --grep="variant selector updates url"
# Expected: ?variant=A2 changes price

# Test 5: Vocabulary-Lint
pnpm tsx scripts/content-lint.ts
# Expected: Exit 0

# Test 6: Lighthouse PDP ≥ 90 mobile
pnpm lhci autorun --collect.url=https://[preview]/editionen/silbe-rilke-geduld-hero-burgundy
# Expected: Performance ≥ 90
```

### 3.5 Commit

```bash
git commit -m "feat(silbe): phase-3 pdp — quote hero, mockup carousel, editorial essay, json-ld"
```

---

## PHASE 4 — Cart & Checkout-Redirect

**Goal:** Cart-Drawer (Client-Insel mit Zustand), Add/Remove/Update, Shopify Cart API Sync, Checkout-Redirect zur Shopify Checkout.

**Branch:** `phase-4-cart`

### 4.1 Scope

- Zustand Cart-Store (`stores/cart.ts`).
- Cart-Drawer-Komponente: Slide-In von rechts, Items mit Bild + Title + Quantity + Preis, Subtotal, "Zur Kasse"-Button.
- Sync mit Shopify Cart via Storefront API (`cartCreate`, `cartLinesAdd`, `cartLinesRemove`, `cartLinesUpdate`).
- LocalStorage-Persistence der Cart-ID (damit Refresh die Cart erhält).
- Optimistic-Updates: UI updates instant, Server-Sync im Hintergrund mit Rollback bei Failure.
- Empty-State: Cream-Background, kleines Icon, "Ihre Auswahl ist noch leer", CTA "Editionen ansehen".
- "Zur Kasse" → Shopify Checkout-URL (z.B. `https://z9xkt0-2v.myshopify.com/checkouts/...`).

### 4.2 Files-to-Create

```
CREATE:  apps/silbe/stores/cart.ts                    (Zustand store)
CREATE:  apps/silbe/components/cart/CartDrawer.tsx    ('use client')
CREATE:  apps/silbe/components/cart/CartLine.tsx
CREATE:  apps/silbe/components/cart/CartIndicator.tsx (replaces Phase 1 stub)
CREATE:  apps/silbe/lib/cart.ts                       (Shopify Cart API wrapper)
EDIT:    apps/silbe/components/product/AddToCartButton.tsx
```

### 4.3 Implementation-Brief

#### Cart Store

```typescript
// stores/cart.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { shopifyCartCreate, shopifyCartLinesAdd, /* ... */ } from '@/lib/cart';

interface CartLine {
  id: string;
  variantId: string;
  productHandle: string;
  title: string;
  quantity: number;
  price: { amount: string; currencyCode: string };
  image: { url: string; altText: string };
}

interface CartStore {
  cartId: string | null;
  lines: CartLine[];
  isOpen: boolean;
  add: (variantId: string, quantity?: number) => Promise<void>;
  remove: (lineId: string) => Promise<void>;
  updateQuantity: (lineId: string, quantity: number) => Promise<void>;
  open: () => void;
  close: () => void;
  getCheckoutUrl: () => string | null;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      cartId: null,
      lines: [],
      isOpen: false,
      // ... implementation mit Shopify Cart API
    }),
    { name: 'silbe-cart' }
  )
);
```

#### Cart-Drawer

Slide-in von rechts, max-width 480px, full-height. Cream-Background, Hairline-Border-Left.

Inhalt:
- Header: "Ihre Auswahl" + Close-Button
- Lines: pro Item ein `CartLine` (Bild 80×100, Title + Quote + Format, Quantity-Stepper, Preis, Remove-Link)
- Footer: Subtotal, Shipping-Hint ("Versand 3–6 Werktage · ab €39 frei"), "Zur Kasse"-Button (Primary)
- Empty-State wenn `lines.length === 0`

`@starting-style` für Slide-In-Animation. `prefers-reduced-motion` respect.

### 4.4 Acceptance-Tests Phase 4

```bash
# Test 1: Add to Cart funktioniert
pnpm playwright test --grep="add to cart"
# Expected: Cart-Indicator zeigt 1, Drawer öffnet, Line erscheint

# Test 2: Persistence über Refresh
pnpm playwright test --grep="cart persists on refresh"
# Expected: Nach Refresh ist Cart-Inhalt noch da

# Test 3: Checkout-URL zeigt auf Shopify Checkout
pnpm playwright test --grep="checkout redirects to shopify"
# Expected: URL beginnt mit https://z9xkt0-2v.myshopify.com/checkouts/

# Test 4: Empty-State
pnpm playwright test --grep="cart empty state"
# Expected: "Ihre Auswahl ist noch leer" Text

# Test 5: Optimistic Updates
pnpm playwright test --grep="cart optimistic update"
# Expected: UI updates < 100ms, server sync < 500ms
```

### 4.5 Commit

```bash
git commit -m "feat(silbe): phase-4 cart — drawer, zustand store, shopify cart sync, checkout redirect"
```

---

## PHASE 5 — Stimmen, Bibliothek, Werkstatt (Editorial Surfaces)

**Goal:** Drei Editorial-Pages mit Payload-Daten, plus Newsletter-Form (Klaviyo).

**Branch:** `phase-5-editorial`

### 5.1 Scope

- `/stimmen` — Hub mit fünf Autoren-Cards (aus Payload `Authors` Collection).
- `/stimmen/[slug]` — Autor-Detail mit Bio (50–150 Wörter), Lebensorte, Werke, "Editionen mit dieser Stimme".
- `/bibliothek` — Aesop-Library-Pattern: 8 kuratierte Tiles, Kicker + Headline, kein Feed.
- `/bibliothek/[slug]` — Editorial-Article (Rich-Text aus Payload, 600–1200 Wörter).
- `/werkstatt` — Über uns / Editorial-Atelier, Triptych-Hero, Manifest, Kontakt-Teaser.
- Newsletter-Form mit Klaviyo Sign-Up (POST → Klaviyo API), Double-Opt-In Flow.

### 5.2 Files-to-Create

```
CREATE:  apps/silbe/app/(storefront)/stimmen/page.tsx
CREATE:  apps/silbe/app/(storefront)/stimmen/[slug]/page.tsx
CREATE:  apps/silbe/app/(storefront)/bibliothek/page.tsx
CREATE:  apps/silbe/app/(storefront)/bibliothek/[slug]/page.tsx
CREATE:  apps/silbe/app/(storefront)/werkstatt/page.tsx
CREATE:  apps/silbe/components/editorial/AuthorCard.tsx
CREATE:  apps/silbe/components/editorial/ArticleCard.tsx
CREATE:  apps/silbe/components/editorial/RichTextRenderer.tsx
CREATE:  apps/silbe/components/forms/NewsletterForm.tsx ('use client')
CREATE:  apps/silbe/lib/klaviyo.ts
CREATE:  apps/silbe/app/api/newsletter/subscribe/route.ts (Server Action wrapper)
```

### 5.3 Implementation-Brief

#### `/stimmen`

Hub mit fünf Cards. Jede Card: Initial-Letter (Cormorant 96pt) + Vollform-Name + Lebensdaten + Lebensorte + Hauptwerk-Bezug + Quote + Link.

Section-Title: "Fünf Werke. Fünf Welten."
Sub-Caption: "Keine Beliebigkeit. Keine Trends. Fünf Autor:innen, deren Worte länger Bestand haben als jede Mode."

#### `/stimmen/[slug]`

Pro Autor:
- Hero: Bio-Atmosphären-Photoshoot (4:5 portrait) + Caps-Label + Vollform-Name + Lebensdaten
- Lead-Paragraph (50–150 Wörter Editorial-Bio aus Payload `Authors`)
- Werke-Liste mit Werkbezug pro Werk
- "Editionen mit dieser Stimme" — Cards der zugehörigen Produkte (Cross-Query Shopify)
- Optional: Bibliothek-Articles zu diesem Autor

#### `/bibliothek`

Aesop-Library-Pattern. 8 kuratierte Tiles in 2-Spalten-Grid (Desktop) / Stacked (Mobile).

Pro Tile:
- Kicker (Inter 11px taupe tracking-wider): Kategorie ("Werkstatt-Notizen", "Stimmen", "Lesestoff", "Editorial")
- Headline (Cormorant 28–36px): Article-Title (Sentence-Case)
- Kein Hero-Image pro Tile (typografisch)
- Date + Reading-Time
- Hover: subtle Underline-Reveal auf Headline

Keine Pagination. 8 Tiles maximum. Curation, not feed.

#### `/bibliothek/[slug]`

Long-Form Editorial-Article. Rich-Text aus Payload (Lexical), gerendert via custom RichTextRenderer.

Layout:
- Hero-Image (16:9 oben)
- Article-Title (Cormorant 36–52px, mobile-first scaled)
- Meta-Bar (Date · Author · Reading-Time)
- Body (max-width 640px, Crimson Pro 17px line-height 1.7)
- Pull-Quotes (Cormorant Italic 28px, im Body eingebettet via Lexical-Block)
- Sources/Footnotes (am Ende, Inter 13px)
- Cross-Links: 2 verwandte Editionen + 1 verwandter Article

#### `/werkstatt`

Über-uns. Editorial-Atelier-Erzählung.

Sections:
- Hero: Triptych (3 Bilder, siehe asset-mapping.md §2.6)
- Manifest: Sechs Punkte aus Master-Playbook (1. Quellenstrenge · 2. Edition · 3. Druckqualität · 4. Langsamkeit · 5. Wien)
- "Wer wir sind": Aleks-Story (kurz, 100–200 Wörter, du-Form an die Leserin)
- Kontakt-Teaser: "Schreiben Sie uns: hallo@silbe.at" mit Brief-Icon

#### Newsletter-Form

Float-Label-UI. Email-Input + Submit-Button. Datenschutz-Checkbox sichtbar VOR Submit.

Server Action:
```typescript
// app/api/newsletter/subscribe/route.ts
export async function POST(request: Request) {
  const { email } = await request.json();
  await klaviyoSubscribe(email, 'Briefe-von-SILBE');
  return Response.json({ success: true });
}
```

Klaviyo wird in Double-Opt-In Mode konfiguriert. User bekommt Confirmation-Mail, klickt Link, ist erst dann subscribed.

### 5.4 Acceptance-Tests Phase 5

```bash
# Test 1: /stimmen rendert 5 Authors
pnpm playwright test --grep="stimmen page shows 5 authors"
# Expected: 5 Cards (Rilke, Kafka, Mann, Zweig, Ebner-Eschenbach)

# Test 2: Bibliothek-Article rendert Rich-Text
pnpm playwright test --grep="bibliothek article renders"
# Expected: 600+ words, pull quote present

# Test 3: Werkstatt zeigt Triptych
pnpm playwright test --grep="werkstatt triptych"
# Expected: 3 images visible

# Test 4: Newsletter-Form sendet zu Klaviyo
pnpm playwright test --grep="newsletter subscribe"
# Expected: 200 response, confirmation-email triggered

# Test 5: Vocabulary-Lint passt
pnpm tsx scripts/content-lint.ts apps/silbe/app/\(storefront\)/stimmen/ apps/silbe/app/\(storefront\)/bibliothek/ apps/silbe/app/\(storefront\)/werkstatt/
# Expected: Exit 0

# Test 6: A11y für Editorial-Long-Form
pnpm playwright test --grep="a11y bibliothek"
# Expected: 0 violations (semantic HTML, alt-texts, lang attribute)
```

### 5.5 Commit

```bash
git commit -m "feat(silbe): phase-5 editorial — stimmen, bibliothek, werkstatt, newsletter"
```

---

## PHASE 6 — Legal, SEO, Compliance

**Goal:** Pflicht-Pages, Cookiebot, GA4, Meta Pixel, JSON-LD Site-wide, Sitemap, Robots.

**Branch:** `phase-6-legal`

### 6.1 Scope

- Sieben Legal-Pages aus Payload `Pages` Collection (Impressum, AGB, Datenschutz, Widerrufsrecht, Widerrufsformular, Versand, Cookie-Einstellungen).
- Cookiebot Integration (Custom Pixel via Shopify Customer Events oder direkt im Layout).
- GA4 + Meta Pixel via Cookiebot (consent-gated).
- Dynamische Sitemap.xml + robots.txt.
- `<Organization>` JSON-LD im Root-Layout.
- 301-Redirects sind bereits in next.config.ts (Phase 0).
- DSGVO-Hinweise im Kontaktformular.

### 6.2 Files-to-Create

```
CREATE:  apps/silbe/app/(storefront)/(legal)/impressum/page.tsx
CREATE:  apps/silbe/app/(storefront)/(legal)/agb/page.tsx
CREATE:  apps/silbe/app/(storefront)/(legal)/datenschutz/page.tsx
CREATE:  apps/silbe/app/(storefront)/(legal)/widerrufsrecht/page.tsx
CREATE:  apps/silbe/app/(storefront)/(legal)/widerrufsformular/page.tsx
CREATE:  apps/silbe/app/(storefront)/(legal)/versand/page.tsx
CREATE:  apps/silbe/app/(storefront)/(legal)/cookie-einstellungen/page.tsx
CREATE:  apps/silbe/app/(storefront)/kontakt/page.tsx
CREATE:  apps/silbe/app/sitemap.ts
CREATE:  apps/silbe/app/robots.ts
CREATE:  apps/silbe/components/seo/OrganizationJsonLd.tsx
CREATE:  apps/silbe/components/forms/ContactForm.tsx
CREATE:  apps/silbe/components/cookies/CookiebotScript.tsx
```

### 6.3 Implementation-Brief

Legal-Pages: Generic Template mit Title + Date-Stand + Long-Form-Body aus Payload. Aleks pflegt Inhalte direkt im Payload-Admin.

Cookiebot:
```typescript
// In app/layout.tsx, vor allen anderen Scripts
<Script
  id="Cookiebot"
  src="https://consent.cookiebot.com/uc.js"
  data-cbid={process.env.COOKIEBOT_DOMAIN_GROUP_ID}
  data-blockingmode="auto"
  strategy="beforeInteractive"
/>
```

GA4 + Meta Pixel werden via Cookiebot CMP gegated. Erst nach Consent geladen.

#### Sitemap.ts

```typescript
import { MetadataRoute } from 'next';
import { getAllProducts, getAllArticles, getAllAuthors } from '@/lib/...';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getAllProducts();
  const articles = await getAllArticles();
  const authors = await getAllAuthors();

  return [
    { url: 'https://silbe.at', lastModified: new Date(), priority: 1.0 },
    { url: 'https://silbe.at/editionen', priority: 0.9 },
    { url: 'https://silbe.at/stimmen', priority: 0.8 },
    { url: 'https://silbe.at/bibliothek', priority: 0.8 },
    { url: 'https://silbe.at/werkstatt', priority: 0.7 },
    ...products.map(p => ({ url: `https://silbe.at/editionen/${p.handle}`, priority: 0.8 })),
    ...articles.map(a => ({ url: `https://silbe.at/bibliothek/${a.slug}`, priority: 0.7 })),
    ...authors.map(a => ({ url: `https://silbe.at/stimmen/${a.slug}`, priority: 0.7 })),
  ];
}
```

#### Organization JSON-LD

```typescript
// In app/layout.tsx
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SILBE',
  url: 'https://silbe.at',
  logo: 'https://silbe.at/brand/wordmark.svg',
  description: 'Editorial Klassiker für Lesende im deutschsprachigen Raum',
  founder: { '@type': 'Person', name: 'Aleksandar Nestorović' },
  address: { '@type': 'PostalAddress', addressLocality: 'Wien', addressCountry: 'AT' },
  email: 'hallo@silbe.at',
  vatID: 'ATU83140245',
};
```

### 6.4 Acceptance-Tests Phase 6

```bash
# Test 1: Alle 7 Legal-Pages erreichbar
for page in impressum agb datenschutz widerrufsrecht widerrufsformular versand cookie-einstellungen; do
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/$page" | grep -q "200" || echo "FAIL: /$page"
done

# Test 2: Cookiebot lädt
pnpm playwright test --grep="cookiebot loads"
# Expected: Cookie-Banner erscheint beim ersten Besuch

# Test 3: Sitemap.xml valid
curl -s http://localhost:3000/sitemap.xml | xmllint --noout -
# Expected: Exit 0 (valid XML)

# Test 4: robots.txt
curl -s http://localhost:3000/robots.txt | grep -q "Sitemap:"
# Expected: Match

# Test 5: Lighthouse SEO 100
pnpm lhci autorun --collect.url=http://localhost:3000
# Expected: SEO = 100

# Test 6: 301-Redirects funktionieren
curl -I -L http://localhost:3000/collections/alle-werke | grep "Location:" | grep -q "/editionen"
# Expected: Match
```

### 6.5 Commit

```bash
git commit -m "feat(silbe): phase-6 legal — pages, cookiebot, sitemap, json-ld, redirects"
```

---

## PHASE 7 — Agent Layer, Fulfillment-Adapter-Pattern & Automations

**Goal:** Webhook-Infrastruktur, **Provider-agnostisches Fulfillment-Adapter-Pattern** mit Gelato als erste Implementation, Brain-Sync, Agent-Toolbox für künftige Auto-Improvement.

**Branch:** `phase-7-agents`

### 7.0 Architektur-Entscheidung: Adapter-Pattern für Fulfillment

Die Brainsells-Multi-Brand-Vision verlangt dass Layer 3 (Fulfillment) **swappable** ist. SILBE läuft heute auf Gelato (Print-on-Demand). Künftige Brands werden ggf. andere Provider nutzen:

| Brand-Szenario | Fulfillment-Provider |
|---|---|
| SILBE — heute | Gelato (PoD, weltweit lokale Druckpartner) |
| SILBE — zukünftig (limitierte Bütten-Editionen) | Eigenes Lager Wien (manueller Versand) |
| Marginalia — Russische Klassiker | Printful (besseres Hardcover-Catalog) |
| Lifestyle-Brand mit physischem Inventar | Eigenes Lager / 3PL-Partner |
| B2B-Distrelec-Style-Dropshipping | Direkter Lieferanten-Push |

**Konsequenz:** Phase 7 implementiert Gelato NICHT als direkte Integration, sondern als **erste Implementation eines `FulfillmentProvider` Interfaces**. Jeder zukünftige Provider ist dann 1-2 Tage Arbeit (neue Class implementieren), nicht 1-2 Wochen Refactor.

**Provider-Selection-Mechanismus:**

1. Pro Brand eine `config/brand.ts` mit `defaultFulfillmentProvider` und `enabledProviders`.
2. Pro Shopify-Produkt ein optionales Metafield `silbe.fulfillment_provider` (overrided Brand-Default — z.B. für Hybrid-Setups wo manche SKUs PoD und andere aus eigenem Lager kommen).
3. Order-Router schaut pro Line-Item welcher Provider zuständig ist und ruft den richtigen Adapter auf.

Das ist marginal mehr Aufwand in Phase 7 (~1 Stunde Claude-Code-Zeit), spart aber bei jedem zukünftigen Provider Tage. ROI ist eindeutig.

### 7.1 Scope

- **Fulfillment-Adapter-Pattern:** `FulfillmentProvider` Interface, `GelatoProvider` als erste Implementation, `Router` für Provider-Selection, `MockProvider` für Tests.
- **Brand-Config:** `apps/silbe/config/brand.ts` mit Default-Provider und Provider-spezifischen Settings.
- **Webhook-Endpoints für Shopify:** `products/update` → ISR-Revalidate, `orders/create` → Provider-Router → Provider.createOrder, `orders/cancelled` → Provider.cancelOrder.
- **Provider-Webhook-Handler:** `/api/webhooks/fulfillment/[provider]` als generic Endpoint, dispatcht zu passendem Adapter (heute nur Gelato).
- **Order-Status-Tracking:** bei Status-Change (Production → Shipped → Delivered), update Brain mit Order-Status, optional Email-Trigger via Klaviyo.
- **Brain-Sync-Hook:** nach jedem Deploy einen Eintrag in `cowork/sessions/{date}/silbe-deploy-{hash}.md`.
- **Agent-Toolbox-Documentation:** README-Section "How to extend with new fulfillment providers" mit konkretem Step-by-Step für Claude Code.

### 7.2 Files-to-Create

```
# Fulfillment-Adapter-Pattern (NEU — die Adapter-Erweiterung)
CREATE:  apps/silbe/lib/fulfillment/types.ts                 ← Interface + Types
CREATE:  apps/silbe/lib/fulfillment/router.ts                ← Provider-Selection
CREATE:  apps/silbe/lib/fulfillment/registry.ts              ← Provider-Registry
CREATE:  apps/silbe/lib/fulfillment/normalize.ts             ← Shopify-Order → NormalizedOrder
CREATE:  apps/silbe/lib/fulfillment/providers/gelato.ts      ← Erste Implementation
CREATE:  apps/silbe/lib/fulfillment/providers/mock.ts        ← Test-Provider für CI
CREATE:  apps/silbe/config/brand.ts                          ← Brand-spezifische Config

# Webhook-Infrastruktur
CREATE:  apps/silbe/app/api/webhooks/shopify/route.ts
CREATE:  apps/silbe/app/api/webhooks/fulfillment/[provider]/route.ts  ← provider-agnostisch
CREATE:  apps/silbe/app/api/revalidate/route.ts

# Brain-Sync + Setup-Scripts
CREATE:  apps/silbe/lib/brain-sync.ts
CREATE:  apps/silbe/scripts/setup-shopify-webhooks.ts
CREATE:  apps/silbe/scripts/setup-fulfillment-webhooks.ts    ← provider-agnostisch

# Agent-Toolbox
CREATE:  apps/silbe/agents/README.md
CREATE:  apps/silbe/agents/auto-essay.md
CREATE:  apps/silbe/agents/asset-regen.md
CREATE:  apps/silbe/agents/seo-audit.md
CREATE:  apps/silbe/agents/add-fulfillment-provider.md       ← Anleitung für neue Provider

# Tests
CREATE:  apps/silbe/tests/fulfillment/adapter-contract.test.ts  ← jeder Provider muss diesen Test bestehen
CREATE:  apps/silbe/tests/fulfillment/router.test.ts
CREATE:  apps/silbe/tests/fulfillment/gelato.test.ts
```

### 7.3 Implementation-Brief

#### Fulfillment Provider Interface

Das Herzstück der Adapter-Erweiterung. Jeder Provider muss diesem Interface entsprechen:

```typescript
// lib/fulfillment/types.ts

export interface NormalizedOrder {
  id: string;                      // Provider-agnostic order id (Shopify Order GID)
  reference: string;               // Human-readable Reference (z.B. "#1042")
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    country: string;     // ISO 3166-1 alpha-2
    state?: string;
  };
  items: Array<{
    sku: string;
    productHandle: string;
    quantity: number;
    metadata: Record<string, unknown>; // Provider-spezifische Hints (z.B. printFileUrl)
  }>;
  currency: string;       // ISO 4217
  totalAmount: number;
}

export interface FulfillmentResponse {
  providerOrderId: string;
  status: 'created' | 'queued' | 'failed';
  estimatedDelivery?: string;
  raw: unknown;           // Provider-specific raw response für Debugging
}

export interface OrderStatus {
  providerOrderId: string;
  status: 'created' | 'in_production' | 'shipped' | 'delivered' | 'cancelled' | 'failed';
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  events: Array<{
    timestamp: string;
    status: string;
    note?: string;
  }>;
}

export interface WebhookResult {
  providerOrderId: string;
  newStatus: OrderStatus['status'];
  shouldNotifyCustomer: boolean;
}

export interface FulfillmentProvider {
  /** Stable identifier (z.B. "gelato", "printful", "warehouse-vienna") */
  readonly name: string;

  /** Verifiziert ob ein Webhook-Payload echt vom Provider kommt */
  verifyWebhook(payload: string, headers: Headers): boolean;

  /** Erstellt eine Order beim Provider */
  createOrder(order: NormalizedOrder): Promise<FulfillmentResponse>;

  /** Cancelt eine Order falls möglich (vor Production) */
  cancelOrder(providerOrderId: string): Promise<void>;

  /** Polled aktuellen Status (für Dashboard, Cron, Reconciliation) */
  getStatus(providerOrderId: string): Promise<OrderStatus>;

  /** Parsed einen Provider-Webhook in einheitliches Format */
  handleWebhook(payload: unknown): Promise<WebhookResult>;
}
```

#### Brand-Config

```typescript
// config/brand.ts

import type { FulfillmentProvider } from '@/lib/fulfillment/types';

export const brandConfig = {
  name: 'SILBE',
  domain: 'silbe.at',
  shopifyStoreDomain: 'z9xkt0-2v.myshopify.com',

  fulfillment: {
    /** Default-Provider wenn ein Produkt kein silbe.fulfillment_provider Metafield hat */
    defaultProvider: 'gelato' as const,

    /** Welche Provider sind in dieser Brand erlaubt — Allowlist */
    enabledProviders: ['gelato'] as const,

    /** Provider-spezifische Configs */
    providers: {
      gelato: {
        apiBaseUrl: 'https://order.gelatoapis.com',
        webhookEndpoint: '/api/webhooks/fulfillment/gelato',
        defaultShipmentMethod: 'normal',
      },
      // Phase 2 (zukünftig): printful, warehouse-vienna, etc.
    },
  },

  newsletter: {
    provider: 'klaviyo' as const,
    listIdEnv: 'KLAVIYO_LIST_ID_NEWSLETTER',
  },

  cookieConsent: {
    provider: 'cookiebot' as const,
  },
} as const;

export type BrandConfig = typeof brandConfig;
```

#### Provider-Registry & Router

```typescript
// lib/fulfillment/registry.ts
import type { FulfillmentProvider } from './types';
import { GelatoProvider } from './providers/gelato';
import { MockProvider } from './providers/mock';

const providers: Record<string, FulfillmentProvider> = {
  gelato: new GelatoProvider(),
  mock: new MockProvider(),
  // Phase 2: printful: new PrintfulProvider(), etc.
};

export function getProvider(name: string): FulfillmentProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown fulfillment provider: ${name}`);
  }
  return provider;
}

export function listProviders(): string[] {
  return Object.keys(providers);
}
```

```typescript
// lib/fulfillment/router.ts
import { brandConfig } from '@/config/brand';
import { getProvider } from './registry';
import type { FulfillmentProvider, NormalizedOrder } from './types';

/**
 * Wählt den passenden Provider für ein Line-Item basierend auf:
 * 1. Per-Produkt Metafield silbe.fulfillment_provider (höchste Priorität)
 * 2. Brand-Default aus brandConfig
 */
export function getProviderForItem(
  item: NormalizedOrder['items'][number]
): FulfillmentProvider {
  const explicitProvider = item.metadata.fulfillmentProvider as string | undefined;
  const providerName = explicitProvider ?? brandConfig.fulfillment.defaultProvider;

  if (!brandConfig.fulfillment.enabledProviders.includes(providerName as never)) {
    throw new Error(
      `Provider "${providerName}" not enabled for brand "${brandConfig.name}". ` +
      `Enabled: ${brandConfig.fulfillment.enabledProviders.join(', ')}`
    );
  }

  return getProvider(providerName);
}

/**
 * Gruppiert Order-Items nach Provider und dispatcht parallel.
 * Wenn ein Order Items für 2+ Provider hat (Hybrid-Setup), werden
 * mehrere Provider-Orders erstellt — eine pro Provider.
 */
export async function routeOrder(order: NormalizedOrder) {
  const itemsByProvider = new Map<string, typeof order.items>();

  for (const item of order.items) {
    const provider = getProviderForItem(item);
    const existing = itemsByProvider.get(provider.name) ?? [];
    itemsByProvider.set(provider.name, [...existing, item]);
  }

  const results = await Promise.allSettled(
    [...itemsByProvider.entries()].map(([providerName, items]) => {
      const provider = getProvider(providerName);
      return provider.createOrder({ ...order, items });
    })
  );

  return results;
}
```

#### Gelato Provider (erste Implementation)

```typescript
// lib/fulfillment/providers/gelato.ts
import type {
  FulfillmentProvider,
  NormalizedOrder,
  FulfillmentResponse,
  OrderStatus,
  WebhookResult,
} from '../types';
import { brandConfig } from '@/config/brand';
import { brainSync } from '@/lib/brain-sync';
import crypto from 'crypto';

export class GelatoProvider implements FulfillmentProvider {
  readonly name = 'gelato';

  verifyWebhook(payload: string, headers: Headers): boolean {
    const signature = headers.get('x-gelato-signature');
    const secret = process.env.GELATO_WEBHOOK_SECRET;
    if (!signature || !secret) return false;

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  async createOrder(order: NormalizedOrder): Promise<FulfillmentResponse> {
    const config = brandConfig.fulfillment.providers.gelato;

    const items = order.items.map(item => ({
      itemReferenceId: `${order.id}-${item.sku}`,
      productUid: this.mapSkuToGelatoProductUid(item.sku),
      fileUrl: item.metadata.printFileUrl as string,
      quantity: item.quantity,
    }));

    const response = await fetch(`${config.apiBaseUrl}/v4/orders`, {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.GELATO_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderReferenceId: order.reference,
        customerReferenceId: order.customer.email,
        currency: order.currency,
        shipmentMethodUid: config.defaultShipmentMethod,
        shippingAddress: {
          firstName: order.customer.firstName,
          lastName: order.customer.lastName,
          email: order.customer.email,
          addressLine1: order.shippingAddress.line1,
          addressLine2: order.shippingAddress.line2,
          city: order.shippingAddress.city,
          postCode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
          state: order.shippingAddress.state,
        },
        items,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      await brainSync({
        type: 'fulfillment-provider-error',
        provider: this.name,
        order,
        error: errorText,
      });
      throw new Error(`Gelato order creation failed: ${errorText}`);
    }

    const data = await response.json();
    return {
      providerOrderId: data.id,
      status: 'created',
      estimatedDelivery: data.estimatedDeliveryDate,
      raw: data,
    };
  }

  async cancelOrder(providerOrderId: string): Promise<void> {
    const config = brandConfig.fulfillment.providers.gelato;
    const response = await fetch(
      `${config.apiBaseUrl}/v4/orders/${providerOrderId}:cancel`,
      {
        method: 'POST',
        headers: { 'X-API-KEY': process.env.GELATO_API_KEY! },
      }
    );
    if (!response.ok) {
      throw new Error(`Gelato cancel failed for ${providerOrderId}`);
    }
  }

  async getStatus(providerOrderId: string): Promise<OrderStatus> {
    const config = brandConfig.fulfillment.providers.gelato;
    const response = await fetch(
      `${config.apiBaseUrl}/v4/orders/${providerOrderId}`,
      { headers: { 'X-API-KEY': process.env.GELATO_API_KEY! } }
    );
    const data = await response.json();
    return {
      providerOrderId,
      status: this.mapGelatoStatus(data.fulfillmentStatus),
      trackingNumber: data.shipment?.trackingCode,
      trackingUrl: data.shipment?.trackingUrl,
      carrier: data.shipment?.carrier,
      events: data.history ?? [],
    };
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    const event = payload as { event: string; orderId: string };
    return {
      providerOrderId: event.orderId,
      newStatus: this.mapGelatoStatus(event.event),
      shouldNotifyCustomer: ['shipped', 'delivered'].includes(event.event),
    };
  }

  private mapSkuToGelatoProductUid(sku: string): string {
    // Mapping-Tabelle SKU → Gelato Product UID
    // In Phase 7 zentral in einer Map definieren, in Phase 2 nach Payload migrieren
    const map: Record<string, string> = {
      // Beispiel: silbe-rilke-geduld-hero-burgundy-A3 → gelato Product UID
      // wird in Phase 8 final gepflegt
    };
    const uid = map[sku];
    if (!uid) throw new Error(`No Gelato Product UID mapped for SKU: ${sku}`);
    return uid;
  }

  private mapGelatoStatus(gelatoStatus: string): OrderStatus['status'] {
    const map: Record<string, OrderStatus['status']> = {
      created: 'created',
      printed: 'in_production',
      passed: 'in_production',
      shipped: 'shipped',
      delivered: 'delivered',
      canceled: 'cancelled',
      failed: 'failed',
    };
    return map[gelatoStatus] ?? 'created';
  }
}
```

#### Mock Provider (für Tests + CI)

```typescript
// lib/fulfillment/providers/mock.ts
import type { FulfillmentProvider, /* ... */ } from '../types';

export class MockProvider implements FulfillmentProvider {
  readonly name = 'mock';
  private orders = new Map<string, unknown>();

  verifyWebhook() { return true; }

  async createOrder(order) {
    const providerOrderId = `mock-${Date.now()}`;
    this.orders.set(providerOrderId, order);
    return {
      providerOrderId,
      status: 'created' as const,
      raw: order,
    };
  }

  async cancelOrder(id: string) {
    this.orders.delete(id);
  }

  async getStatus(providerOrderId: string) {
    return {
      providerOrderId,
      status: 'created' as const,
      events: [],
    };
  }

  async handleWebhook(payload: unknown) {
    return {
      providerOrderId: 'mock-test',
      newStatus: 'shipped' as const,
      shouldNotifyCustomer: true,
    };
  }
}
```

#### Order-Normalization (Shopify → Provider-agnostic)

```typescript
// lib/fulfillment/normalize.ts
import type { NormalizedOrder } from './types';

export function normalizeShopifyOrder(shopifyOrder: any): NormalizedOrder {
  return {
    id: shopifyOrder.admin_graphql_api_id,
    reference: shopifyOrder.name,
    customer: {
      email: shopifyOrder.customer.email,
      firstName: shopifyOrder.customer.first_name,
      lastName: shopifyOrder.customer.last_name,
    },
    shippingAddress: {
      line1: shopifyOrder.shipping_address.address1,
      line2: shopifyOrder.shipping_address.address2 || undefined,
      city: shopifyOrder.shipping_address.city,
      postalCode: shopifyOrder.shipping_address.zip,
      country: shopifyOrder.shipping_address.country_code,
      state: shopifyOrder.shipping_address.province_code,
    },
    items: shopifyOrder.line_items.map((item: any) => ({
      sku: item.sku,
      productHandle: item.product_id,
      quantity: item.quantity,
      metadata: {
        // Per-Item-Metafield-Override: aus Shopify product metafields gepullt
        fulfillmentProvider: extractMetafield(item, 'silbe.fulfillment_provider'),
        printFileUrl: extractMetafield(item, 'silbe.print_file_url'),
      },
    })),
    currency: shopifyOrder.currency,
    totalAmount: parseFloat(shopifyOrder.total_price),
  };
}

function extractMetafield(item: any, key: string): string | undefined {
  // Implementierung abhängig davon ob Metafields im Webhook-Payload mitkommen
  // oder via Admin API nachgefetcht werden müssen
  return item.metafields?.find((m: any) => `${m.namespace}.${m.key}` === key)?.value;
}
```

#### Webhook Handler — Shopify (provider-agnostisch)

```typescript
// app/api/webhooks/shopify/route.ts
import { revalidatePath, revalidateTag } from 'next/cache';
import { verifyShopifyWebhook } from '@/lib/shopify';
import { normalizeShopifyOrder } from '@/lib/fulfillment/normalize';
import { routeOrder } from '@/lib/fulfillment/router';
import { brainSync } from '@/lib/brain-sync';

export async function POST(request: Request) {
  const body = await request.text();
  const topic = request.headers.get('x-shopify-topic');
  const verified = verifyShopifyWebhook(body, request.headers);
  if (!verified) return new Response('Unauthorized', { status: 401 });

  const data = JSON.parse(body);

  switch (topic) {
    case 'products/update':
    case 'products/create':
      revalidateTag(`product-${data.handle}`);
      revalidatePath('/editionen');
      break;

    case 'orders/create': {
      const normalized = normalizeShopifyOrder(data);
      const results = await routeOrder(normalized);

      // Log Failures into Brain für HITL-Investigation
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        await brainSync({
          type: 'fulfillment-routing-partial-failure',
          orderId: normalized.id,
          failures,
        });
      }
      break;
    }

    case 'orders/cancelled':
      // Lookup providerOrderId von der Order und call cancelOrder beim richtigen Provider
      // (Implementation: aus Payload-DB Order-Cross-Reference oder via Shopify-Metafield)
      break;
  }

  return new Response('OK');
}
```

#### Provider-Webhook-Endpoint (generic)

```typescript
// app/api/webhooks/fulfillment/[provider]/route.ts
import { getProvider } from '@/lib/fulfillment/registry';
import { triggerCustomerNotification } from '@/lib/notifications';
import { brainSync } from '@/lib/brain-sync';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerName } = await params;
  const provider = getProvider(providerName);

  const body = await request.text();
  if (!provider.verifyWebhook(body, request.headers)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await provider.handleWebhook(JSON.parse(body));

  await brainSync({
    type: 'fulfillment-status-update',
    provider: providerName,
    ...result,
  });

  if (result.shouldNotifyCustomer) {
    await triggerCustomerNotification(result);
  }

  return new Response('OK');
}
```

#### Brain-Sync

Nach jedem Deploy ein Eintrag in `cowork/sessions/{date}/silbe-deploy-{commit-sha}.md` mit:
- Commit Message
- Files Changed
- Acceptance-Test Results
- Vercel Preview-URL
- Lighthouse-Scores

Damit das Brain-Repo eine Live-Historie der Site-Improvements hat. Implementation in `lib/brain-sync.ts` als File-Append zum lokalen Brain-Repo-Klon (in CI: GitHub-API-Commit zum Brain-Repo).

#### Agent-Prompts

`agents/auto-essay.md` — vollständiger Prompt für Claude Code, der gegeben einen neuen Product-Handle und Quote-Source einen 200–400 Wort Editorial-Essay generiert (Sie-Form, deutsche Anführungszeichen, primärquellenverifiziert), schreibt ihn in Payload via Local API. Pre-conditions: Quote-Source verifiziert, Authors-Collection up-to-date.

`agents/asset-regen.md` — Prompt für die Re-Generation von schwachen Assets (siehe asset-mapping.md §4). Nutzt Imagen 4 / Flux Pro APIs.

`agents/seo-audit.md` — Prompt für wöchentlichen Catalog-Health-Test gegen Storefront MCP (siehe asset-mapping.md §5.4).

`agents/add-fulfillment-provider.md` — Step-by-Step Anleitung für Claude Code "Add a new fulfillment provider":
1. Lies `lib/fulfillment/types.ts` für das Interface
2. Erstelle `lib/fulfillment/providers/[provider-name].ts` mit Class die `FulfillmentProvider` implementiert
3. Registriere im `lib/fulfillment/registry.ts`
4. Update `config/brand.ts` `enabledProviders` array
5. Implementiere `tests/fulfillment/[provider-name].test.ts` analog zu `gelato.test.ts`
6. Verifiziere dass `tests/fulfillment/adapter-contract.test.ts` (Contract-Test) für den neuen Provider grün läuft
7. Documentiere Provider-spezifische Setup-Steps in einer separaten `docs/setup-[provider].md`

Diese Agent-Prompts sind **vorbereitend für Phase-2-Autonomie** — sie sind in Phase 1 noch HITL-getriggered, aber die Building-Blocks sind da.

### 7.4 Acceptance-Tests Phase 7

```bash
# Test 1: Adapter-Contract — jeder Provider muss das Interface vollständig implementieren
pnpm vitest run tests/fulfillment/adapter-contract.test.ts
# Expected: Alle Provider (gelato, mock) bestehen alle 5 Interface-Methods

# Test 2: Router wählt richtigen Provider basierend auf Metafield
pnpm vitest run tests/fulfillment/router.test.ts
# Expected: Item ohne Metafield → Gelato (default); Item mit metafield "mock" → Mock

# Test 3: Gelato-Provider Order-Creation (Mock-API)
pnpm vitest run tests/fulfillment/gelato.test.ts
# Expected: Mock-fetched Gelato API gibt 200, providerOrderId returned

# Test 4: Hybrid-Order mit 2 Providern wird in 2 Provider-Orders aufgeteilt
pnpm vitest run tests/fulfillment/router.test.ts -t "hybrid"
# Expected: 2 Provider-Calls, beide successful

# Test 5: Shopify Webhook signature verification
pnpm playwright test --grep="shopify webhook signature"
# Expected: Invalid signatures return 401

# Test 6: Provider-Webhook-Endpoint dispatcht korrekt
pnpm playwright test --grep="provider webhook dispatch"
# Expected: POST /api/webhooks/fulfillment/gelato → GelatoProvider.handleWebhook called

# Test 7: Revalidate Tag bei Product-Update
pnpm playwright test --grep="revalidate on product update"
# Expected: Cache cleared, fresh data

# Test 8: Brain-Sync schreibt File
pnpm tsx scripts/test-brain-sync.ts
ls $BRAIN_REPO_PATH/cowork/sessions/$(date +%Y-%m-%d)/silbe-deploy-*.md
# Expected: File exists

# Test 9: Agent-Prompts dokumentiert und valide
ls apps/silbe/agents/*.md
# Expected: 4+ files (auto-essay, asset-regen, seo-audit, add-fulfillment-provider)

# Test 10: Provider hinzufügen ist <30 Min Arbeit (verifiziert via Mock-Provider)
# Manueller Test: kopiere mock.ts → printful.ts, ändere Methoden-Bodies, kein Schema-Refactor nötig
```

### 7.5 Commit

```bash
git commit -m "feat(silbe): phase-7 fulfillment adapter + agents — gelato as first provider, brain sync, agent prompts"
```

---

## PHASE 8 — Agentic-Commerce Optimization & Launch-Prep

**Goal:** Catalog-Daten für UCP/MCP optimieren, Storefront MCP testen, finaler DNS-Switch silbe.at → Vercel.

**Branch:** `phase-8-agentic-launch`

### 8.1 Scope

- Catalog-Optimierung: Alle Shopify-Produkte bekommen Titles im Pattern aus `asset-mapping.md` §5.1, Descriptions im Pattern §5.2, Metafields aus §5.3 gepflegt.
- Storefront MCP Test: Sicherstellen dass `search_shop_catalog` mit Queries wie "Rilke Poster Kunstdruck" SILBE-SKUs als Top-Results zurückgibt.
- Final-Lighthouse-Audit für alle 14+ PDPs + 8 Editorial-Surfaces.
- DNS-Switch: A-Record/CNAME silbe.at → Vercel (cname.vercel-dns.com).
- Klaviyo-Migration: bestehende Subscriber importieren.
- 301-Redirect-Test: alle alten Liquid-URLs landen auf neuen Routes.
- Test-Order: Aleks bestellt eine Test-Edition durch den ganzen Flow (Cart → Checkout → Payment → Gelato → Versand).

### 8.2 Files-to-Create / Files-to-Edit

```
CREATE:  apps/silbe/scripts/optimize-catalog.ts       (mutiert Shopify Products via Admin API)
CREATE:  apps/silbe/scripts/test-storefront-mcp.ts
CREATE:  apps/silbe/scripts/migrate-klaviyo-subscribers.ts
CREATE:  docs/launch-runbook.md                       (Aleks-friendly DNS-Switch + Test-Bestellung Anleitung)
EDIT:    apps/silbe/app/(storefront)/page.tsx        (final-tweak Hero-Asset wenn re-generiert)
```

### 8.3 Implementation-Brief

#### Catalog-Optimization-Script

Iteriert über alle Shopify-Produkte und mutiert (via Admin API):
- `title` → Pattern aus `asset-mapping.md` §5.1
- `bodyHtml` → Pattern §5.2 (200–400 Wörter, structured)
- `metafields` → alle aus §5.3

Idempotent: kann mehrfach laufen, ohne Daten zu duplizieren.

#### Storefront MCP Test

```typescript
// scripts/test-storefront-mcp.ts
const MCP_ENDPOINT = 'https://z9xkt0-2v.myshopify.com/api/mcp';

async function testMCP() {
  const queries = [
    'Rilke Poster Kunstdruck',
    'Kafka Zitate Wandbild',
    'Geschenk Literatur Klassiker',
    'deutsche Klassiker Poster',
    'Wien literarisches Geschenk',
  ];

  for (const query of queries) {
    const response = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        id: 1,
        params: {
          name: 'search_shop_catalog',
          arguments: { query },
        },
      }),
    });
    const result = await response.json();
    console.log(`Query: "${query}" → ${result.result?.length || 0} SILBE results`);
  }
}
```

Expected: SILBE-SKUs als Top-3 in mindestens 4 von 5 Queries.

#### Launch-Runbook für Aleks

Step-by-Step Markdown-Doc:
1. Vercel Custom Domain hinzufügen.
2. Webgo DNS A-Record + CNAME ändern.
3. Warten bis DNS-Propagation durch (`dig silbe.at`).
4. Lighthouse-Audit auf https://silbe.at laufen lassen.
5. Test-Bestellung durchführen.
6. Klaviyo-Subscriber-Migration.
7. Old-Liquid-Theme deaktivieren (Shopify Admin → Themes → Unpublish).

### 8.4 Acceptance-Tests Phase 8

```bash
# Test 1: Catalog-Optimization-Script (idempotent)
pnpm tsx scripts/optimize-catalog.ts --dry-run
# Expected: 14+ products to update, no errors

pnpm tsx scripts/optimize-catalog.ts --apply
# Expected: All products updated

# Test 2: Storefront MCP findet SILBE
pnpm tsx scripts/test-storefront-mcp.ts
# Expected: 4+ of 5 queries return SILBE in top-3

# Test 3: All PDP Lighthouse ≥ 90
pnpm lhci autorun --collect.urls.0=https://silbe.at/editionen/silbe-rilke-...
# Expected: All ≥ 90

# Test 4: 301-Redirects
curl -I https://silbe.at/collections/alle-werke
# Expected: 301 → /editionen

# Test 5: Test-Bestellung end-to-end
# (Manueller HITL-Test durch Aleks)

# Test 6: DNS aufgelöst
dig silbe.at +short
# Expected: cname.vercel-dns.com (or A-Record für Vercel)
```

### 8.5 Commit + Tag

```bash
git commit -m "feat(silbe): phase-8 launch — catalog optimization, MCP test, DNS switch ready"
git tag -a v1.0.0 -m "SILBE v1.0 Launch — Headless Triadic Architecture"
git push origin main --tags
```

**HITL-Gate:** Aleks und Merlin signoffen die Test-Bestellung. Erst dann DNS umhängen.

---

## 9. Post-Launch — Continuous Improvement

Nach Launch: das System ist agent-readable und agent-improvable. Beispiel-Workflows die als Cron-Jobs oder GitHub Actions laufen können:

### 9.1 Wöchentlicher SEO-Audit

```bash
# .github/workflows/seo-audit.yml
on:
  schedule:
    - cron: '0 9 * * 1'  # Monday 9am UTC
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm tsx scripts/test-storefront-mcp.ts > audit-result.json
      - run: pnpm tsx scripts/check-broken-quotes.ts
      - if: failure()
        run: |
          # Trigger Claude Code to investigate
          # Open Issue with "needs-review" label
```

### 9.2 Auto-Essay für neue Products

Wenn Aleks ein neues Produkt in Shopify anlegt:
1. Shopify Webhook `products/create` triggert Vercel-Deploy.
2. Deploy-Hook ruft `agents/auto-essay.md` Prompt auf, gibt neuen Product-Handle.
3. Claude Code generiert Draft-Essay, schreibt es nach Payload als `status: draft`.
4. Aleks reviewt im Payload-Admin, publisht.
5. Webhook `payload-essay-published` revalidiert PDP.

### 9.3 Asset-Re-Generation als Service

Wenn ein Asset als `status: weak` in `lib/asset-manifest.ts` markiert wird:
1. Cron-Job läuft `agents/asset-regen.md` mit Re-Generation-Brief aus `asset-mapping.md` §4.
2. Generiert neue Version via Imagen 4 oder Flux Pro.
3. Push als Pull Request.
4. HITL-Review durch Merlin.

### 9.4 Lighthouse-Regression-Watch

Nach jedem Deploy: Lighthouse-CI vergleicht mit vorigem Deploy. Wenn Performance um >5% droppt: Vercel-Rollback + Brain-Sync mit "regression-detected" Label.

---

## 10. Migration Path zu Phase-2-Autonomie

Phase 1 = HITL-driven. Aleks/Merlin reviewen jede Phase. Phase 2 = volle Agent-Autonomie für Routine-Tasks.

Was Phase 2 erlaubt (sobald Vertrauen da ist):

| Task | Phase 1 | Phase 2 (autonom) |
|---|---|---|
| Neue Product-Page bauen | HITL | Auto via `agents/auto-essay.md` + Catalog-Sync |
| Asset re-generieren | HITL | Cron-triggered mit Approval-PR |
| Catalog-Health-Fix | HITL | Auto-Fix für definierte Patterns |
| Lighthouse-Regression | HITL-Rollback | Auto-Rollback + Brain-Log |
| Editorial-Essay-Draft | HITL-Write | Auto-Draft, Aleks-Review-Publish |
| Newsletter-Send | HITL-Compose | Klaviyo-Flows (already automated) |
| Order → Gelato | HITL für Edge-Cases | Voll-automatisch (already in Phase 7) |
| New-Author-Onboarding | HITL | Pattern-based Bootstrap |

Der Übergang von Phase 1 zu Phase 2 ist kein Refactor — er ist das Umlegen von Schaltern. Die Building-Blocks sind ab Tag 1 da.

---

## 11. Rollback-Plan

Wenn nach Launch ein P0-Issue auftritt:

1. **Vercel-Rollback:** Vercel Dashboard → Deployments → Rollback to previous.
2. **DNS-Rollback:** Wenn Vercel-Issue: silbe.at DNS zurück auf Liquid-Theme (alte CNAME).
3. **Shopify-Theme:** Liquid-Theme bleibt als "unpublished" in Shopify gespeichert. Re-publish per Klick wenn nötig.

Recovery-Time: < 30 Minuten.

---

## 12. Dependencies & Cost-Estimate

| Service | Cost | Pflicht |
|---|---|---|
| Vercel | $0 (Hobby) → $20/mo (Pro) | Pflicht |
| Shopify Basic | $39/mo | Pflicht (existing) |
| Neon Postgres | $0 (Free Tier 500MB) → $19/mo (Launch) | Pflicht (Payload) |
| Cookiebot | $9/mo (Premium) | Pflicht (DSGVO) |
| Klaviyo | $0 (≤250 contacts) → $20/mo (≤500) | Pflicht |
| Gelato | $0 (only print costs) | Pflicht |
| Sentry | $0 (Developer) → $26/mo (Team) | Empfohlen |
| Plausible/Vercel Analytics | $0 / $9/mo | Empfohlen |
| **Sum Phase 1 (Launch)** | **~$0–80/mo** | |
| **Sum Phase 2 (50 orders/day)** | **~$130/mo** | |

Plus: einmalige Re-Generation-Spend für 3 Assets ≈ $5 (CLAID + Imagen).

---

## 13. Was dieses Dokument NICHT abdeckt

- **Brand-Erweiterungen für künftige Brainsells-Brands** — kommt in `packages/brand-system/` Phase 2.
- **B2B-Features** (Reseller-Pricing, Bulk-Orders) — Phase 3.
- **Customer Accounts** mit Shopify Customer Account API — Phase 2.
- **Multi-Sprache** (EN/AT-DE Differenzierung) — Phase 3.
- **Marginalia-Sub-Line** (Phase 3 Russian Classics) — separate Repository.
- **Mobile-App** (React Native sharing GraphQL queries) — Phase 4 oder später.

---

## 14. Final Checklist vor Launch

- [ ] Alle 8 Phasen sind committed und merged.
- [ ] Alle Acceptance-Tests grün.
- [ ] Lighthouse Mobile ≥ 90 für Homepage + 14+ PDPs + 3 Editorial-Surfaces.
- [ ] Vocabulary-Linter passt für alle Files.
- [ ] DSGVO-Compliance: Cookiebot live, Datenschutz-Page komplett, Newsletter-DOI funktioniert.
- [ ] DNS-Switch durchgeführt, silbe.at auf Vercel.
- [ ] Old-Liquid-Theme deaktiviert.
- [ ] Test-Bestellung durch Aleks und Merlin successful.
- [ ] Klaviyo-Subscriber migriert.
- [ ] Gelato-Webhooks live, Test-Order in Gelato bestätigt.
- [ ] Brain-Sync läuft nach jedem Deploy.
- [ ] Storefront MCP-Test zeigt SILBE Top-3 für relevante Queries.
- [ ] Launch-Runbook von Aleks gegengelesen.

---

## 15. Changelog

- **2026-05-07** — Initial lock. Acht Phasen definiert. Triadic Architecture (Payload 3.0 + Next.js 16 + Shopify + Gelato). Agent-Layer als Phase 7 strukturiert mit Building-Blocks für Phase-2-Autonomie. Pre-Launch-Hold: HITL für jede Phase, Aleks/Merlin-Approval als Gate.

- **2026-05-07 (Patch v1.1)** — Zwei Erweiterungen integriert:
  - **Phase 0.5 hinzugefügt** als read-only Pre-Phase die den existierenden Repo-Zustand respektiert (Turborepo-Skeleton bereits aufgesetzt, Vercel verlinkt, Shopify Custom-App existiert mit teilweise gepflegten Scopes). Verhindert dass Phase 0 versehentlich bestehende Konfiguration überschreibt. Total-Phasen-Count: 9 (0.5 + 0–8).
  - **Phase 7 erweitert um Fulfillment-Adapter-Pattern.** Statt Gelato als direkte Integration: `FulfillmentProvider` Interface mit `GelatoProvider` als erster Implementation, Provider-Registry, Brand-Config, Per-Item-Provider-Override via Shopify Metafield. Macht Layer 3 swappable für künftige Brainsells-Brands (Marginalia/Lifestyle/eigenes Lager) ohne Refactor. Aufwand in Phase 7: +1 Stunde Claude-Code-Zeit. ROI: jeder zukünftige Provider ist 1-2 Tage Arbeit statt 1-2 Wochen.

---

**Wenn dieses Dokument an Claude Code übergeben wird, ist die erste Aktion:** Pre-Flight Checks aus §3 ausführen. Wenn alle grün: Phase 0 starten. Niemals Phase 0 überspringen — das Setup ist die Foundation auf der alle weiteren Phasen aufbauen.
