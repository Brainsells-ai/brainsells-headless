import { test, expect } from '@playwright/test';

// PDP Playwright suite — Task #7 per Phase-3 DoD (2026-05-12).
//
// Tests are tagged so they can be selected via --grep:
//   @pdp          full-flagship behavior tests
//   @pdp-smoke    minimal "renders" check across all 8 canonical handles
//   @pdp-negative 404 expectation for non-canonical handles
//   @a11y         accessibility-only assertions
//
// Pre-seed data state assumed: silbe.* metafield values are NOT yet
// populated in Shopify. So tests are lenient on content-dependent
// assertions (quote_full, themes, work_title may be empty). Structural
// rendering + canonical-string byte-identity are strict.

const FLAGSHIP_HANDLE = 'silbe-rilke-habegeduld';

// Mirrors metafields-manifest CANONICAL_HANDLES (filter:
// product_type === 'edition' && active === true) — local copy kept
// inline so test parameterization stays readable. Bump alongside any
// manifest active-flag flip.
const CANONICAL_HANDLES = [
  'silbe-rilke-habegeduld',
  'silbe-kafka-axt',
  'silbe-zweig-dir-der-du',
] as const;

test.describe('PDP — flagship rendering (silbe-rilke-habegeduld)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/editionen/${FLAGSHIP_HANDLE}`);
  });

  test('renders breadcrumbs Home › Editionen › productTitle @pdp', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Editionen' })).toBeVisible();
  });

  test('renders hero section with author name from VOICE_FULL_NAMES @pdp', async ({ page }) => {
    const hero = page.getByRole('region', { name: 'Edition', exact: true });
    await expect(hero).toBeVisible();
    // Author name from manifest VOICE_BY_HANDLE → VOICE_FULL_NAMES — always
    // present even pre-seed (manifest is canonical SoT for voice resolution).
    await expect(hero.getByText('Rainer Maria Rilke')).toBeVisible();
  });

  test('hero h1 — wenn präsent — uses deutsche Anführungszeichen only @pdp', async ({ page }) => {
    // Scope strictly to the Hero's H1 element. Pre-seed: H1 absent
    // (quote_full metafield null), test passes trivially. Post-seed:
    // H1 contains the quote with U+201E opening + U+201C closing
    // (never the straight ASCII U+0022).
    const heroH1 = page
      .getByRole('region', { name: 'Edition', exact: true })
      .getByRole('heading', { level: 1 });
    const count = await heroH1.count();
    if (count === 0) return;
    const text = (await heroH1.textContent()) ?? '';
    expect(text).toMatch(/^„/);
    expect(text).toMatch(/“\s*$/); // U+201C as closing, possibly trailing whitespace
    expect(text).not.toMatch(/^"/); // no straight ASCII open
    expect(text).not.toMatch(/"\s*$/); // no straight ASCII close
  });

  test('material-specs has 4 canonical strings byte-identical @pdp', async ({ page }) => {
    const specs = page.getByRole('region', { name: 'Material & Versand' });
    await expect(specs).toBeVisible();
    await expect(specs.getByText('Hochweißes Premium-Papier, 200 g/m², matt, säurefrei')).toBeVisible();
    await expect(specs.getByText('Gedruckt in der EU, überwiegend in Deutschland')).toBeVisible();
    await expect(specs.getByText('3–6 Werktage')).toBeVisible();
    await expect(specs.getByText('Versandzylinder aus recyceltem Material')).toBeVisible();
  });

  test('price rendered in EUR format with German decimal comma @pdp', async ({ page }) => {
    const hero = page.getByRole('region', { name: 'Edition', exact: true });
    const heroText = (await hero.textContent()) ?? '';
    // de-DE Intl.NumberFormat produces "29,90 €" / "39,00 €" / etc.
    expect(heroText).toMatch(/\d+,\d{2}\s*€/);
  });

  test('add-to-cart button uses German vocab — never "Sold out" / "Add to cart" @pdp', async ({ page }) => {
    const cartButton = page.getByRole('button', { name: /In den Warenkorb|Vergriffen|vergriffen/ });
    await expect(cartButton).toBeVisible();
    const bodyText = (await page.textContent('body')) ?? '';
    expect(bodyText).not.toContain('Sold out');
    expect(bodyText).not.toContain('Add to cart');
    expect(bodyText).not.toContain('Coming soon');
  });

  test('editorial section renders placeholder OR seeded essay @pdp', async ({ page }) => {
    const editorial = page.getByRole('region', { name: 'Editorial-Kontext' });
    await expect(editorial).toBeVisible();
    const text = (await editorial.textContent()) ?? '';
    // Either placeholder ("Editorial-Kontext folgt.") OR meaningful essay
    // content (> 50 chars). Empty rendering would fail this assertion.
    const validShape = text.includes('Editorial-Kontext folgt') || text.length > 50;
    expect(validShape).toBe(true);
  });

  test('EU-Widerrufsrecht-Hinweis present in hero @pdp', async ({ page }) => {
    const hero = page.getByRole('region', { name: 'Edition', exact: true });
    await expect(hero.getByText(/Widerrufsrecht 14 Tage/)).toBeVisible();
  });

  test('a11y: at most one h1 per page @a11y', async ({ page }) => {
    const h1Count = await page.getByRole('heading', { level: 1 }).count();
    // Pre-seed: 0 (quote_full empty → Hero skips h1). Post-seed: 1.
    // Strict-but-lenient — page must not have multiple h1s.
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('a11y: every image with src has non-empty alt @a11y', async ({ page }) => {
    // Filter to <img> elements that have an actual src — skips Next.js
    // Image's pre-load placeholder (which transiently appears with
    // src=null in the DOM before hydration).
    const images = await page.locator('img[src]').all();
    for (const img of images) {
      const src = await img.getAttribute('src');
      const alt = await img.getAttribute('alt');
      expect(alt, `image ${src}`).toBeTruthy();
    }
  });

  test('a11y: html lang is de-AT @a11y', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('de-AT');
  });

  test('a11y: add-to-cart button has aria-label @a11y', async ({ page }) => {
    const cartButton = page.getByRole('button', { name: /In den Warenkorb|Vergriffen|vergriffen/ });
    const ariaLabel = await cartButton.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});

test.describe('PDP — smoke across all active canonical handles', () => {
  for (const handle of CANONICAL_HANDLES) {
    test(`${handle} renders 200 and has breadcrumbs @pdp-smoke`, async ({ page }) => {
      const res = await page.goto(`/editionen/${handle}`);
      expect(res?.status(), `expected 200 for ${handle}, got ${res?.status()}`).toBeLessThan(400);
      const nav = page.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(nav).toBeVisible();
      const hero = page.getByRole('region', { name: 'Edition', exact: true });
      await expect(hero).toBeVisible();
    });
  }
});

test.describe('PDP — 404 for non-canonical handles', () => {
  test('legacy pre-migration handle 404s @pdp-negative', async ({ page }) => {
    const res = await page.goto('/editionen/rilke-a3-habegeduld');
    expect(res?.status()).toBe(404);
  });

  test('totally-fake handle 404s @pdp-negative', async ({ page }) => {
    const res = await page.goto('/editionen/totally-fake-handle-does-not-exist');
    expect(res?.status()).toBe(404);
  });

  test('bundle handle (product_type bundle, excluded from whitelist) 404s @pdp-negative', async ({ page }) => {
    const res = await page.goto('/editionen/bundle-goldrahmen-trio');
    expect(res?.status()).toBe(404);
  });
});
