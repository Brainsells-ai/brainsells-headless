import { test, expect } from '@playwright/test';
import { CANONICAL_HANDLES } from '../../scripts/metafields-manifest';

// Phase-6 P2 — /editionen listing route. Server-renders all canonical
// edition SKUs (CANONICAL_HANDLES manifest order) as a card grid. ISR
// with revalidate=3600. Resolves the Phase-6 P1 404-CTA target.

test.describe('editionen listing @editionen', () => {
  test('GET /editionen renders 200 with header + intro + canonical edition cards', async ({
    page,
  }) => {
    const res = await page.goto('/editionen');
    expect(res?.status()).toBe(200);

    // Page header (CapsLabel + H1 + intro)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Alle Editionen.',
    );
    await expect(
      page.getByText(/Worte deutschsprachiger Klassiker als Kunstdrucke/),
    ).toBeVisible();

    // Every canonical edition handle resolves to a card whose link points
    // to its PDP. We assert the link presence (not the title text, which
    // is owned by Shopify) so the test is resilient to copy edits.
    for (const handle of CANONICAL_HANDLES) {
      const link = page.locator(`a[href="/editionen/${handle}"]`);
      await expect(link).toHaveCount(1);
    }
  });

  test('cards expose accessible product info (h2 title + price line) @editionen', async ({
    page,
  }) => {
    await page.goto('/editionen');

    // Scope to <main> to exclude Footer h2s ("Rechtliches", "Kontakt").
    const main = page.getByRole('main');

    // Card title rendered as h2 — should match canonical handle count.
    const titles = main.getByRole('heading', { level: 2 });
    await expect(titles).toHaveCount(CANONICAL_HANDLES.length);

    // Each title should be a non-empty string (Shopify-owned content).
    const texts = await titles.allTextContents();
    for (const text of texts) {
      expect(text.trim().length).toBeGreaterThan(0);
    }

    // Price line includes the EUR symbol — Intl 'de-DE' formats as "€".
    const firstCard = main.locator('a[href^="/editionen/silbe-"]').first();
    await expect(firstCard).toContainText('€');
  });
});
