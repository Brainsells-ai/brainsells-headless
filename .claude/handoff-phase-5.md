# Hand-off — Phase 5 (Header · Footer · Navigation · Klaviyo)

**Status:** Phase 5 closed on 2026-05-12. main HEAD `a0c6a06` (4 PRs
merged sequentially: #14 feature · #15 + #16 + #17 test/copy fixes).
Header trimmed to 2 nav-links, MobileDrawer restructured, Footer
rebuilt as 3-column with Klaviyo newsletter wiring, `/werkstatt`
renamed to `/ueber-uns`, copyright corrected to legal entity.

---

## Was wurde gemerged

| PR | Squash | Files | LOC | Inhalt |
|---|---|---|---|---|
| #14 | `7f2e516` | 11 | +541 / -305 | Phase-5 Feature (Header + Footer + MobileDrawer + Klaviyo + `/ueber-uns` Stub) |
| #15 | `30e9b17` | 1 | +50 / -25 | Layout-e2e an Phase-5-Struktur angepasst |
| #16 | `17a2c28` | 1 | +4 / -2 | Footer-Legal-Links strict-mode-match (`exact: true`) |
| #17 | `a0c6a06` | 2 | +3 / -3 | Kontakt-Email `.de → .at` Tippfix |

### Neue Files

- `apps/silbe/lib/klaviyo.ts` — server-only Klaviyo-Client, REST API
  Revision `2024-10-15`, Endpoint `profile-subscription-bulk-create-jobs`,
  typed `KlaviyoSubscribeResult` (`ok | invalid_email | auth | rate_limit | config | unknown`).
  Niemals `KLAVIYO_PRIVATE_KEY` loggen oder werfen.
- `apps/silbe/app/actions/subscribe.ts` — Server Action mit
  plain-regex Email-Validation + Pflicht-Consent + deutschsprachige
  Error-Messages. Liest `NEXT_PUBLIC_KLAVIYO_LIST_ID` + `KLAVIYO_PRIVATE_KEY`
  aus env.
- `apps/silbe/components/layout/NewsletterForm.tsx` — Client-Insel mit
  `useActionState` + consent-controlled `disabled`-Submit + Success-State
  ersetzt Form mit DOI-Hinweis („Bitte bestätigen Sie die Anmeldung in
  Ihrem Posteingang.").
- `apps/silbe/app/(frontend)/ueber-uns/page.tsx` — RSC-Stub, H1 + 2
  Absätze. Editorial-Pass deferred → polish-list.

### Modifizierte Files

- `Header.tsx` — `NAV_LINKS` 4 → 2 (Editionen · Über uns). Wordmark-Image
  + Sticky + Hairline-Border unverändert.
- `MobileDrawer.tsx` — Stimmen-Sub-Menü + Bibliothek + Werkstatt +
  Kontakt aus Primary-Nav entfernt. Neuer Sekundär-Block „Rechtliches"
  mit 4 Links (Impressum · AGB · Datenschutz · Widerrufsrecht), Inter
  14px taupe, Hairline-Separator. Focus-Trap + Escape + body-scroll-lock
  unverändert.
- `Footer.tsx` — 4 → 3 Spalten (Brand+Newsletter / Rechtliches / Kontakt).
  Manifest-Block (~120 LOC) → kurze Tagline „Wir sehen die Edition als
  die kleinste Form eines Verlags." Alte `NewsletterFormSlot` durch
  `<NewsletterForm />` Client-Insel ersetzt. Copyright auf
  „© 2026 Brainsells e.U. · Wien" korrigiert (UID + silbe.at + SILBE-Brand
  raus, UID gehört ins Impressum).
- `next.config.ts` — `/pages/ueber-uns → /werkstatt` umgebogen auf
  `→ /ueber-uns`. Neuer 308 `/werkstatt → /ueber-uns`.
- `.env.example` — Klaviyo-Vars umbenannt: `KLAVIYO_API_KEY → KLAVIYO_PRIVATE_KEY`,
  `KLAVIYO_NEWSLETTER_LIST_ID → NEXT_PUBLIC_KLAVIYO_LIST_ID`. Inline-Kommentar
  zu Double-Opt-In-Aktivierung in Klaviyo-Dashboard.
- `scripts/content-lint.ts` — `lib/klaviyo.ts` zu `SELF_EXEMPT`
  hinzugefügt: die API-Strings „subscription" / „subscriptions" sind
  Vendor-Nomenklatur (Klaviyo-Endpoint-Pfad), keine User-Copy.
- `tests/e2e/layout.spec.ts` — alle 3 Specs an Phase-5-Struktur
  angepasst: drawer-test prüft Editionen + Über uns + Rechtliches-Block
  statt Stimmen-Sub; footer-test prüft 6-Link Rechtliches-Spalte +
  Kontakt-Spalte + Tagline + Newsletter-Form statt „Alle Editionen" + 5
  Stimmen; redirect-test prüft `/werkstatt → /ueber-uns` und
  `/pages/ueber-uns → /ueber-uns`. Alle Footer-Link-Assertions mit
  `exact: true` damit das „Datenschutzerklärung"-Link in der Newsletter-
  Consent-Zeile nicht substring-matched.
- `docs/polish-list.md` — Phase-5-Deferrals-Sektion mit 7 Items
  angehängt (siehe unten § Polish-list deltas).

## Architektur-Entscheidungen fixiert in PR #14 (TECH, locked 2026-05-12)

Phase-6+ Arbeit muss diese Entscheidungen respektieren oder explizit
revidieren.

- **2 Primary-Nav-Links, Periode.** Editionen + Über uns. Mega-Menu
  ist Phase-2+ per Playbook §5; Suche Phase 7+; Account nicht geplant
  (Shopify-hosted Checkout hat eigenen Account-Flow). Stimmen +
  Bibliothek + Werkstatt + Kontakt bleiben unverlinkt bis Phase 7+.
- **`/werkstatt`-Konzept abgelöst zugunsten `/ueber-uns`.** Werkstatt
  klang editorial-craft, war aber semantisch unklar. Über uns ist
  Standard-Konvention DACH-E-Commerce, sucht klarer in der Mobile-Nav.
- **Rechtsseiten flat, nicht gruppiert.** Routes: `/impressum`, `/agb`,
  `/datenschutz`, `/widerrufsrecht`, `/widerrufsformular`, `/versand`,
  `/cookie-einstellungen`. Keine `/rechtliches/[slug]`-Gruppierung —
  flat ist SEO-üblicher (Impressum als top-level), Sitemap einfacher,
  externe Backlinks robuster.
- **Image-Wordmark statt Text-Wordmark.** `wordmark-hot2-transparent-{ink|cream|gold}.png`
  bleibt, weil Brand-Asset existiert und stärker ist als Cormorant-Fallback.
- **Copyright = Rechtsträger, nicht Brand.** „© 2026 Brainsells e.U. ·
  Wien". UID gehört ins Impressum (Site-Review §48), nicht in den
  Footer-Bottom.
- **Newsletter = Klaviyo Server Action.** `NewsletterForm` ist eine
  separate Mini-Client-Insel (`useActionState` + consent-State), nicht
  Teil der Cart-Familie. Triadic-Stack-Regel meint „eine Funktional-
  Familie", nicht „global einzige Insel" — Cart-Familie + MobileDrawer +
  NewsletterForm sind 3 sauber getrennte Inseln.
- **Double-Opt-In wird per-List in Klaviyo konfiguriert, nicht im
  API-Payload.** Server Action callt `profile-subscription-bulk-create-jobs`
  mit `consent: 'SUBSCRIBED'`; Klaviyo entscheidet via List-Setting, ob
  Bestätigungs-Email gesendet wird. **Kritisch:** Liste MUSS auf DOI
  stehen, sonst Single-Opt-In = GDPR-Verletzung in DACH.
- **`KLAVIYO_PRIVATE_KEY` nur server-side.** Auch wenn der
  Subscribe-Endpoint vom Server gecallt wird, exposed `NEXT_PUBLIC_`
  Vars sind im Bundle. `NEXT_PUBLIC_KLAVIYO_LIST_ID` ist Public
  by-design (Listen-ID ist nicht sensitiv); `KLAVIYO_PRIVATE_KEY` ist
  ohne NEXT_PUBLIC_ und nur in Server Actions verfügbar.
- **`hallo@silbe.at`, nicht `.de`.** PR #17 Korrektur. `.de` war
  Tippfehler im ursprünglichen Spec.

## Acceptance gates (pre-merge, alle grün)

- ✅ `pnpm exec tsc --noEmit` clean (local + CI)
- ✅ `pnpm lint:content` 59 targets, 0 forbidden phrases
- ✅ `pnpm build` 14 Routes — 8 PDPs SSG, `/` Static, `/ueber-uns`
  Static, `/_not-found` Static, 4 Payload-Routes Dynamic
- ✅ Playwright CI suite green nach PR #16 (alle 72 Tests, vorher 67/72
  failed-down auf 5 → 2 → 0)

