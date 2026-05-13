import { test, expect } from '@playwright/test';

// Phase-6 P3 — VariantSelector. Multi-variant Hero editions render an
// A3 · A2 Format-button row that mutates `?variant=...` in the URL.
// Single-variant Goldrahmen editions render no selector. URL state is
// the source of truth — deep-links honor `?variant=A2` after hydration.

const HERO_HANDLE = 'silbe-rilke-geduld-hero-burgundy';
const GOLDRAHMEN_HANDLE = 'silbe-rilke-geduld-goldrahmen';

test.describe('VariantSelector @variant-selector', () => {
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

  test('single-variant Goldrahmen PDP renders no Format selector', async ({
    page,
  }) => {
    await page.goto(`/editionen/${GOLDRAHMEN_HANDLE}`);

    // The fieldset is conditional on multi-variant; on Goldrahmen it
    // must be absent. AddToCartButton must still be present (cart row
    // renders unconditionally inside the island).
    await expect(page.getByRole('group', { name: 'Format' })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /In den Warenkorb|Vergriffen/ }),
    ).toBeVisible();
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
