# Hand-off — Phase 4 (Cart-Drawer + Checkout-Redirect)

**Status:** Phase 4 squash-merged to `main` on 2026-05-12 as `3ed3ae3`
(PR #13). Single atomic commit, single client-island family
(AddToCartButton + CartIndicator + CartDrawer + children). Shopify-
hosted checkout reachable via on-brand `silbe.at/cart/c/...` URLs.
PDP cart button now functional end-to-end.

---

## Was wurde gemerged

PR #13 squash-merged as `3ed3ae3` from the `phase-4-cart-drawer` branch.
The merge collapsed a single commit (`c57fa1d`) — 11 files, 1252
insertions, 26 deletions — by design (handover discipline: „Ein
Commit für den ganzen Cart-Drawer (atomarer Liefer-Punkt)").

**New files:**
- `apps/silbe/lib/shopify-cart.ts` — Storefront Cart API write layer.
  GraphQL fragment + 4 mutations (`cartCreate`, `cartLinesAdd`,
  `cartLinesUpdate`, `cartLinesRemove`) + `cart` query for hydration.
  Typed `CartUserError` wraps Shopify `userErrors[]`. `cache: 'no-store'`
  on every cart call.
- `apps/silbe/lib/cart-store.ts` — Zustand store with `persist()`
  middleware. Only `cartId` is persisted to localStorage; cart body
  re-fetches via `hydrate()` on mount so prices/availability never
  go stale.
- `apps/silbe/components/cart/CartDrawer.tsx` — slide-in dialog,
  `role=dialog` + `aria-modal=true`, focus-trap (Tab/Shift-Tab cycle
  within drawer), Escape closes, body-scroll-lock while open, focus
  restored on close. z-index: backdrop 60, panel 70 (Header is 50,
  so backdrop dims it).
- `apps/silbe/components/cart/CartLineItem.tsx` — 96px thumb,
  2-line title clamp, variant in Crimson italic, qty stepper
  (− N +) with `aria-live="polite"`, „Entfernen" link, „Vergriffen"
  badge when `availableForSale === false`.
- `apps/silbe/components/cart/FreeShipBar.tsx` — €39 progress bar.
  Sage when reached, taupe while below. DE/AT only (CH-€69 is
  Phase-5).
- `apps/silbe/components/cart/EmptyCart.tsx` — editorial empty state,
  Cormorant italic „Noch keine Edition gewählt.", link closes drawer
  before navigation to `/editionen`.
- `apps/silbe/components/cart/format.ts` — locale-pinned
  `Intl.NumberFormat('de-DE', currency)` helper. Polish item: refactor
  `Hero.tsx`'s local copy onto this helper.
- `apps/silbe/scripts/smoke-cart-api.ts` — 6-step round-trip dev
  utility (createCart → addLines → updateLine → getCart → removeLine
  → getCart(invalid)→null). Kept in repo for regression debugging.

**Modified files:**
- `apps/silbe/app/(frontend)/layout.tsx` — mount `<CartDrawer />`
  below `<Footer />`.
- `apps/silbe/components/layout/CartIndicator.tsx` — RSC
  `<Link href="/warenkorb">` → client `<button>` reading
  `totalQuantity` from store, click → `openDrawer()`. `/warenkorb`
  route deprecated.
- `apps/silbe/components/product/AddToCartButton.tsx` — visual stub
  → calls `store.addItem`, busy state („Wird hinzugefügt …"),
  `aria-busy`, auto-opens drawer on success.

## Architektur-Entscheidungen fixiert in PR #13 (TECH, locked 2026-05-12)

These constraints are not provisional. Phase-5+ work must respect them
or trigger explicit revision.

- **Cart is the only client-island family** — Triadic-Stack-Regel
  preserved. `AddToCartButton`, `CartIndicator`, `CartDrawer`
  (+ children) are `'use client'`. Everything else stays RSC. The
  cart-store is consumed exclusively by these three islands.
- **`cartId`-only persistence** — Zustand `persist()` `partialize`
  keeps localStorage to `{ cartId: string | null }`. Cart body
  always re-fetches from Shopify via `hydrate()`. Stale prices /
  stock impossible by design.
- **Storefront Cart API direct from client** — `shopify-cart.ts`
  uses the existing `shopifyFetch` helper with the public
  `NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN`. No Server Actions for
  cart mutations (lower latency, token is already public so no
  security delta).
- **`cache: 'no-store'` on every cart call** — must never inherit
  the read-side ISR cache (`revalidate: 3600`) that `shopifyFetch`
  defaults to for product queries.
- **`userErrors[]` → `CartUserError` throw** — Shopify returns
  200 OK with populated `userErrors[]` for cart-level errors
  (variant out-of-stock, invalid quantity, expired cart). Wrapped
  as typed error so the store / UI can show targeted copy.
- **`getCart()` returns `null` on expired/invalid cartId** —
  store's `hydrate()` drops the persisted `cartId` and starts the
  user fresh. No silent failure, no error toast for normal expiry.
- **No `/warenkorb` route** — checkout flow is drawer → Shopify-
  hosted checkout. `CartIndicator` opens drawer instead of linking
  to a cart page. Placeholder route still 404s (polish-list item
  to redirect/replace).
- **„Zur Kasse" is a plain `<a>`** — not Next `<Link>`, to force
  full-page nav out of the SPA into Shopify's checkout. `pointer-
  events: none` + `opacity: 0.6` while `isLoading` so users can't
  click during a pending mutation.
- **z-index map:** backdrop=60, drawer-panel=70, sticky-header=50.
  Backdrop dims the header while drawer is open.

## Acceptance gates (pre-merge)

- ✅ `pnpm exec tsc --noEmit` clean (local)
- ✅ `pnpm tsx scripts/content-lint.ts` — 55 targets OK, no findings
- ✅ `pnpm tsx scripts/smoke-cart-api.ts` — 6/6 round-trip green
  against live Shopify Storefront API `2026-01`
- ✅ `pnpm build` — all 8 PDP routes still SSG, same revalidate/expire
- ✅ Playwright golden path (manual MCP, Chromium, 1280×800):
  - add → drawer opens with line, qty=1, 35,00 €
  - Free-ship bar: „Nur noch 4,00 € bis zum kostenlosen Versand"
  - + → qty=2, line 70,00 €, „Kostenloser Versand erreicht", sage progress
  - Esc → drawer closes, cart-icon badge shows „2"
  - Cart-icon click → drawer reopens with state intact
  - Entfernen → editorial empty state „Noch keine Edition gewählt"
  - „Zur Kasse" href = `https://silbe.at/cart/c/...` ✓ (on-brand)

## Smoke-Tests pre-merge (PR #13)

Smoke per Playwright-MCP against `localhost:3000` dev server (Turbopack,
Next.js 16.2.4). All flows green; no console errors except expected
favicon 404. Phase-3 PDP suite (46 tests) untouched — verified PDP
routes still SSG via `pnpm build`. No Vercel-preview manual smoke ran
in-session — CI on the PR delegated that.

## Polish-list deltas added in Phase 4

7 new entries appended to `docs/polish-list.md` § Phase 4 deferrals:

- Hero `formatPrice` → consume `components/cart/format.ts` (DRY)
- Playwright e2e suite for cart-drawer golden path
- Optimistic qty-update with rollback
- Toast / inline error styling refinement
- Hardcoded €39 free-ship threshold → config (Phase-5 gate when CH-Geo
  lands)
- `/warenkorb` route placeholder cleanup (redirect or replace with
  EmptyCart-style page)
- `framer-motion` drawer transition (only if real-device QA surfaces
  jank)
- Cart-line `availableForSale=false` — explicit removal nudge + disable
  „Zur Kasse" when any line is Vergriffen

## Pending nach PR #13 — Carry-forward to Phase 5

- **VariantSelector (A3/A2 picker)** — Multi-Variant Hero-SKUs
  (Rilke-Hero, Mann-Einsamkeit-Hero, Zweig-Memorial) still show
  Standard-Variante (`variants[0]`). A2 not user-selectable until
  VariantSelector ships.
- **Multi-Currency / CH-Geo-Detection** — €69 CH free-ship threshold,
  zone-keyed `SURFACE_COPY.free_shipping_threshold`, currency switch.
- **Klarna / PayPal UI badges on PDP** — payment-method preview below
  cart button. Shopify-hosted checkout supports them; just not surfaced
  on PDP yet.
- **Listing/Hub routes** — `/editionen`, `/bibliothek`, `/werkstatt`,
  `/stimmen` still 404 (Phase-3-prep carry-over).
- **EditorialEssays Postgres-Migration auf Production** (Phase-3
  carry-over).
- **Aleks editorial seeding** der ~15 TODO_AUTHOR-Felder im manifest
  (blockiert real quote rendering on PDP H1).

## Phase 5 entry points

Suggested kickoff order when next session opens Phase 5:

1. **`/editionen` listing route** — collection grid using existing
   `SummaryProduct` shape. Same SSG/ISR profile as PDP. Highest user-
   visible RSC-prefetch-404er resolution.
2. **VariantSelector** — wired into PDP Hero, `?variant=` URL-param
   state, AddToCartButton picks up `variantId` from selector instead
   of `variants[0]`. Trivially extends Phase-4 cart-store contract
   (which already takes `variantId`).
3. **Custom `not-found.tsx`** — SILBE-branded 404 page (Phase-0
   polish-item). Resolves alongside `/warenkorb` cleanup.
4. **`/stimmen` voice-hub** — uses `getProductsByVoice` from
   `shopify-queries.ts` (Phase-3-prep).
5. **CH-Geo-Detection** — wire `FreeShipBar` to a zone-keyed threshold.
   Polish-list entry pinned.

## Bekannte Probleme (non-blocking)

- **`scripts/smoke-cart-api.ts` is dev-only** — calls Shopify with live
  store credentials. Not run in CI. Manual invocation only.
- **Hydration mismatch potential** — Zustand `persist` populates
  `cartId` from localStorage after first paint. Drawer is closed by
  default so no visible flash. CartIndicator badge briefly shows „0"
  then updates — usually imperceptible but unverified on slow devices.
- **No focus-trap perfection edge cases** — current Tab-cycle covers
  forward/backward at boundaries. Doesn't handle iframes inside drawer
  (none currently) or shadow-DOM (none currently). Adequate for Phase-4
  surface area.

## Co-Existence / Session-discipline

This phase was Merlin-driven end-to-end (CC harness, plan → build →
acceptance gates → diff → commit → push → PR). Aleks reviewed the PR
title + merged via GitHub UI. No Codex adversarial-review invoked
(non-constitutional, non-security, non-Worker scope).