## Smoke-Tests pre-merge (PR #14 inkl. follow-ups)

Smoke via Playwright-MCP gegen `localhost:3000` (Turbopack, Next.js
16.2.4) auf 1280×800 Desktop + 375×812 Mobile.

**Desktop:**
- Header: Wordmark links, 2 Nav-Links (Editionen + Über uns) zentriert,
  Cart-Icon rechts, Cream-Hintergrund, Hairline-Border bottom.
- Footer: 3 Spalten (Brand+Newsletter / Rechtliches / Kontakt), Tagline
  Cormorant italic, Copyright Inter klein.
- Newsletter: Submit disabled ohne Consent (opacity 0.55, `aria-disabled`,
  `cursor: not-allowed`); nach Checkbox-Click → enabled.
- 7 Rechtliches-Links mit korrekten hrefs.
- Kontakt zeigt `hallo@silbe.at` als mailto-Link.

**Mobile:**
- Hamburger-Trigger links, öffnet Drawer von links.
- Drawer öffnet via `aria-expanded` toggle, body-scroll-lock greift,
  Focus auf Close-Button.
- 2 Primary-Links (Cormorant 24px) + 4 Rechtliches-Links (Inter 14px
  taupe) mit Hairline-Separator.
- ESC schließt Drawer, restored body-scroll, refocused Trigger.

