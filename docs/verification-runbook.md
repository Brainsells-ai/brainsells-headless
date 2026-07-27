# Verification Runbook — Real-Delivery-Beweis pro Tracking-Block

**Zweck.** Dieses Dokument beschreibt, **wie man beweist, dass ein Tracking-Event
tatsächlich geliefert wird** — pro Webhook / Pfad, mit konkretem Auslöser,
Beobachtungspunkt und Erfolgs-Kriterium. Es ist bewusst als *übertragbares*
Artefakt geschrieben: die Methode lag bisher nur verstreut in Session-Logs,
PR-Beschreibungen, Code-Kommentaren und CC-Project-Memories — in keinem einzigen
forkbaren Dokument.

Bezug: Blueprint-Readiness `b370004`, Area 2 + Prio #1.

> **Reine Doku.** Dieses Dokument ändert keinen Code. Das Ausführen der
> Verifikationen erfordert echte Test-Orders (0,50 €) und Zugriff auf Vercel /
> GA4 / die Plattform-Dashboards — es ist eine **Anleitung**, kein Skript.

---

## 0 · Die Ehrlichkeits-Regel (zuerst lesen)

Jede Verifikations-Aussage in diesem Repo MUSS ihren **Typ** tragen. Die
Verwechslung der beiden Typen ist die dokumentierte Trap-Klasse
**„LIVE-verified-on-narrow-test"** — mehrfach real passiert (siehe Historie
unten). Nie „verifiziert" schreiben ohne den Typ zu nennen.

| Typ | Bedeutung | Beweist NICHT |
|---|---|---|
| 🧪 **synthetisch verifiziert** | Unit-Test, Payload-Shape, `/debug`-Endpoint, lokal-signierter POST | dass Shopify/GA4/die Plattform das Event in Prod je empfängt |
| ✅ **real-delivery verifiziert** | eine **echte Shopify-Lieferung** wurde end-to-end beobachtet (echte Order/Refund → Prod-Function → downstream sichtbar) | — (das ist der Goldstandard) |

**Warum das kritisch ist — dokumentierte Fälle, in denen die zwei verwechselt wurden:**

