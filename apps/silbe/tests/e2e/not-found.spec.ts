import { test, expect } from '@playwright/test';

// Phase-6 P1 — SILBE-branded 404 page. Replaces Next.js default for any
// unmatched URL (including /warenkorb, which has no route by design — the
// cart flow opens a drawer, not a page).
//
// The CTA targets /editionen (Phase-6 P2 listing route). During the
// P1→P2 window the CTA itself 404s; that is a deliberate, time-bounded
// trade-off documented in the Phase-6 brief.

test.describe('not-found page @404', () => {
  test('unmatched URL renders SILBE 404 with editorial-wink copy and editionen CTA', async ({
    page,
  }) => {
    const res = await page.goto('/this-route-does-not-exist');
    expect(res?.status()).toBe(404);

    // Heading carries the editorial-wink copy verbatim
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toHaveText(
      '404 — eine Edition, die wir nicht drucken.',
    );

    // Body paragraph present
    await expect(
      page.getByText('Diese Seite existiert nicht.', { exact: false }),
    ).toBeVisible();

    // CTA points to /editionen
    const cta = page.getByRole('link', { name: /Zu den Editionen/ });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/editionen');

    // Chrome inheritance: (frontend) layout applies — Header nav-link
    // "Editionen" present (exact match excludes the CTA "Zu den Editionen").
    await expect(
      page.getByRole('link', { name: 'Editionen', exact: true }).first(),
    ).toBeVisible();
  });

  test('/warenkorb (no route by design) renders the SILBE 404 @404', async ({
    page,
  }) => {
    const res = await page.goto('/warenkorb');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '404 — eine Edition, die wir nicht drucken.',
    );
  });
});
