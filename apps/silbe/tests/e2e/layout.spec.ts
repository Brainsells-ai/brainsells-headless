import { test, expect } from '@playwright/test';

// Each spec is tagged so the §1.4 acceptance commands work via --grep.

// Homepage visual regression snapshots moved out — Phase 2 replaced the
// holding page with the full editorial homepage. Re-introduce a stable
// snapshot once the Phase 2 design has shipped through HITL review.

test.describe('mobile drawer', () => {
  // Drawer surface is mobile-only; running it once on chromium-mobile is
  // enough — desktop chromium would just hide the trigger via CSS.
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'mobile-only suite');
  });

  test('mobile drawer opens, traps focus, closes on ESC @drawer', async ({ page }) => {
    await page.goto('/');

    const trigger = page.getByRole('button', { name: 'Navigation öffnen' });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Hauptnavigation' });
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Focus moved into the dialog.
    const close = dialog.getByRole('button', { name: 'Navigation schließen' });
    await expect(close).toBeFocused();

    // Phase 5 primary links: Editionen + Über uns. No Stimmen disclosure,
    // no Bibliothek / Werkstatt / Kontakt in primary nav.
    await expect(dialog.getByRole('link', { name: 'Editionen' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Über uns' })).toBeVisible();

    // Phase 5 secondary Rechtliches block (smaller typography below
    // the primary links).
    await expect(dialog.getByRole('link', { name: 'Impressum' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: 'Widerrufsrecht' })).toBeVisible();

    // ESC closes the drawer and returns focus to the trigger.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile drawer overlay click closes @drawer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Navigation öffnen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Hauptnavigation' });
    await expect(dialog).toBeVisible();
    // The scrim overlay sits between trigger and dialog at z-index 60.
    await page.mouse.click(380, 400);
    await expect(dialog).toBeHidden();
  });
});

test.describe('footer links', () => {
  test('footer links resolve to canonical routes @footer-links', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible();

    // Phase 5 footer = 3 columns: Brand+Newsletter / Rechtliches / Kontakt.
    // Rechtliches column carries the 7 canonical legal routes.
    const widerruf = footer.getByRole('link', { name: 'Widerrufsrecht', exact: true });
    await expect(widerruf).toHaveAttribute('href', '/widerrufsrecht');

    // exact:true — NewsletterForm consent line contains a "Datenschutzerklärung"
    // link which would otherwise substring-match "Datenschutz".
    for (const label of [
      'Impressum',
      'AGB',
      'Datenschutz',
      'Widerrufsformular',
      'Versand',
      'Cookie-Einstellungen',
    ]) {
      await expect(footer.getByRole('link', { name: label, exact: true })).toBeVisible();
    }

    // Kontakt column.
    await expect(footer.getByRole('link', { name: 'hallo@silbe.at' })).toBeVisible();
    await expect(footer.getByText('Brainsells e.U., Wien')).toBeVisible();

    // Copyright corrected to legal entity, not brand. UID lives in
    // Impressum, not the footer bottom-bar.
    await expect(footer.getByText('© 2026 Brainsells e.U. · Wien')).toBeVisible();

    // Phase 5 tagline (shortened from manifest block).
    await expect(
      footer.getByText('Wir sehen die Edition als die kleinste Form eines Verlags.'),
    ).toBeVisible();

    // Newsletter form ("Briefe von SILBE") mounted in the brand column.
    await expect(footer.getByText('Briefe von SILBE')).toBeVisible();
    await expect(footer.getByRole('heading', { name: 'Kein Newsletter. Ein Brief.' })).toBeVisible();

    // No deprecated old-Liquid routes and no Phase-5-removed paths.
    // /werkstatt was renamed to /ueber-uns; /stimmen + /bibliothek are
    // Phase-7+ surfaces, not yet linked.
    const html = await footer.innerHTML();
    expect(html).not.toContain('/collections/alle-werke');
    expect(html).not.toContain('/blogs/journal');
    expect(html).not.toContain('/pages/ueber-uns');
    expect(html).not.toContain('/pages/autoren');
    expect(html).not.toContain('href="/werkstatt"');
    expect(html).not.toContain('href="/stimmen"');
    expect(html).not.toContain('href="/bibliothek"');
    expect(html).not.toMatch(/\/widerruf(?!s)/); // matches /widerruf but not /widerrufsrecht/widerrufsformular
  });
});

test.describe('redirects', () => {
  test('old liquid routes 308 to new equivalents', async ({ request }) => {
    const cases = [
      { from: '/collections/alle-werke', to: '/editionen' },
      // Phase 5: /pages/ueber-uns now targets /ueber-uns (was /werkstatt
      // pre-Phase-5; the /werkstatt route itself was renamed).
      { from: '/pages/ueber-uns', to: '/ueber-uns' },
      // Phase 5: /werkstatt was renamed to /ueber-uns.
      { from: '/werkstatt', to: '/ueber-uns' },
      { from: '/pages/autoren', to: '/stimmen' },
      { from: '/pages/widerruf', to: '/widerrufsrecht' },
      { from: '/pages/journal', to: '/bibliothek' },
    ];
    for (const { from, to } of cases) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), `${from} should 308 to ${to}`).toBe(308);
      expect(response.headers()['location']).toBe(to);
    }
  });
});
