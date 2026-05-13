import { test, expect } from '@playwright/test';

// Phase-7 — 7 legal-content pages under app/(frontend)/. Resolves all
// footer-link 404s that existed since Phase 5. Static SSG, German Sie-
// form, brand-styling (Cream / Cormorant italic / Crimson body).

type LegalRoute = {
  path: string;
  title: string; // expected window/document title (root layout template appends " · SILBE")
  h1: string;
};

const LEGAL_ROUTES: LegalRoute[] = [
  { path: '/impressum', title: 'Impressum', h1: 'Impressum' },
  { path: '/agb', title: 'AGB', h1: 'Allgemeine Geschäftsbedingungen' },
  { path: '/datenschutz', title: 'Datenschutz', h1: 'Datenschutzerklärung' },
  { path: '/widerrufsrecht', title: 'Widerrufsrecht', h1: 'Widerrufsrecht' },
  {
    path: '/widerrufsformular',
    title: 'Widerrufsformular',
    h1: 'Muster-Widerrufsformular',
  },
  { path: '/versand', title: 'Versand', h1: 'Versand und Lieferung' },
  {
    path: '/cookie-einstellungen',
    title: 'Cookie-Einstellungen',
    h1: 'Cookie-Einstellungen',
  },
];

test.describe('legal pages @legal', () => {
  for (const route of LEGAL_ROUTES) {
    test(`${route.path} renders 200 with H1 + title-template @legal`, async ({
      page,
    }) => {
      const res = await page.goto(route.path);
      expect(res?.status()).toBe(200);

      // Scope H1 lookup to <main> so Footer/Header headings don't leak in.
      const heading = page.getByRole('main').getByRole('heading', { level: 1 });
      await expect(heading).toHaveText(route.h1);

      // Root layout title.template is "%s · SILBE" — every legal page must
      // resolve to "<title> · SILBE".
      await expect(page).toHaveTitle(`${route.title} · SILBE`);

      // Every legal page footer is "Stand: 13. Mai 2026" — content
      // canary that the stale-date placeholder hasn't slipped in.
      await expect(
        page.getByRole('main').getByText('Stand: 13. Mai 2026'),
      ).toBeVisible();
    });
  }

  test('footer exposes a visible link per legal route with correct href @legal', async ({
    page,
  }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    // /datenschutz appears twice in the footer by Phase-5 design (legal
    // column + newsletter-consent "Datenschutzerklärung" anchor). Assert
    // at least one occurrence is visible rather than exactly one.
    for (const route of LEGAL_ROUTES) {
      const link = footer.locator(`a[href="${route.path}"]`).first();
      await expect(link).toBeVisible();
    }
  });

  test('cross-link chain AGB → Widerrufsrecht → Widerrufsformular @legal', async ({
    page,
  }) => {
    await page.goto('/agb');
    // AGB §7 links to /widerrufsrecht ("Widerrufsrecht").
    await page.getByRole('main').getByRole('link', { name: 'Widerrufsrecht' }).click();
    await expect(page).toHaveURL(/\/widerrufsrecht$/);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1 }),
    ).toHaveText('Widerrufsrecht');

    // Widerrufsrecht body links to /widerrufsformular ("Muster-Widerrufsformular").
    await page
      .getByRole('main')
      .getByRole('link', { name: 'Muster-Widerrufsformular' })
      .click();
    await expect(page).toHaveURL(/\/widerrufsformular$/);
    await expect(
      page.getByRole('main').getByRole('heading', { level: 1 }),
    ).toHaveText('Muster-Widerrufsformular');
  });
});