**Redirects (curl gegen Dev-Server):**
- `/werkstatt → 308 → /ueber-uns` ✓
- `/pages/ueber-uns → 308 → /ueber-uns` ✓
- `/ueber-uns → 200` ✓

**`/ueber-uns` Page:** H1 „Über uns" + 2 Absätze, Title-Template
„Über uns · SILBE".

**Klaviyo-Submit nicht live-getestet** — keine `KLAVIYO_PRIVATE_KEY` in
`.env.local`. UI-States (idle, disabled, enabled) verifiziert; API-Call
+ Success-State benötigen Live-Klaviyo-Setup.

## Polish-list deltas added in Phase 5

7 neue Einträge in `docs/polish-list.md § Phase 5`:

- `/ueber-uns` Editorial-Pass (Aleks): final copy statt Stub
- 7 Rechtsseiten-Content (Aleks + IT-Recht Kanzlei): /impressum, /agb,
  /datenschutz, /widerrufsrecht, /widerrufsformular, /versand,
  /cookie-einstellungen
- Cookiebot Integration (separater Sprint, getrennt von Klaviyo/GA4)
- Klaviyo Profile-Properties Enrichment (UTM, Landing-Page, Locale)
- Newsletter Anti-Spam (Honeypot / hCaptcha, wenn Spam-Subscribes
  auftauchen)
- Komplette 301-Map vom alten Liquid-Theme (vor DNS-Switch)
- `/stimmen` + `/bibliothek` Listing-Routes (Phase 7+)

## Pending Aleks-Actions vor Production-Deploy

1. **Klaviyo-Liste anlegen** + Double-Opt-In aktivieren (Lists &
   Segments → \<list\> → Settings → Opt-in Process = Double opt-in) +
   Bestätigungs-Email-Template einrichten.
2. **Vercel env-Vars setzen:** `KLAVIYO_PRIVATE_KEY` (private) +
   `NEXT_PUBLIC_KLAVIYO_LIST_ID` (public).
3. Klaviyo „From"-Email auf `hallo@silbe.at` setzen damit Brand-
   Konsistenz mit Footer.

