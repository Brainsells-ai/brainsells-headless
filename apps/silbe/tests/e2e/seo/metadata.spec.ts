import { test, expect } from '@playwright/test';

// Phase-9 Sprint-A — head metadata per route. Title/canonical/OG. The legal
// pages already have title coverage in legal-pages.spec.ts; this suite focuses
// on the SEO-foundation surfaces (home, listing, PDP) plus the FLAG-3 OG
// regression guard.

const FLAGSHIP_HANDLE = 'silbe-rilke-habegeduld';

// Der Origin, den diese Deployment-Umgebung konfiguriert hat. Dieselbe Quelle,
// aus der brandConfig.site.origin liest — der Test prüft damit die Kopplung
// zwischen Konfiguration und ausgelieferter canonical-URL, statt einen Host zu raten.
const EXPECTED_ORIGIN = (process.env.METADATA_BASE_URL ?? '').replace(/\/+$/, '');

async function canonical(page: import('@playwright/test').Page): Promise<string | null> {
  return page.locator('link[rel="canonical"]').first().getAttribute('href');
}

async function ogImage(page: import('@playwright/test').Page): Promise<string | null> {
  return page.locator('meta[property="og:image"]').first().getAttribute('content');
}

test.describe('SEO metadata @seo', () => {
  test('homepage: absolute title + canonical "/" + fixed OG image @seo', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('SILBE — Editionen aus dem literarischen Kanon');

    const href = await canonical(page);
    expect(href, 'canonical href').toBeTruthy();
    // Brand-agnostisch gegen den KONFIGURIERTEN Origin, nicht gegen eine
    // Host-Allowlist. Vorher stand hier `/\/$|silbe\.at$|localhost(:\d+)?$/` —
    // das war die Test-Seite von Block-A Leck #1/#4: der Test wäre für einen Fork
    // grün geblieben, der flächendeckend SILBEs canonical-URLs emittiert, weil
    // silbe.at ausdrücklich als akzeptabel gelistet war. Ein Test, der die
    // Fehlkonfiguration mit abnickt, ist schlimmer als keiner.
    expect(
      EXPECTED_ORIGIN,
      'METADATA_BASE_URL muss für die SEO-Suite gesetzt sein',
    ).toBeTruthy();
    expect(href!.replace(/\/$/, '')).toBe(EXPECTED_ORIGIN);

    const og = await ogImage(page);
    expect(og, 'og:image').toBeTruthy();
    // FLAG-3 regression guard: the default OG must point at the real asset,
    // never the missing /og/five-klassiker.png.
    expect(og).toContain('og-five-klassiker-a.png');
    expect(og).not.toContain('/og/five-klassiker.png');
  });

  test('listing /editionen: title-template + canonical @seo', async ({ page }) => {
    await page.goto('/editionen');
    await expect(page).toHaveTitle('Editionen · SILBE');
    const href = await canonical(page);
    expect(href, 'canonical href').toBeTruthy();
    expect(href!).toMatch(/\/editionen$/);
  });

  test('PDP: title resolves through "· SILBE" template + has OG image @seo', async ({
    page,
  }) => {
    await page.goto(`/editionen/${FLAGSHIP_HANDLE}`);
    // Product title is content-dependent (Shopify) — assert the template
    // suffix rather than an exact string (pre-seed robust).
    await expect(page).toHaveTitle(/· SILBE$/);
    const og = await ogImage(page);
    expect(og, 'og:image').toBeTruthy();
  });
});