- Der „refund verified in prod" (#1016) war **synthetisch** — die Order wurde nie
  echt erstattet; ein lokal-signierter POST gab 200. Echte Erstattungen (#1022/#1024)
  wurden danach still gedroppt (async-Settlement-Gate-Bug). → real erst mit #1025.
- Alle frühen `200`-Antworten der Webhooks waren **lokal-signierte synthetische
  POSTs**. **Jede echte Shopify-Lieferung gab 401** (HMAC-Secret-Mismatch), bis der
  Old-Secret-Fix (#53/#54) das aufdeckte.
- `apps/silbe/scripts/validate-refund-mp.ts` beweist nur die **Payload-Shape**
  gegen den GA4-`/debug/mp/collect`-Endpoint. Der Debug-Endpoint **zeichnet nichts
  auf** (kein Report, kein Realtime). Grün dort = 🧪, nie ✅.

**Faustregel:** Ein grüner Unit-Test, ein sauberer `/debug`-Response und ein
`200` auf einen selbst-signierten POST sind alle 🧪. ✅ gibt es nur, wenn eine
**echte Order** durchlief und der Beweis **downstream** (GA4 DebugView/Report,
Plattform-Test-Events, Vercel-Live-Log einer echten Lieferung) sichtbar war.

---

## 1 · Gemeinsame Voraussetzungen

### 1.1 Wo die Beweise leben (und wo NICHT)

| Quelle | Nutzbar für | Falle |
|---|---|---|
| **Vercel Runtime-Logs** | Live mitschauen während des Testkaufs | **Hobby-Plan retain't KEINE Runtime-Logs** — nur der Live-Stream. Nach dem Fakt ist die Zeile weg. → Log-Stream VOR dem Auslösen öffnen. |
| **GA4 DebugView** | purchase (mit `_dbg=1`), Parameter-Inspektion | Zeigt nur, was GA4 *empfängt*. Zeigt Geldwerte in **Micros** (0,50 → `500000`), reines Anzeige-Artefakt. Blind für Stape-seitiges Strippen. |
| **GA4 Reports → Monetization** | endgültiger Geldwert, purchase↔refund-Join | **Processing-Delay** (Stunden bis ~24–48 h). Nicht für sofortige Verifikation. |
| **Stape sGTM Dashboard** | — | **Free-Tier hat KEINE Request-Logs.** `/g/collect`-Ankunft ist Stape-seitig nicht inspizierbar → immer downstream beobachten. |
| **GTM Server Preview** | — | Gibt **500** auf jeden Hit (Infra-Defekt, format-/event-unabhängig). Preview-Pane ist tot → nicht darauf verlassen. |
| **Plattform Test-Events** (Meta Events Manager / TikTok Events / Pinterest) | CAPI user_data-Empfang | Nur sichtbar, solange ein `test_event_code` gesetzt ist. |

### 1.2 Env-Variablen (Vercel-Prod)

| Var | Rolle | Prod-Wert (SILBE) |
|---|---|---|
| `GA4_MEASUREMENT_ID` | GA4 Web-Stream-ID | `G-Z06HHP6EFM` |
| `GA4_API_SECRET` | MP-API-Secret (refund) | *(secret)* |
| `GA4_PURCHASE_DEBUG` | `1` → `_dbg=1` auf dem purchase-Hit (DebugView) | leer in Prod |
| `STAPE_SERVER_BASE` | EU-Stape-Container-Base | `https://ctsqyrwh.eus.stape.net` |
| `GTAG_GTM_FINGERPRINT` | gtag `gtm=`-Fingerprint (pinnt Wire-Format) | `45je` |
| `MARKER_NAMESPACE` | Order-Metafield-Namespace des Idempotenz-Markers | `silbe` |
| `META_TEST_EVENT_CODE` / `TIKTOK_TEST_EVENT_CODE` / `PINTEREST_TEST_EVENT_CODE` | CAPI-Test-Routing (genau EINE gleichzeitig) | leer in Prod |
| `SHOPIFY_WEBHOOK_SECRET` | Webhook-Signing-Secret | = **Old**-Client-Secret |
| `SHOPIFY_CLIENT_SECRET` | OAuth/Token-Mint | = **New**-Client-Secret |
| `SHOPIFY_HMAC_DEBUG` / `SHOPIFY_WEBHOOK_SECRET_OLD` | nur für HMAC-Diagnose (Block 3) | leer in Prod |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_SHOP` | Admin-Lookup + App-Identität | App **„silbe admin operations"** |

### 1.3 App-Identität & registrierte Webhooks (Invariante)

- **Registrierungs-App == Vercel-Verify-App == „silbe admin operations".** Shopify
  signiert Webhooks mit dem Secret der App, unter der sie registriert sind. Weichen
  Registrierungs- und Verify-App ab → **HMAC 401, Event still verloren**.
- Registrierte Topics: **`ORDERS_PAID` + `REFUNDS_CREATE`** (nur diese zwei).
  `order-created` (dormanter Klaviyo-Pfad) ist **bewusst nicht** registriert.

### 1.4 Der Standard-Testkauf-Lebenszyklus

Eine **einzige** echte 0,50-€-Order über den Lebenszyklus wiederverwenden:

1. **Kauf** (dbg-Order) → verifiziert Block 1 (purchase), 4 (CAPI), 5 (Region), 6 (item_variant).
2. **Voll-Refund derselben Order** → verifiziert Block 2 (refund) + den
   `transaction_id`-Join (Block 6).

**Invariante über alle Blöcke:** `transaction_id = numerische Order-ID`. purchase
(orders/paid) und refund (refunds/create) senden **denselben** Wert → GA4 joint
purchase↔refund automatisch. Ein Auseinanderlaufen bricht den Join still.

---

## 2 · Block 1 — purchase (orders/paid → Stape gtag `/g/collect` → GA4)

**Status: ✅ real-delivery verifiziert** — Order **#1020** (2026-06-30),
`transaction_id 13895477690708`; **nach Block A / brand.config-Refactor erneut
real-delivery bestätigt 2026-07-27** (Order 13965988561236, s. Kap. 8 #1).

Code: `apps/silbe/app/api/webhooks/orders-paid/route.ts` +
`apps/silbe/lib/tracking/ga4-gtag-purchase.ts`.

**Voraussetzungen**
- Webhook `ORDERS_PAID` unter „silbe admin operations" registriert.
- Vercel: `SHOPIFY_WEBHOOK_SECRET` (Old), `STAPE_SERVER_BASE`, `GTAG_GTM_FINGERPRINT`,
  `GA4_MEASUREMENT_ID`, `MARKER_NAMESPACE` gesetzt; Function-Region = Frankfurt (Block 5).
- `GA4_PURCHASE_DEBUG=1` **nur für den Verifikationslauf**, danach leer (sonst landet
  purchase in DebugView statt in Realtime/Reports).
- Live-Custom-Web-Pixel im Shopify-Admin **deaktiviert** (Single-Source; er lieferte
  ohnehin nie über den Shop-Pay-Domain-Switch).

**Auslöse-Schritt**
- Echte 0,50-€-Order abschließen (dbg-Order). `orders/paid` feuert bei Bezahlung.

**Beobachtungspunkt**
- **Vercel Live-Log-Stream** (vor dem Kauf öffnen).
- **GA4 DebugView** (weil `GA4_PURCHASE_DEBUG=1`).

**Erfolgs-Kriterium (konkret)**
- Vercel-Log:
  ```
  [orders-paid] purchase sent for <orderId> (0.50 EUR, <N> items, ud=attached|none)
  ```
  `purchase sent` loggt **nur** bei gtag-2xx (nicht bei 401/500/502).
- GA4 DebugView zeigt ein `purchase`-Event mit `transaction_id = <numerische
  Order-ID>`, `value` (als Micros angezeigt, s. u.), `currency`, `items`.

**Bekannte Fallen**
- **Micros-Artefakt:** DebugView zeigt `value` als `500000` für 0,50 € — reines
  Anzeige-Artefakt, **kein** Code-Bug. Der Draht sendet korrekt `epn.value=0.50`.
  (Der Report-Wert 0,50 ist separat offen — Verifikation #3.)
- **HMAC 401** → 1:1 Block 3. Ohne den Old-Secret-Fix gibt **jede echte Lieferung**
  401 und `purchase sent` erscheint nie.
- **Stape 502** → Block 5 (US-Region-Egress).
- `_dbg=1` in Prod vergessen → purchase landet nur in DebugView, nie in Reports.

---

## 3 · Block 2 — refund (refunds/create → GA4 MP direkt)

**Status: ✅ real-delivery verifiziert** — Voll-Refund auf **#1025** (2026-06-30),
`refund sent for #1025 (txn 13896958968148, 0.5 EUR)` + `200`.

Code: `apps/silbe/app/api/webhooks/refunds-create/route.ts` +
`apps/silbe/lib/refund-classify.ts` + `apps/silbe/lib/tracking/ga4-mp.ts`.

Anders als purchase geht refund **direkt an GA4 MP** (`/mp/collect`), nicht über
Stape. Der Handler macht einen Admin-Lookup (Order-Total + GA-Attribute), gatet auf
**Voll-Refund aus dem Payload-Betrag** (nicht `displayFinancialStatus`) und sendet.

**Voraussetzungen**
- Webhook `REFUNDS_CREATE` unter „silbe admin operations" registriert.
- `GA4_MEASUREMENT_ID` + `GA4_API_SECRET` in Vercel.
- Eine echte, **bezahlte** Order aus dem Testkauf-Lebenszyklus (Block 1),
  platziert **nach** dem GA-ID-Capture-Deploy (sonst nur synthetischer client_id).

**Auslöse-Schritt**
- Im Shopify-Admin die Order **voll erstatten** (0,50 €). `refunds/create` feuert bei
  Refund-**Erstellung** (nicht erst bei Settlement).

**Beobachtungspunkt**
- **Vercel Live-Log-Stream.**
- GA4: **Reports → Monetization** nach Processing-Delay (der prod-MP-Send setzt
  **kein** `debug_mode` → **nicht** in DebugView, und nach dem Session-Fenster auch
  nicht mehr in Realtime — *erwartet*).

**Erfolgs-Kriterium (konkret)**
- Vercel-Log:
  ```
  [refunds-create] refund sent for #<n> (txn <numerische Order-ID>, 0.5 EUR)
  ```
- `transaction_id` **identisch** zum purchase-Wert derselben Order → Join.
- Optional 🧪 Vorab-Shape-Check: `apps/silbe/scripts/validate-refund-mp.ts` gegen
  `/debug/mp/collect` (leeres `validationMessages`-Array = Shape gültig). **Beweist
  keine Real-Delivery.**

**Bekannte Fallen**
- **Async-Settlement (Shopify Payments):** bei Refund-Erstellung ist die Transaktion
  `REFUND/PENDING`, die Order **noch `PAID`**, `totalRefunded=0.0`. Ein Gate auf
  `displayFinancialStatus === 'REFUNDED'` **droppt jede Shopify-Payments-Erstattung
  still** (der Status flippt erst bei Settlement, und `refunds/create` feuert dann
  nicht erneut). Gelöst: `classifyRefund()` liest den Refund-Betrag aus dem Payload.
- **Falsches Order-Total:** `currentTotalPriceSet` fällt bei Voll-Refund auf `0.0` →
  „0.5 of 0.0" → Skip. Es MUSS `totalPriceSet` (unveränderliches Original) sein.
  (Bestätigt #1024: `totalPriceSet=0.5`, `currentTotalPriceSet=0.0`.)
- Skip-Zeile (kein Fehler, aber Beweis für „nicht voll"):
  ```
  [refunds-create] <name>: not a full refund (this <amt> + prior <p> of <total> <cur>, status <status>) — skipping
  ```
- **Vercel Hobby retain't keine Logs** → die Skip-Zeile ist nach dem Fakt unsichtbar;
  live mitschauen.

---

## 4 · Block 3 — HMAC (Signatur-Verifikation, Rotations-Sicherheit)

**Status: ✅ real-delivery verifiziert** — der Old-Secret-Match wurde auf einer
**echten** `orders/paid`-Lieferung diagnostiziert (#53), danach passierten echte
Lieferungen (#1020 purchase, #1024/#1025 refund) den Verify.

Code: `apps/silbe/lib/shopify-webhook-hmac.ts` (`verifyShopifyWebhook`,
`webhookSecretCandidates`).

**Kernfakt:** Shopify signiert die SILBE-Webhooks mit dem **„Old"-Client-Secret**;
OAuth/Token-Mint akzeptiert Old **oder** New. Der Verify ist rotations-sicher: er
matcht gegen **jeden** Kandidaten (`SHOPIFY_WEBHOOK_SECRET` → `_OLD` → `CLIENT_SECRET`).

**Voraussetzungen**
- `SHOPIFY_WEBHOOK_SECRET = <Old>`, `SHOPIFY_CLIENT_SECRET = <New>` in Vercel.

**Auslöse-Schritt (Diagnose-Modus, nur wenn ein 401-Verdacht besteht)**
- `SHOPIFY_HMAC_DEBUG=1` **und** `SHOPIFY_WEBHOOK_SECRET_OLD=<Old-Wert>` in Vercel →
  Redeploy. Dann eine echte dbg-Order auslösen.

**Beobachtungspunkt**
- **Vercel Live-Log** — die Kandidaten-Diagnose loggt bei Verify-Fehlschlag pro
  Kandidat `match=true|false` + Digest-Prefix + Body-Länge + sicheren Body-Prefix.
  **Nie der Secret-Wert, nie PII.**

**Erfolgs-Kriterium (konkret)**
- Eine echte Lieferung → Log zeigt z. B.:
  ```
  SHOPIFY_WEBHOOK_SECRET_OLD: match=true
  ```
  → das ist das Signing-Secret. `SHOPIFY_WEBHOOK_SECRET` darauf setzen,
  `SHOPIFY_HMAC_DEBUG`/`_OLD` wieder entfernen.
- Positiv-Beweis im Normalbetrieb: **kein `401`**, und die downstream-Logs
  (`purchase sent` / `refund sent`) erscheinen — HMAC hat auf einer **echten**
  Lieferung gepasst.

**Bekannte Fallen**
- **Synthetische Falle:** ein lokal mit dem `CLIENT_SECRET` signierter POST gibt
  immer `200` — das beweist nur, dass Handler+Secret intern konsistent sind, **nicht**
  dass Shopifys echte Signatur passt. Nur eine echte Lieferung zählt.
- **App-Identität:** Registrierungs-App ≠ Vercel-App → 401 trotz korrekten Codes
  (§1.3).
- 401-Antwortkörper: `{ "error": "Invalid HMAC" }`, Status `401`.

---

## 5 · Block 4 — CAPI user_data (Meta / TikTok / Pinterest)

**Status: ✅ real-delivery verifiziert (Empfang)** — alle drei CAPIs prod-live seit
2026-07-06: Meta (em/ip/ua empfangen), TikTok (Dataset `D8O0AK3C77UFPM6ENU20`),
Pinterest (Email-Match 94 %). Empirisch bestätigt (Schritt 0a): `client_details.
browser_ip` = **Kunden-IPv6** (nicht die fra1-Egress-IP), Email/UA befüllt, nicht
redacted. **⚠️ Offen:** EMQ/Match-Quality über Tage (Beobachtung), und die
GA4-Firewall-Exclusion von `bs_ud` (Verifikation #4).

Code: `apps/silbe/lib/tracking/user-data.ts` (`resolveConsentedUserData`) +
Verdrahtung in `orders-paid/route.ts`.

**Datenfluss:** `orders/paid` → Vercel `fra1` **hasht hier** (sha256(Email) +
Klartext-IP/UA) → ein `ep.bs_ud`-Param (base64url) auf dem gtag-Hit → Stape
dekodiert und mappt auf `user_data.email_address`/`ip_override`/`user_agent`
(Meta/TikTok/Pinterest-scoped) und **strippt `bs_ud` aus dem GA4-Tag**.

**Voraussetzungen**
- **Hard-Gate:** `bs_ud` wird nur gepackt, wenn die Order `_marketing_consent =
  'granted'` trägt (Cart-Attr aus PR A). denied/unknown/absent → kein Bundle, purchase
  geht trotzdem raus.
- **BLOCKING (Stape-manuell, vor jeder CAPI-Entpause):** die GA4-`bs_`-Exclude-
  Transformation MUSS Stape-seitig aktiv sein, **bevor** irgendein CAPI-Tag entpaust
  wird. Reihenfolge: **GA4-`bs_`-Exclude ZUERST → CAPI-user_data-Mapping → dann
  Meta → TikTok → Pinterest seriell.**
- Genau **EIN** `*_TEST_EVENT_CODE` gleichzeitig (erzwingt die serielle Reihenfolge).

**Auslöse-Schritt**
- `META_TEST_EVENT_CODE=<code>` in Vercel (nur Meta) → Redeploy. Echte
  0,50-€-Consent-Order (`_marketing_consent=granted`) auslösen. Danach für TikTok,
  dann Pinterest wiederholen.

**Beobachtungspunkt**
- **Meta Events Manager → Test-Events-Tab** (bzw. TikTok Events / Pinterest
  „Test events"). Das Event erscheint dort statt im Prod-Reporting.

**Erfolgs-Kriterium (konkret)**
- Im Test-Events-Tab erscheint ein `Purchase`-Event mit befülltem `user_data`:
  **Email (gehasht)**, **IP**, **User-Agent** — nicht leer, nicht redacted.
- Vercel-Log der Order zeigt `ud=attached` (nicht `ud=none`).
- Warn-Log solange ein Test-Code aktiv ist:
  ```
  [orders-paid] TEST-EVENT MODE active for: meta — these events route to the platform Test-Events tab, not prod. Unset in prod.
  ```

**Bekannte Fallen**
- **`test_event_code`-Vorrang-Footgun:** Meta liest `test_event_code` aus den
  **Event-Daten mit Vorrang**. Test-Codes daher **nur in manuelle Tag-Felder**, NIE in
  die Event-Daten schreiben. Ein in Prod vergessener Code routet echte Conversions in
  den Test-Tab (Undercount) — daher der Fail-loud-Warnlog.
- **IPv6-Akzeptanz** bei Meta/TikTok/Pinterest im Test-Schritt **verifizieren, nicht
  annehmen** (Pinterest niedrigere Confidence als Meta/TikTok).
- **`bs_ud` ist Klartext-IP/UA** → der einzige PII-Param. Debug-Logs redigieren ihn
  (`ep.bs_ud=<redacted>`); nie die rohe URL loggen.

---

## 6 · Block 5 — Vercel-Region (fra1) → EU-Routing zu Stape

**Status: ✅ real-delivery verifiziert** — implizit im grünen #1020 (der gtag-Send
gab `200` erst nach der Region-Umstellung; vorher `502`).

**Kernfakt:** Der gtag-`/g/collect`-Send an den EU-Stape-Container gibt **502 aus
Vercels Default-US-Region (`iad1`)** — Stapes Free-Tier-Proxy verträgt den US-Egress
nicht. Derselbe Hit aus der EU → `200`. (Der Refund-MP-Send an Google direkt gab aus
den USA 2xx — das Problem ist Stape-spezifisch.)

**Voraussetzungen**
- `apps/silbe/app/api/webhooks/orders-paid/route.ts` exportiert
  `preferredRegion = 'fra1'` (inline; Vercel liest das per Static-Analysis zur
  Build-Zeit — kein Runtime-Getter, dokumentierte Block-A-Ausnahme).
- **Auf Hobby ist der `export` nur ein Hint** → zusätzlich das **Projekt-Setting**:
  Vercel → Settings → Functions → Region → **Frankfurt**.

**Auslöse-/Beobachtungs-Schritt**
- Teil des purchase-Tests (Block 1): echter dbg-Kauf → Vercel-Log.

**Erfolgs-Kriterium (konkret)**
- gtag-Send gibt **`200`** (nicht `502`) → `purchase sent` erscheint.
- Kein `[orders-paid] gtag returned non-2xx: 502`.

**Bekannte Fallen**
- Das ist **kein** Request-Shape-/UA-Problem — der Shape ist identisch zum grünen
  Stufe-0-Hit. Nur der Egress-Standort zählt.
- Ein deterministischer Region-502 wird durch die `500-on-send-failure`-Logik NICHT
  maskiert (die triggert nur Shopify-Retries für *transiente* Fehler); der eigentliche
  Fix ist die Region.

---

## 7 · Block 6 — item_variant & Money-Felder (flat payload → gtag)

**Status: ✅ real-delivery verifiziert (item_variant)** — Order #1020: `~va` kommt
in GA4 an. **✅ Send-Pfad Money verifiziert** (`epn.value=0.50` korrekt gesendet).
**⚠️ Report-Anzeige 0,50** noch offen (Verifikation #3).

Code: `apps/silbe/lib/tracking/ga4-gtag-purchase.ts` (`gtagProducts`).

**Voraussetzungen**
- `GA4_PURCHASE_DEBUG=1` (für DebugView-Parameter-Inspektion).
- Idealerweise eine **Mehrformat-Edition** (A4/A3 …) im Warenkorb, damit ein echter
  Variantenname sichtbar wird (nicht `Default Title`).

**Auslöse-Schritt**
- Echter dbg-Kauf (Block 1), mind. ein Line-Item mit echter Variante.

**Beobachtungspunkt**
- **GA4 DebugView** → das `purchase`-Event → Item-Parameter.

**Erfolgs-Kriterium (konkret)**
- `item_variant` trägt den **echten** Variantennamen (z. B. `A4`), NICHT `Default
  Title` (Shopifys Einzel-Varianten-Default wird bewusst unterdrückt → GA4-Rauschen).
- `item_id`, `item_name`, `price`, `quantity` befüllt; `value` = 0,50 (in DebugView
  als Micros `500000`).
- Draht (zur Referenz): `pr1=id_<id>~nm<name>~pr<price>~qt<qty>~va<variant>`; die
  strukturellen `~` bleiben literal (kein `URLSearchParams` — es würde `~` zu `%7E`
  encodieren und die gtag-Produkt-Parsing brechen).

**Bekannte Fallen**
- **Micros-Artefakt** (s. Block 1) — 0,50 → `500000` in DebugView ist Anzeige, kein
  Bug. Der Report-Wert 0,50 ist die offene Bestätigung (Verifikation #3).
- `Default Title` als Variantenname = Einzel-Varianten-Rauschen → wird weggelassen;
  bei einer Single-Variant-dbg-Order also **erwartet kein `~va`**.

---

## 8 · Offene Real-Delivery-Verifikationen (Checkliste)

Vier Verifikationen sind noch **nicht** real-delivery-abgeschlossen. Jede ist als
ausführbare Anleitung beschrieben — **Ausführung braucht echte Orders / Merlin**.

### ✅ #1 — Block-A-Post-Merge-Watch (brand.config lazy getters)

**Status: ✅ real-delivery verifiziert 2026-07-27 (Order 13965988561236).**
`[orders-paid] purchase sent … 0.50 EUR, ud=attached` (**2xx**) **und** `[refunds-create]
refund sent … 200` liefen — beide **ohne** `[brand.config] required env var …`-Throw ⇒
die lazy Getter feuern mit echten env.
- **Kauf-Seite:** ✅ real-delivery verifiziert.
- **Refund-Seite:** 🔵 **gesendet (2xx)** + Block-A-Getter bestätigt, aber das
  GA4-**Recording** ist damit NICHT bewiesen (refund hat keine DebugView-Instrumentierung;
  prod `/mp/collect` dropt malformed still) → Recording-Beweis nur im Monetization-Report
  (+24–48 h, s. #3-Mechanik). Nicht als „verifiziert" abhaken.

Historischer Watch: der Refactor war gemergt, aber die lazy fail-fast Getter feuern erst
beim ersten echten Request — genau das ist mit obiger Lieferung eingelöst.

- **Auslöser:** nächster echter Kauf / Refund (Standard-Lebenszyklus §1.4).
- **Beobachtung:** Vercel Live-Log. **⚠️ Falle (Vercel Hobby):** der Plan retain't
  **keine** Runtime-Logs — nur der Live-Stream zeigt sie. Den Dashboard-Log-Stream
  (oder `vercel logs <url>`) also **vor** dem Auslösen öffnen; nach dem Fakt ist die
  Zeile weg. Der Log-Beobachter muss im **Kaufmoment** live mitlesen.
- **Erfolg:** `purchase sent` **und** `refund sent` erscheinen wie zuvor; **kein**
  `[brand.config] required env var … is not set`-Throw. Ein Throw ⇒ ein Env-Key fehlt
  oder ist in Vercel-Prod falsch benannt (die 4 Block-A-Keys: `STAPE_SERVER_BASE`,
  `GTAG_GTM_FINGERPRINT`, `MARKER_NAMESPACE`, `KLAVIYO_EDITORIAL_EVENT`).
- **Warum es zählt:** CI-Build/vitest triggern die Getter **nicht** (lazy) → ein
  fehlender Key fällt erst zur Request-Zeit auf, nicht im grünen CI.

### ☐ #2 — Idempotenz-Marker mit ECHTER Doppellieferung

**Status: 🧪 Logik + Unit-Test verifiziert; echte Doppellieferung OFFEN** (Stand
2026-07-24 — in v2-Durchgang bewusst nicht erzwungen, s. „Ausführbarkeit" unten).

**Dedup-Mechanismus (aus dem Code, `apps/silbe/lib/shopify-purchase-marker.ts` +
`orders-paid/route.ts`):**
- Dedup-Schlüssel = **Order-Metafield `silbe.ga4_purchase_sent`** (namespace `silbe`,
  key `ga4_purchase_sent`, type boolean) — liegt **auf der Order** (owner =
  `gid://shopify/Order/<numerische Order-ID>`).
- Ablauf: **read VOR dem Send** (`ga4PurchaseAlreadySent` → `value === 'true'`) →
  gtag-Send → **mark NACH 2xx** (`markGa4PurchaseSent`).
- ⇒ **Redelivery DERSELBEN Order** trifft denselben Owner → `true` → Skip. **Ein
  zweiter Kauf** = neue Order-ID = neuer Owner = **kein** Dedup. Die Doppellieferung
  muss also *dieselbe* `orders/paid`-Lieferung sein, nicht ein neuer Kauf.

**Ausführbarkeit — warum echt-provozieren auf dieser Infra hakt (v2-Befund):**
- **Kein Admin-Resend:** die Webhooks sind **per API unter der App „silbe admin
  operations" registriert** (`register-webhooks.ts` → `webhookSubscriptionCreate`).
  API-/App-registrierte Webhooks erscheinen **NICHT** unter Admin → Settings →
  Notifications → Webhooks (die Seite listet nur admin-UI-erstellte Store-Webhooks),
  und Shopify bietet dafür **kein Ein-Klick-Resend**.
- **Payload-Replay** (exakten signierten Roh-Body + `x-shopify-hmac-sha256` einer
  echten Lieferung 2× an den Prod-Endpoint POSTen) ist der einzige zuverlässige Weg —
  aber den signierten Body **code-frei auf Vercel Hobby abzugreifen ist nicht möglich**
  (wir loggen ihn bewusst nicht — PII), und die Signatur lässt sich ohne das
  Old-Secret nicht fälschen.
- **Shopify CLI `shopify webhook trigger` hilft nicht** (Sample-Payload, keine echte
  Order-ID, HMAC matcht das Old-Secret nicht).

**Erfolgs-Kriterium (falls doch ausgeführt):** 1. Zustellung → `purchase sent`;
2. Zustellung derselben Lieferung →
  ```
  [orders-paid] <orderId>: purchase already sent — skipping (idempotent)
  ```
  und GA4 zeigt **genau ein** `purchase` für die `transaction_id` (Revenue nicht
  verdoppelt).

**Falle:** Read-check-then-write ist **nicht atomar** — zwei *echt gleichzeitige*
Lieferungen (beide im Read+Send+Write-Fenster, separate Function-Instanzen) könnten
beide senden. Shopifys Duplikate sind aber überwiegend **verzögerte** Redeliveries
(die der Marker fängt). CAPI-seitig fängt zusätzlich `event_id = Order-ID` das
Duplikat.

**Empfohlener nächster Schritt (eigener Block, nicht dieser Lauf):** ein
env-gegateter Debug-Replay-Endpoint, der einen einmal-gecaptureten signierten Body
kontrolliert 2× durchspielt — damit wird die echte Doppellieferung code-gestützt und
reproduzierbar, ohne PII-Logging im Normalpfad.

### ☐ #3 — GA4-Reports zeigen 0,50 (nicht 500000)

DebugView zeigt Geld in **Micros** (`500000`). Dass die **Reports** den korrekten
`0,50 €` zeigen, ist noch nicht bestätigt.

- **Auslöser:** eine **debug-OFF**-Order (`GA4_PURCHASE_DEBUG` leer), z. B. eine echte
  Kundenorder oder der #1020-Nachfolger.
- **⚠️ NICHT der Debug-Verifikationskauf:** ein Kauf mit `GA4_PURCHASE_DEBUG=1`
  (`_dbg=1`) landet in DebugView, aber **nicht** in den Standard-Reports (s. Block 1
  Falle) → in der Monetization-Report ist er gar nicht zu finden. Der Report-Check
  braucht daher eine **eigene, debug-off Order** und ist vom Debug-Kauf (Checks #1/#4
  = Merlins Check 1/2) **entkoppelt**.
- **Beobachtung:** GA4 → **Reports → Monetization → E-Commerce-Käufe** (oder Explore,
  gefiltert auf die `transaction_id`) **nach** dem Processing-Delay (~24–48 h).
- **Erfolg:** Item-/Event-Umsatz für die Order = **0,50 EUR**, NICHT `500000`. Das
  bestätigt, dass `500000` ein reines DebugView-Micros-Artefakt war und der Send-Pfad
  korrekt ist.
- **Falle:** Nicht in Realtime/DebugView prüfen (dort das Micros-Artefakt); nur der
  verarbeitete Report teilt durch 1e6.

### ✅ #4 — GA4-Firewall: `bs_ud` kommt NICHT in GA4 an

**Status: ✅ real-delivery verifiziert 2026-07-27 (Order 13965988561236).**
**DebugView ist NICHT blind** — die gepaarte Beobachtung (**Draht-Log + DebugView-Params**)
beweist die Firewall, am 2026-07-27 empirisch bestätigt. Die alte „DebugView blind"-Annahme
ist damit **endgültig invalidiert**:
- **Draht:** der prod `[orders-paid] … [debug] <safeUrl>`-Log (bei `GA4_PURCHASE_DEBUG=1`)
  zeigte `ep.bs_ud=<redacted>` **und** `ep.bs_test_meta=TEST64632` auf dem ausgehenden Hit.
- **GA4:** die DebugView-Param-Liste des purchase-Events (Order 13965988561236, value 0.5)
  enthielt **weder `bs_ud` noch `bs_test_meta`** (nur currency, debug_mode, event_id,
  transaction_id, value, ga_session_*, engagement_time_msec, batch_page_id,
  non_personalized_ads).
- ⇒ bs_ud/bs_test_* gingen an Stape rein, kamen bei GA4 nicht an = **Firewall bewiesen**.

**Separate, noch offene Leg — CAPI-Enrichment:** dass Stape `bs_ud` korrekt DEKODIERT und
em/ip/ua an die CAPI-Tags weiterreicht, ist eine *andere* Aussage als die GA4-Exclusion
und wird über den Meta/TikTok/Pinterest-Test-Events-Tab bestätigt (⚠️ Meta-Check am
2026-07-27 noch ausstehend). Der Firewall-Beweis oben hängt **nicht** daran — die
Draht-Präsenz ist **direkt geloggt**, nicht aus dem CAPI-Empfang erschlossen.

Historisch: die Exclusion ruhte auf der Stape-V3-Blocklist-Config und galt als „nie direkt
beobachtet" (DebugView „blind", Stape-Logs gesperrt) — mit obiger gepaarter Beobachtung erledigt.

**Voraussetzungen (in Vercel-Prod, VOR dem Kauf — sonst ist der Trigger tot):**
- `GA4_PURCHASE_DEBUG=1` — sonst kein `_dbg=1` → purchase nicht in DebugView →
  Inspektionsweg-Punkt 1 unmöglich.
- **Genau EIN** `*_TEST_EVENT_CODE` (z. B. `META_TEST_EVENT_CODE`) — sonst ist der
  CAPI-Empfang (Punkt 2) nicht im Test-Events-Tab sichtbar.
- Beim Checkout **Marketing-Consent = granted** akzeptieren — sonst `bs_ud = null`
  (`ud=none`), der Hit trägt kein `bs_ud`, und die Absenz in GA4 beweist nichts.
- **NACH dem Lauf beides wieder RAUS** (`GA4_PURCHASE_DEBUG` + `*_TEST_EVENT_CODE`):
  ein vergessener Test-Code routet echte Conversions in den Test-Tab (Undercount),
  ein vergessenes Debug-Flag hält echte Käufe aus den Reports.

- **Inspektionsweg (der die „blind"-Annahme auflöst):** eine **Consent-Order**
  (`_marketing_consent=granted`) mit `GA4_PURCHASE_DEBUG=1` auslösen, sodass `bs_ud`
  **tatsächlich auf dem Hit ist**. Dann die **gepaarte** Beobachtung:
  0. **Draht (Vercel-Log):** der `[orders-paid] … [debug] <safeUrl>`-Log zeigt
     `ep.bs_ud=<redacted>` (+ ggf. `ep.bs_test_*`) — **direkter** Beweis, dass `bs_ud` an
     Stape RAUSGING (der Wert ist redigiert, der Param selbst ist sichtbar). Das ist der
     saubere „auf-dem-Draht"-Beleg — nicht aus dem CAPI-Empfang erschließen müssen.
  1. **GA4 DebugView** → das `purchase`-Event → Parameter-Liste inspizieren:
     **kein** `bs_ud` (und kein `bs_test_*`) vorhanden.
  2. **Gleicher Hit**, Plattform-Test-Events (**separate Leg — CAPI-Decode, nicht Teil des
     Firewall-Beweises**): Meta/TikTok/Pinterest **haben** em/ip/ua empfangen → bestätigt,
     dass Stape `bs_ud` dekodiert und weiterreicht.
- **Erfolg:** `bs_ud` **präsent im Stape-Input** — am direktesten via dem prod
  `[debug] <safeUrl>`-Draht-Log (Punkt 0); CAPI-Empfang ist ein zweiter, indirekter Beleg
  — **UND absent in den GA4-Event-Parametern** (DebugView, Punkt 1). Beides zusammen
  beweist die Firewall.
- **Falle:** `bs_ud`-Absenz allein in DebugView beweist **nichts**, wenn der Hit gar
  kein `bs_ud` trug (kein Consent / Debug aus). Die gepaarte Beobachtung auf **einer
  einzigen consented Debug-Order** ist der Punkt.

---

## 9 · Für Shop N+1 (Blueprint-Fork)

Beim Forken auf einen neuen Shop: der **generische Teil ist die Methode**, der
**SILBE-spezifische Teil sind Werte**, die neu parametrisiert werden müssen.

### SILBE-spezifisch — ersetzen (kein Copy-Paste)

- IDs/Secrets: `GA4_MEASUREMENT_ID=G-Z06HHP6EFM`, `GA4_API_SECRET`.
- Stape: Base `ctsqyrwh.eus.stape.net`, `GTAG_GTM_FINGERPRINT=45je`.
- Marker-Namespace `silbe`; Klaviyo-Event-Name.
- CAPI-Ziele: TikTok-Dataset `D8O0AK3C77UFPM6ENU20`, Meta-/Pinterest-Dataset/Pixel-IDs.
- Shopify: App-Name „silbe admin operations", `SHOPIFY_SHOP`, und der Fakt
  **Signing-Secret = „Old"-Client-Secret** (rotations-historie-abhängig, pro Shop
  anders).
- Region `fra1` (EU-Shop; ein US-Shop hätte einen anderen Stape-Container / eine
  andere Region).
- Referenz-Order-Nummern (#1020/#1025 …) sind Belege, keine Konfiguration.

### Generisch — die forkbare Methode

- Die **🧪-vs-✅-Unterscheidung** (Kap. 0) und **warum `/debug`-Endpoints + Unit-Tests
  nie Delivery beweisen**.
- **Server-side Webhook schlägt Browser-Pixel**, wenn der Checkout die Domain
  wechselt (keepalive-fetch stirbt).
- **HMAC-Kandidaten-Diagnose:** pro Kandidat `match=true` auf einer echten Lieferung
  loggen (kein Secret-Leak) — deckt Client-vs-Signing-Secret-Mismatch auf.
- **EU-Region-Co-Location** für den Stape-Egress (Free-Tier-US-502).
- **Idempotenz per Order-Metafield** (DB-frei, forkbar) + der nicht-atomare-Caveat.
- **`test_event_code` seriell** (eine Plattform zur Zeit) + der **„reads from event
  data with precedence"-Footgun**.
- **Micros-Anzeige-Artefakt** in DebugView (Geld ×1e6).
- **Vercel-Hobby retain't keine Logs** → live mitschauen; **Stape-Free-Tier hat keine
  Request-Logs** → immer downstream beobachten.
- Die **gepaarte-Beobachtung-Firewall-Prüfung** (CAPI-Empfang + GA4-Absenz auf
  demselben consented Hit).
- **`transaction_id = numerische Order-ID`** als purchase↔refund-Join-Invariante.

---

## Anhang · Log-Zeilen-Katalog (Suchmuster für Vercel-Live-Logs)

| Zeile | Bedeutung |
|---|---|
| `[orders-paid] purchase sent for <id> (…, ud=attached\|none)` | ✅ purchase-Send gtag-2xx |
| `[orders-paid] <id>: purchase already sent — skipping (idempotent)` | Idempotenz-Marker greift |
| `[orders-paid] gtag returned non-2xx: <status>` | Send-Fehler (502 = Region, s. Block 5) |
| `[orders-paid] TEST-EVENT MODE active for: <platform>` | Ein `*_TEST_EVENT_CODE` ist gesetzt |
| `[refunds-create] refund sent for #<n> (txn <id>, 0.5 EUR)` | ✅ refund-MP-2xx |
| `[refunds-create] <name>: not a full refund (…) — skipping` | Refund-Gate: nicht voll |
| `SHOPIFY_WEBHOOK_SECRET_OLD: match=true` | HMAC-Diagnose: Signing-Secret gefunden |
| HTTP `401 {"error":"Invalid HMAC"}` | Secret-Mismatch oder App-Identitäts-Mismatch |

**Referenz-Orders:** purchase #1020 (`txn 13895477690708`), refund #1025
(`txn 13896958968148`), HMAC-Diagnose/Refund-Gate #1024 (`totalPriceSet=0.5`,
`currentTotalPriceSet=0.0`).
