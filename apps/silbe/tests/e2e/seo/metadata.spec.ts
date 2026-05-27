import { test, expect } from '@playwright/test';

// Phase-9 Sprint-A — head metadata per route. Title/canonical/OG. The legal
// pages already have title coverage in legal-pages.spec.ts; this suite focuses
// on the SEO-foundation surfaces (home, listing, PDP) plus the FLAG-3 OG
// regression guard.

const FLAGSHIP_HANDLE = 'silbe-rilke-habegeduld';

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
    expect(href!.replace(/\/$/, '')).toMatch(/\/$|silbe\.at$|localhost(:\d+)?$/);

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
