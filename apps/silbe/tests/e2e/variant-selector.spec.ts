import { test, expect } from '@playwright/test';

// Phase-6 P3 — VariantSelector. Multi-variant Hero editions render an
// A3 · A2 Format-button row that mutates `?variant=...` in the URL.
// Single-variant editions render no selector. URL state is the source
// of truth — deep-links honor `?variant=A2` after hydration.
//
// 2026-05-19 MVP state: only single-variant editions are Active in
// Shopify (silbe-rilke-habegeduld, silbe-kafka-axt, silbe-zweig-dir-der-du).
// The multi-variant Hero block below is .skip()'d until a Hero-style
// multi-variant SKU (e.g. silbe-rilke-geduld-hero-burgundy) is promoted
// to active in metafields-manifest.ts. Promote → flip describe.skip
// back to describe and the 4 Hero tests pick up immediately.

const SINGLE_VARIANT_HANDLE = 'silbe-rilke-habegeduld';

test.describe.skip('VariantSelector — multi-variant Hero @variant-selector', () => {
  // TODO: re-enable when a multi-variant Hero SKU is active in Shopify.
  // Until then these tests fail because the Hero handle resolves to 404
  // → no Format fieldset renders.
  const HERO_HANDLE = 'silbe-rilke-geduld-hero-burgundy';

  test('multi-variant Hero PDP exposes Format buttons with default A3 pressed', async ({
    page,
  }) => {
    await page.goto(`/editionen/${HERO_HANDLE}`);

    const fieldset = page.getByRole('group', { name: 'Format' });
    await expect(fieldset).toBeVisible();

    const buttons = fieldset.getByRole('button');
    await expect(buttons).toHaveCount(2);

    const a3 = fieldset.getByRole('button', { name: /Format A3/ });
    const a2 = fieldset.getByRole('button', { name: /Format A2/ });
    await expect(a3).toBeVisible();
    await expect(a2).toBeVisible();
    await expect(a3).toHaveAttribute('aria-pressed', 'true');
    await expect(a2).toHaveAttribute('aria-pressed', 'false');
  });

  test('clicking A2 updates URL searchParams and aria-pressed state', async ({
    page,
  }) => {
    await page.goto(`/editionen/${HERO_HANDLE}`);

    const a3 = page.getByRole('button', { name: /Format A3/ });
    const a2 = page.getByRole('button', { name: /Format A2/ });

    await a2.click();
    await expect(page).toHaveURL(/[?&]variant=A2/);
    await expect(a2).toHaveAttribute('aria-pressed', 'true');
    await expect(a3).toHaveAttribute('aria-pressed', 'false');
  });

  test('deep-link ?variant=A2 selects A2 after hydration', async ({ page }) => {
    await page.goto(`/editionen/${HERO_HANDLE}?variant=A2`);

    const a2 = page.getByRole('button', { name: /Format A2/ });
    await expect(a2).toHaveAttribute('aria-pressed', 'true');
  });

  test('AddToCartButton is present on multi-variant Hero PDP @variant-selector', async ({
    page,
  }) => {
    await page.goto(`/editionen/${HERO_HANDLE}`);
    await expect(
      page.getByRole('button', { name: /In den Warenkorb|Vergriffen/ }),
    ).toBeVisible();
  });
});

test.describe('VariantSelector — single-variant @variant-selector', () => {
  test('single-variant PDP renders no Format selector', async ({
    page,
  }) => {
    await page.goto(`/editionen/${SINGLE_VARIANT_HANDLE}`);

    // The fieldset is conditional on multi-variant; on single-variant
    // SKUs it must be absent. AddToCartButton must still be present
    // (cart row renders unconditionally inside the island).
    await expect(page.getByRole('group', { name: 'Format' })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /In den Warenkorb|Vergriffen/ }),
    ).toBeVisible();
  });
});
