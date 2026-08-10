# Setup Runbook — Dependency-geordnete Provisionierung (Blueprint Block D)

**Zweck.** Die **Nicht-Code-Setup-Schritte** als geordnete, reproduzierbare Prozedur,
sodass ein neuer Shop (N+1) den Tracking-/Commerce-Stack aufsetzen kann, **ohne das
Multi-Tage-Debugging zu wiederholen**, das SILBE gekostet hat. Das Setup-Wissen lag
bisher nur verstreut in `.env.example`-Kommentaren, PR-Beschreibungen, CC-Memories und
Brain-Folds — in keiner geordneten Prozedur.

Bezug: Blueprint-Readiness `b370004`, Area 3 + Prio #3.

> **Reine Doku, kein Code.** Dies ist eine Anleitung, kein Skript.
> **Nicht doppeln:** Verifikations-Prozeduren (WIE man echte Lieferung beweist) und der
> Stape-Troubleshooting-Komplex leben in **`docs/verification-runbook.md`** (Kap. 8 =
> Verifikation, §9 = Troubleshooting/Anti-Patterns). Dieses Dokument **referenziert** sie.

---

## 0 · Wie dieses Runbook zu lesen ist

### Verifiziert-vs-Rekonstruiert (pro Schritt getaggt)

Die **Reihenfolge** dieser 7 Schritte ist von CC aus den echten Quellen **rekonstruiert**
(Dependency-Ordnung) — sie wurde **nie als sauberer N+1-Durchlauf validiert**. Die
**Fakten** in jedem Schritt (Scopes, Secrets, Fallen) sind dagegen überwiegend **im echten
SILBE-Setup passiert/beobachtet**. Jeder Schritt trägt daher zwei Tags:

- 🟢 **verifiziert** — im echten SILBE-Setup belegt (PR / Incident / Memory / Fold).
- 🟡 **rekonstruiert** — Platzierung/Reihenfolge von CC abgeleitet, beim ersten echten
  N+1-Setup **gegenzuprüfen**.

**Beim ersten echten N+1-Durchlauf:** jeden 🟡-Punkt bestätigen und dieses Runbook
korrigieren, wo die Realität abweicht (Block-B-Prinzip).

### Quellen (die Rekonstruktion stützt sich auf)

`.env.example` (Variablen-Ebene) · PRs #11 (Metafields/Scopes), #35 (Widerruf), #37 (SEO),
#50–#57 (Webhooks/HMAC/Refund), #59/#61/#62 (Stufe 2 CAPI), #64/#66 (Block A + Härtung),
#68 (Keepalive) · CC-Memories `shopify-app-identity-unresolved`,
`shopify-webhook-hmac-secret-mismatch`, `meta-purchase-stape-cutover`,
`web-pixel-purchase-delivery-failure`, `refund-webhook-pending-gate-bug`,
`stape-container-auto-disable` · Brain-Folds `sessions/2026-06-30/` (Cutover),
`sessions/2026-07-04/` + `2026-07-06/` (Stufe 2).

---

## Schritt 1 — Shopify Custom-App + Scopes + Identitäts-Invariante