## Carry-forward zu Phase 6

- **`/editionen` Listing-Route** — collection-grid mit existierendem
  `SummaryProduct`-Shape, gleiches SSG/ISR-Profil wie PDP. Höchste
  user-sichtbare 404-Auflösung.
- **VariantSelector (A3/A2-Picker)** — gewired in PDP-Hero,
  `?variant=`-URL-State, `AddToCartButton` zieht `variantId` aus
  Selector statt `variants[0]`. Multi-Variant Hero-SKUs
  (Rilke-Hero, Mann-Einsamkeit-Hero, Zweig-Memorial) zeigen aktuell
  nur Standard-Variante.
- **Custom `not-found.tsx`** — SILBE-branded 404-Page (Phase-0
  polish-item). Ersetzt gleichzeitig `/warenkorb`-Stub (Phase-4
  polish-item).
- **CH-Geo-Detection** — `FreeShipBar` zone-keyed threshold
  (€39 DE/AT · €69 CH). `SURFACE_COPY.free_shipping_threshold`
  re-introduce mit zone-keyed Shape.

## Phase 5 entry points (in case of revisit)

- Klaviyo-Liste-Setup blockt Live-Newsletter — User-Action, kein Code.
- 7 Rechtsseiten als 404 by-design — kommt mit Legal-Sprint, IT-Recht
  Kanzlei.
- Cookiebot wird parallel zu GA4 / Meta-Pixel kommen, eigener Sprint.

## Bekannte Probleme (non-blocking)

- **`KLAVIYO_PRIVATE_KEY` nicht in `.env.example` mit Default-Wert** —
  bewusst leer, Vercel-prod muss manuell setzen.
- **Klaviyo Error-Handling: keine Retry-Logik** bei 429 / 5xx. Server
  Action returnt deutsche Error-Message, Form bleibt offen. Polish:
  exponential backoff für 429 wäre nice-to-have.
- **`/ueber-uns` ist 2-Absatz-Stub** — Editorial-Inhalt fehlt, kein
  Bild, keine Personalisierung („Aleks & Merlin"-Zeile aus Homepage-
  Editorial-Brief-Sektion könnte hierher migrieren).
- **`/werkstatt → /ueber-uns` Redirect ist defensiv** — physisches
  `/werkstatt/page.tsx` existierte nie, der Redirect ist nur für
  externe Backlinks (alte Shopify-Theme-URLs).

## Bug-Spur dieser Phase (R5 Honest)

Phase 5 lief in 4 PR-Iterationen statt 1, weil ich `tests/e2e/layout.spec.ts`
vor dem Build nicht inventarisiert habe. Phase-4-Handoff erwähnte 46
PDP-Tests, nicht Layout-Tests. Folge:

1. **PR #14:** CI rot mit 5 Playwright-Failures (drawer Stimmen-Sub +
   footer „Alle Editionen" + redirect `/pages/ueber-uns → /werkstatt`).
   Squash-Merge geschah BEVOR mein Test-Fix gepusht war (Race-Condition
   zwischen meinem investigation→fix-cycle ~3min und Merge-Click).
2. **PR #15:** Test-Fix für Phase-5-Struktur. Reduziert auf 2
   Failures.
3. **PR #16:** Strict-mode-Fix — `getByRole('link', { name: 'Datenschutz' })`
   substring-matched 2 Elemente (Rechtliches-Spalte + „Datenschutzerklärung"
   in Newsletter-Consent-Text). `{ exact: true }` lock-in.
4. **PR #17:** Domain-Tippfehler `silbe.de → silbe.at` (User-spec sagte
   `.de`, war Typo).

**Lesson für Phase 6+:** Vor jedem Refit `find tests/ -name "*.spec.ts" |
xargs grep -l <change-target>` ausführen, um existierende e2e-Anker zu
finden bevor Komponenten umgebaut werden.

## Co-Existence / Session-discipline

Diese Phase war Merlin-driven end-to-end (CC harness, plan → audit-
gegen-existing-state → build → acceptance gates → diff → commit →
push → PR). Aleks reviewed + merged alle 4 PRs via GitHub UI. Kein
Codex adversarial-review invoked (non-constitutional, non-security,
non-Worker scope).
