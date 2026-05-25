import { test, expect } from '@playwright/test';

// § 356a BGB elektronische Widerrufsfunktion — two-step withdrawal flow.
// CI-safe: every test here exercises rendering, client+server validation, or
// the invalid-token branch, none of which touch the Shopify Admin API. The two
// tests that need a live order (and credentials) are skip-by-default and meant
// to be run manually against a Vercel Preview before deploy.

test.describe('Widerruf — Stufe 1 (/widerruf)', () => {
  test('rendert H1 und Schaltfläche mit exaktem § 356a-Wortlaut', async ({ page }) => {
    await page.goto('/widerruf');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Vertrag widerrufen');
    await expect(page.getByRole('button', { name: 'Vertrag widerrufen' })).toBeVisible();
  });

  test('Server-Validation: ungültige Bestellnummer zeigt Fehlermeldung', async ({ page }) => {
    await page.goto('/widerruf');
    // Non-empty (passes the required attr) but invalid format → the action
    // rejects on the regex before ever calling Shopify.
    await page.fill('[name="orderNumber"]', 'abc');
    await page.fill('[name="email"]', 'test@example.com');
    await page.getByRole('button', { name: 'Vertrag widerrufen' }).click();
    await expect(page.getByRole('alert')).toContainText(/gültige Bestellnummer/i);
  });

  test('weist auf alternativen Widerruf per E-Mail / Brief hin', async ({ page }) => {
    await page.goto('/widerruf');
    await expect(page.getByText(/hallo@silbe\.at/)).toBeVisible();
  });
});

test.describe('Widerruf — Stufe 2 (/widerruf/bestaetigen)', () => {
  test('ungültiger Token zeigt generische Fehlermeldung', async ({ page }) => {
    await page.goto('/widerruf/bestaetigen?token=invalid');
    await expect(page.getByText(/ungültig|abgelaufen/i)).toBeVisible();
  });

  // Requires WIDERRUF_TOKEN_SECRET + a real order; run against a Vercel Preview.
  test.skip('gültiger Token rendert Order-Details + Bestätigen-Button', async () => {
    // Needs a freshly signed token for a real Shopify order within the 14d window.
  });
});

test.describe('Widerruf — Erfolg (/widerruf/erfolg)', () => {
  test('zeigt Widerruf-ID und Rücksende-Adresse', async ({ page }) => {
    await page.goto('/widerruf/erfolg?id=WR-TEST1234');
    await expect(page.getByText('WR-TEST1234')).toBeVisible();
    await expect(page.getByText('Widerruf-ID')).toBeVisible();
    await expect(page.getByText('Rueppgasse 32/12')).toBeVisible();
  });
});

test.describe('Widerruf — Integration in Footer + Rechtstexte', () => {
  test('Footer enthält Widerruf-Link auf /widerruf', async ({ page }) => {
    await page.goto('/');
    const link = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Widerruf', exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/widerruf');
  });

  test('Widerrufsrecht erwähnt die elektronische Widerrufsfunktion', async ({ page }) => {
    await page.goto('/widerrufsrecht');
    await expect(
      page.getByRole('heading', { name: 'Elektronische Widerrufsfunktion' }),
    ).toBeVisible();
    await expect(page.getByText(/§ 356a Abs\. 5 BGB/)).toBeVisible();
  });

  test('AGB nennt die elektronische Widerrufsmöglichkeit', async ({ page }) => {
    await page.goto('/agb');
    await expect(page.getByText(/Elektronische Widerrufsmöglichkeit/)).toBeVisible();
  });

  // Requires Shopify Admin credentials — run manually against a Preview.
  test.skip('E2E mit echter Test-Order', async () => {
    // Set TEST_ORDER_NUMBER + TEST_ORDER_EMAIL; walk lookup → confirm → success.
  });
});