**Status:** Fakten 🟢 verifiziert (PR #11, #35, #50–#54; Memories app-identity + hmac-mismatch) · Reihenfolge 🟡 rekonstruiert (bewusst GANZ vorne — der teuerste Trap).

**Voraussetzung:** Shopify-Store; Admin-Zugang. `SHOPIFY_SHOP` = das bare Subdomain
(z. B. `z9xkt0-2v`), **nicht** die `.myshopify.com`-Domain.

**Aktion:**
1. **EINE** Custom-App im Shopify-Admin anlegen, die sowohl die Admin-Operationen als
   auch die Webhook-Registrierung trägt. (SILBE: „silbe admin operations".)
2. **Admin-Scopes** vergeben:
   - `read_products` + `write_products` — Metafield-Seed (PR #11).
   - `read_orders` + `write_orders` — Widerruf-Lookup/Tag/Note (PR #35) + Refund-Order-Lookup + Idempotenz-Marker (`metafieldsSet` auf der Order).
   - **Protected Customer Data (PCD) access** — orders/paid liefert `client_details.browser_ip` / `user_agent` **nur** mit PCD-Freigabe (für CAPI ip/ua).
3. **Storefront-API-Zugang** (read_products + Storefront-Access-Token) für die Katalog-/Cart-Reads der Storefront.
4. **2026-01-Auth-Migration:** kein statischer Admin-Token mehr. Die App erhält **Client-ID + Client-Secret**; Admin-Tokens werden per **OAuth Client-Credentials-Grant** gegen `/admin/oauth/access_token` gemintet und laufen nach **24 h** ab (Code cached sie ~24 h).

**Ergebnis-Check:** Dry-run von `scripts/register-webhooks.ts` mintet einen Admin-Token
und listet Subscriptions ohne 401. Metafield-Seed (`check-metafields.ts`) zeigt die
Definitionen live.

**Bekannte Falle / Anti-Pattern #1 — „Old-vs-New-Secret" + App-Identität (kostete tagelanges 401-Debugging):**
- **Shopify signiert Webhooks mit dem Secret der App, unter der sie registriert sind.**
  Weichen **Registrierungs-App** und **Vercel-Verify-App** ab → **jede echte Lieferung 401,
  Event still verloren**. **Invariante: registration-app == Vercel-verify-app** (Memory
  `shopify-app-identity-unresolved`).
- **Das Webhook-Signing-Secret ist NICHT zwingend das OAuth-Client-Secret.** Bei SILBE
  signiert Shopify mit dem **„Old"-Client-Secret**, während der Token-Mint mit dem „New"
  geht. Symptom: synthetische lokal-signierte POSTs geben 200, **echte** Shopify-Lieferungen
  401. → `SHOPIFY_WEBHOOK_SECRET` = das tatsächliche Signing-Secret setzen; der Verify ist
  rotations-sicher (matcht gegen `SHOPIFY_WEBHOOK_SECRET` / `_OLD` / `SHOPIFY_CLIENT_SECRET`).
  Diagnose bei 401: `SHOPIFY_HMAC_DEBUG=1` auf einer echten Lieferung zeigt, welcher
  Kandidat matcht (Memory `shopify-webhook-hmac-secret-mismatch`).
- **Ohne PCD-Freigabe** sind `browser_ip`/`user_agent` in orders/paid redacted → CAPI
  em/ip/ua leer → Match-Qualität bricht ein (still).

---

## Schritt 2 — Env/Secrets provisionieren (Vercel Preview+Prod + lokal)

**Status:** Fakten 🟢 verifiziert (`.env.example`; Block-A fail-fast PR #64; Memory `feedback-vercel-env-pull-destructive`) · Reihenfolge 🟡 rekonstruiert.

**Voraussetzung:** Schritt 1 (Client-ID/Secret + Signing-Secret liegen vor). Vercel-Projekt verknüpft.

**Aktion:** den vollen Variablen-Satz aus `apps/silbe/.env.example` setzen — in **Vercel
Preview UND Production** und lokal in `apps/silbe/.env.local`. Gruppen: Shopify (Storefront +
Admin + Webhook-Secret), Payload (`PAYLOAD_SECRET`/`DATABASE_URI`), GA4 (Schritt 3),
Stape/brand.config (Schritt 4), Klaviyo/Consent/Widerruf (Schritt 6), Gelato (Schritt 7).

**Ergebnis-Check:** `next build` + der erste Webhook-Request werfen **keinen**
`[brand.config] required env var … is not set`. **Zusätzlich Schritt 2.1 abhaken** — ohne den
kann eine Variable korrekt gesetzt und trotzdem unwirksam sein.

---

### Schritt 2.1 — Build-Zeit-Variablen in `turbo.json` deklarieren ⚠️ PFLICHT

**Status:** 🟢 verifiziert (Gap #10, empirisch aufgeklärt 2026-08-10 an zwei Projekten —
SILBE-Prod und dem Wegwerf-Fork `testabrand-headless`).

**Warum das ein eigener Schritt ist und keine Falle am Rand:** Eine Variable kann in Vercel
**korrekt gesetzt** sein — richtiger Wert, richtiger Scope, richtiges Projekt, nicht als
„Sensitive" markiert — und den Code **trotzdem nie erreichen**. Es gibt keine Fehlermeldung,
keinen roten Build, keinen Log-Hinweis. Der Code sieht schlicht `undefined` und fällt auf
seinen Default zurück. „Korrekt gesetzt" sieht dabei exakt aus wie „wirksam".

**Die Ursache:** `turbo.json` führt pro Task eine `env`-Liste. Ab **Turborepo 2.x ist
`envMode: strict` der Default**, und in strict mode ist diese Liste eine **ALLOWLIST, kein
Cache-Key**: turbo entfernt jede nicht deklarierte Variable aus der Task-Umgebung, bevor
`next build` startet.

**Betroffen sind nur Variablen, die zur BUILD-Zeit gelesen werden** — in diesem Repo
`METADATA_BASE_URL` (via `sitemap.ts`, `robots.ts`, `metadataBase` in `layout.tsx`) und
`EDITORIAL_METAFIELD_NAMESPACE` (via PDP-Prerender). **Laufzeit-Leser sind NICHT betroffen**:
die Webhook-Pfade lesen ihre `brand.config`-Werte zur Request-Zeit, und die Runtime auf Vercel
läuft nicht durch turbo. Das erklärt, warum GA4- und Stape-Keys nie auffällig wurden.

**Aktion:** Jede Variable, die der Build liest, in `turbo.json` unter `tasks.build.env`
eintragen. Beim Einführen eines neuen `brand.config`-Keys ist das der **zweite Schritt**, direkt
nach dem Setzen in Vercel — nicht später.

**Ergebnis-Check — kopierbar:**

```bash
npx turbo run build --dry        # menschenlesbar: Zeile "Env Vars = …"
npx turbo run build --dry=json   # maschinenlesbar: envMode + aufgelöste Liste pro Task
```

Die neue Variable **muss** in der ausgegebenen Env-Liste stehen. Steht sie nicht drin, wird sie
im Build entfernt — unabhängig davon, was in Vercel konfiguriert ist.

**⚠️ Ein grüner CI-Lauf beweist hier NICHTS.** Der CI-Workflow baut mit `next build` direkt in
`apps/silbe` und **umgeht turbo vollständig**; Vercel baut über das Root-Script
`turbo run build`. Zwei Einstiegspunkte, nur einer filtert. Eine PR kann in CI grün sein und
den Vercel-Build trotzdem rot machen — oder, schlimmer, still auf den Default zurückfallen.
Die Prüfung muss deshalb **gegen den Vercel-Build** laufen, nicht gegen CI.

**Verifikationsregel für die Messung am Deployment** (aus dem Schicht-0-Fork): **erst
Gültigkeit prüfen, dann messen.** Zwei von drei Messrunden waren dort ungültig, weil das
ausgelieferte Artefakt **älter** war als die Env-Änderung — und beide sahen wie ein handfester
Befund aus. Belastbar sind nur:

- der **Next.js-`buildId`** im ausgelieferten HTML (`\"b\":\"…\"` im RSC-Payload) — muss sich
  gegenüber der Messung davor geändert haben;
- der Abstand **`Date` minus `Last-Modified`** aus den Response-Headern — das Artefakt muss
  jünger sein als die Env-Änderung.

`X-Vercel-Cache` und `Age` genügen **nicht**: eine cache-busted Anfrage kann trotzdem ein altes
Artefakt liefern.

**Bekannte Falle:** ein Kommentar als `"//"`-Key in `turbo.json` ist gültiges JSON, aber
**ungültiges turbo-Schema** (`Found an unknown key //`) und zerlegt jeden Build. `turbo.json`
akzeptiert JSONC-Kommentare (`// …`). Und: mit `JSON.parse` validieren prüft nur die Syntax,
nicht das Schema — dafür ist `npx turbo run build --dry` da.

---

**Bekannte Falle:**
- **Block-A fail-fast:** ALLE `brand.config`-Vars (`STAPE_SERVER_BASE`,
  `GTAG_GTM_FINGERPRINT`, `MARKER_NAMESPACE`, `KLAVIYO_EDITORIAL_EVENT`) müssen **vor** dem
  Deploy in Vercel stehen — die lazy Getter werfen erst zur **Request-Zeit** (nicht im
  CI-Build), also fällt ein fehlender Key **NICHT** im grünen CI auf, sondern erst als 500
  auf dem ersten echten Webhook.
- **`vercel env pull` ist destruktiv:** überschreibt `.env.local` und gibt sensible Secrets
  als leere Strings zurück — vor dem Ausführen bestätigen.
- **`STAPE_SERVER_BASE` ohne Trailing-Slash** (ein `/` baute `…net//g/collect` → 404; seit
  PR #66 normalisiert der Getter das, aber sauber setzen).
- **⚠️ N+1-Warnung — `silbe`-Doppelbedeutung:** das Literal `silbe` hat in SILBE **zwei
  unabhängige** Rollen: (a) `MARKER_NAMESPACE` (env, hier gesetzt) und (b) der
  **Editorial-Metafield-Namespace**, der in **~7 Code-Dateien hartcodiert** ist
  (`editorial-context.ts`, `shopify-queries.ts`, Seed-Skripte — separater Contract,
  out-of-scope für Block A). Beim Fork sind das **ZWEI Parametrisierungen, nicht eine**:
  `MARKER_NAMESPACE` per env umstellen **und** den hartcodierten Editorial-Namespace im Code
  ersetzen. Wer nur die env ändert, hat einen inkonsistenten Namespace.

---

## Schritt 3 — GA4 + Measurement Protocol

**Status:** Fakten 🟢 verifiziert (`.env.example`; Memory `tracking-cutover-sequence`) · Reihenfolge 🟡 rekonstruiert.

**Voraussetzung:** GA4-Zugang.

**Aktion:**
1. GA4-Property + **Web-Data-Stream** anlegen → Measurement-ID `G-…` → `GA4_MEASUREMENT_ID`.
2. **MP-API-Secret** erzeugen: GA4 Admin → Data Streams → *(Stream)* → Measurement Protocol
   API secrets → `GA4_API_SECRET` (server-only, nie loggen — es ist ein Query-Param auf der
   collect-URL).

**Ergebnis-Check:** `pnpm tsx scripts/validate-refund-mp.ts` gegen `/debug/mp/collect` →
leeres `validationMessages` (Shape gültig). **Achtung:** das ist 🧪 synthetisch (der
Debug-Endpoint zeichnet nichts auf) — **kein** Real-Delivery-Beweis (s. verification-runbook Kap. 0).

**Bekannte Falle:**
- **`transaction_id = numerische Order-ID`** ist die Join-Invariante zwischen purchase
  (orders/paid → gtag/Stape) und refund (refunds/create → MP direkt). Beide Seiten müssen
  denselben String senden, sonst bricht der purchase↔refund-Join in GA4 still.

---

## Schritt 4 — Stape sGTM + Web-GTM verdrahten

**Status:** Prinzip 🟢 verifiziert (Memory `meta-purchase-stape-cutover`; verification-runbook §9) · Container-Feinverdrahtung 🟢 verifiziert aber **SILBE-spezifisch** · Reihenfolge 🟡 rekonstruiert.

**Voraussetzung:** GA4 (Schritt 3). Stape-Account + Server-Container. Web-GTM-Container.

**Aktion:**
1. **Web-GTM-Container** (`GTM-…` → `NEXT_PUBLIC_GTM_ID`) empfängt dataLayer-Pushes im
   Browser und forwardet server-side zum **Stape-sGTM-Container** (Konfiguration im
   GTM-/Stape-Dashboard — die Stape/Server-Container-ID erscheint **nie im Code**).
2. **`STAPE_SERVER_BASE`** = EU-Stape-Container-Base (Free-Tier serviert nur EU-Egress) +
   **`GTAG_GTM_FINGERPRINT`** (der `gtm=`-Fingerprint, der das Wire-Format der Server-Tags pinnt).
3. **Stape-Container-Config — das forkbare PRINZIP (inline):**
   > **GA4-`bs_`-Firewall ZUERST → dann CAPI-user_data-Mapping → dann serielle
   > Plattform-Aktivierung.** Wird diese Reihenfolge verletzt, leakt `bs_ud` (Klartext-IP/UA)
   > in den GA4-Tag, BEVOR die Exclusion aktiv ist.
   >
   > Die **konkrete SILBE-Container-Config** (Custom-Variable-Template `bs_ud`-Decode →
   > em/ip/ua, Augment-Transformation Meta/TikTok/Pinterest-scoped, GA4-`bs_`-Blocklist V3)
   > ist **SILBE-container-spezifisch, nicht forkbar** → **Referenz**, nicht hier dupliziert:
   > Memory `meta-purchase-stape-cutover` + Folds `sessions/2026-07-04/`, `2026-07-06/`.
4. **Inaktivitäts-Schutz:** der **Keepalive-Workflow** (`.github/workflows/stape-keepalive.yml`,
   PR #68) hält den Free-Tier-Container wach — **Referenz:** verification-runbook **§9.1**
   (nicht doppeln). Secret `STAPE_KEEPALIVE_URL` setzen.

**Ergebnis-Check:** ein Real-Delivery-Testkauf → `purchase sent` 2xx + GA4-DebugView zeigt
das Event **ohne** `bs_ud` (gepaarte Beobachtung, verification-runbook Kap. 8 #4).

**Bekannte Falle / Anti-Pattern #2 — Stape-502 aus der falschen Vercel-Region:**
- Der gtag-`/g/collect`-Send an den EU-Stape-Container gibt **502 aus Vercels Default-US-Region
  (`iad1`)** — der Free-Tier-Proxy verträgt den US-Egress nicht. **Fix: Vercel-Function-Region
  = Frankfurt** (`preferredRegion='fra1'` inline in der Route; auf Hobby zusätzlich das
  Projekt-Setting). Symptom sieht aus wie ein Request-Bug, ist aber reiner Egress-Standort.
- **Zusätzlich (verification-runbook §9.1):** Free-Tier deaktiviert nach >2 Wochen ohne
  Requests (→ 404, sieht aus wie URL/env-Bug — bei Stape-404 ZUERST Container-Status prüfen);
  und das Monats-Limit erschöpft = **permanent aus** → **Launch-Gate: Free→Paid vor echtem
  Traffic** (Schritt 7).

---

## Schritt 5 — Webhooks registrieren + CAPI-Plattformen aktivieren

**Status:** Fakten 🟢 verifiziert (PRs #50–#62; Memories web-pixel + refund-pending-gate) · Reihenfolge 🟡 rekonstruiert.

**Voraussetzung:** Schritte 1–4 (App-Identität, Secrets, GA4, Stape-Firewall aktiv).

**Aktion:**
1. **Webhooks registrieren:** `pnpm tsx scripts/register-webhooks.ts` unter der kanonischen
   App. `SUBSCRIPTIONS` = **`ORDERS_PAID`** (→ `/api/webhooks/orders-paid`) +
   **`REFUNDS_CREATE`** (→ `/api/webhooks/refunds-create`). `order-created` (dormanter
   Klaviyo-Editorial-Pfad) ist bewusst **nicht** registriert.
2. **CAPI-Plattformen seriell aktivieren:** **erst NACH** aktiver GA4-`bs_`-Firewall (Schritt 4).
   Meta → TikTok → Pinterest, jeweils via `*_TEST_EVENT_CODE` im Test-Events-Modus verifizieren,
   dann Prod-Tag entpausen. Verifikation: verification-runbook **Kap. 8 #4 + §9.3** (Server-CAPI
   ist **nicht** im Plattform-Test-Tab sichtbar → Beleg via `ud=attached` + EMQ).

**Ergebnis-Check:** echter Testkauf → Vercel-Log `[orders-paid] purchase sent … ud=attached`
(2xx) + echter Voll-Refund → `[refunds-create] refund sent … (txn <numerisch>, …)` mit
**gleicher** `transaction_id`.

**Bekannte Falle / Anti-Pattern #3 — Web-Pixel-purchase liefert NIE (Shop-Pay-Domain-Switch):**
- Der Browser-Web-Pixel-`purchase` (`fetch({keepalive:true})`) **erreicht GA4/Stape nie**: der
  Shop-Pay-Checkout wechselt die Domain (shop.app → …/thank-you) genau wenn der keepalive-fetch
  feuert → der In-Flight-Request stirbt (auf **beiden** Pfaden, ga4direct + stape). Deshalb ist
  **server-side `orders/paid` das Design, nicht optional** — den Live-Custom-Web-Pixel
  deaktivieren (Single-Source). Memory `web-pixel-purchase-delivery-failure`.

**Bekannte Falle / Anti-Pattern #4 — Flat-Payload-Money + `currentTotalPriceSet`-Falle:**
- **orders/paid** liefert Geld als **flache, HMAC-signierte REST-Felder** (`total_price`,
  `currency`, `line_items[].price`) → direkt vertrauen, **kein** Admin-Lookup nötig.
- **refunds/create-Gate:** das Order-Total für die Voll-Refund-Erkennung MUSS aus
  **`totalPriceSet`** (unveränderliches Original) kommen — **NICHT** `currentTotalPriceSet`,
  das bei einer Voll-Erstattung auf **`0.0`** fällt → „0.5 of 0.0" → Gate skippt → **jede
  Voll-Erstattung still gedroppt**. Zusätzlich: Shopify-Payments-Refunds settlen async (bei
  `refunds/create` ist der Status noch `PAID`, `totalRefunded=0.0`) → Full-Refund **aus dem
  Payload-Betrag** klassifizieren, nicht aus `displayFinancialStatus`. Memory
  `refund-webhook-pending-gate-bug`; Detail verification-runbook Block 2 (nicht doppeln).
- **`test_event_code`:** genau **EINEN** gleichzeitig, in Prod **leer** — Meta liest ihn aus
  den Event-Daten **mit Vorrang**, ein Rest-Code routet echte Conversions in den Test-Tab
  (Undercount).

---

## Schritt 6 — Klaviyo + Consent + Widerruf (Commerce/Legal)

**Status:** Fakten 🟢 verifiziert (PR #35; `.env.example`; Consent-Memories) · Reihenfolge 🟡 rekonstruiert.

**Voraussetzung:** Schritt 1 (Admin-Scopes für Order-Tag/Note). Storefront deployt.

**Aktion:**
1. **Klaviyo:** `KLAVIYO_PRIVATE_KEY` + `NEXT_PUBLIC_KLAVIYO_LIST_ID`. **Double-Opt-In pro
   Liste** konfigurieren (Lists & Segments → *(Liste)* → Settings → Opt-in Process = Double
   opt-in). Flows anlegen, deren Trigger-Namen **exakt** matchen: `Widerruf Eingegangen`
   (→ „Widerruf Bestätigung"-Mail, § 356a Abs. 4), `Widerruf Alert Intern`,
   `KLAVIYO_EDITORIAL_EVENT` (Prod: `Bestellung Editorial`).
2. **Consent (Shopify Customer Privacy API, headless):** `NEXT_PUBLIC_SILBE_CONSENT_STOREFRONT_DOMAIN`
   + `NEXT_PUBLIC_SILBE_CONSENT_CHECKOUT_DOMAIN` (Host aus `cart.checkoutUrl`) +
   `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN` (wiederverwendet).
3. **Widerruf (§ 356a BGB):** `WIDERRUF_TOKEN_SECRET` (`openssl rand -hex 32`) +
   optional `WIDERRUF_ALERT_EMAIL` (interne Benachrichtigung).

**Ergebnis-Check:** Consent-Banner öffnet + schreibt die Entscheidung nach Shopify zurück;
Newsletter-Signup löst die DOI-Mail aus; `/widerruf`-Flow taggt die Order + sendet die
Eingangsbestätigung.

**Bekannte Falle:**
- **Consent — alle drei Werte oder nichts:** fehlt einer der drei, ist `setTrackingConsent`
  ein stiller No-Op → `ConsentProvider` weigert sich, das Banner zu öffnen. Kein Teil-Setup.
- **Widerruf ist ein rechtliches Launch-Gate** (§ 356a BGB, seit 2026-06-19; Strafe bis
  €50.000/Verstoß, fehlender Button verlängert die Frist auf 12 Monate + 14 Tage) → **vor**
  dem öffentlichen Launch live. Shopify-Tag/Note = fail-loud (Wirksamkeit), Klaviyo-Mail =
  fail-soft.

---

## Schritt 7 — Gelato + SEO + Launch-Gate

**Status:** Fakten 🟢 verifiziert (PR #37; verification-runbook §9.1) · Reihenfolge 🟡 rekonstruiert.

**Voraussetzung:** Katalog + Storefront live.

**Aktion:**
1. **Gelato (Print-on-Demand):** `GELATO_API_KEY` + `GELATO_STORE_ID`; Gelato-Webhooks + eine
   Test-Order durch den ganzen Flow (Cart → Checkout → Payment → Gelato → Versand).
2. **SEO:** `METADATA_BASE_URL` (Prod-Domain; Fallback silbe.at). 301-Redirect-Map der
   Alt-URLs — beim DNS-Switch (Phase 11) erweitern.
3. **LAUNCH-GATE.**

**Ergebnis-Check:** Google Rich Results Test (1 PDP) grün; sitemap/robots erreichbar;
Test-Order in Gelato bestätigt.

**Bekannte Falle:**
- **LAUNCH-GATE — Stape Free→Paid VOR echtem Traffic:** der Free-Tier renewt Requests nicht
  (*„not subject to the pause logic"*) → der erste Traffic-Peak über das Monats-Limit killt
  das Tracking **permanent** (kein Auto-Reset), und der Keepalive schützt davor **nicht**
  (er löst nur den Inaktivitäts-Disable). verification-runbook §9.1.
- **301 = 308:** Next `permanent:true` emittiert **HTTP 308** (Google behandelt 308 ≡ 301).

---

## Anhang · Für Shop N+1 — forkbar vs. SILBE-spezifisch

**Forkbar (die Prozedur selbst):** die 7-Schritt-Dependency-Ordnung; die App-Identitäts-
Invariante; das „Signing-Secret ≠ Client-Secret"-Diagnosemuster; die Block-A-fail-fast-Regel;
das Stape-**Prinzip** (Firewall zuerst → CAPI-Mapping → serielle Aktivierung); die
Region-EU-Co-Location; server-side-Webhook statt Browser-Pixel; die Flat-Payload-/
`totalPriceSet`-Money-Regel; das `test_event_code`-serielle-Isolationsmuster; Keepalive +
Free→Paid-Launch-Gate.

**SILBE-spezifisch (ersetzen, nicht kopieren):** alle IDs/Secrets/Domains; die konkrete
Stape-Container-Config (bs_ud-Decode/Augment/V3-Firewall — Referenz Memory/Folds); der
Editorial-Metafield-Namespace `silbe` in ~7 Code-Dateien (**separate** Parametrisierung
neben `MARKER_NAMESPACE`); Klaviyo-Flow-/Event-Namen; Referenz-Order-Nummern.

**Cross-Referenzen:** `docs/verification-runbook.md` — Kap. 8 (Verifikations-Prozeduren pro
Block), §9 (Troubleshooting: 9.1 Stape-Auto-Disable/Keepalive/Launch-Gate, 9.2 asymmetrische
Debug-Instrumentierung, 9.3 Server-CAPI nicht im Test-Tab), Kap. 10 (Für-Shop-N+1 der
Tracking-Ebene).
