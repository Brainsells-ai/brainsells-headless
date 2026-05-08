import { test, expect } from '@playwright/test';

// Each spec is tagged so the §1.4 acceptance commands work via --grep.

test.describe('layout snapshot', () => {
  test('layout snapshot — homepage @snapshot', async ({ page }) => {
    await page.goto('/');
    // Block fonts loading so the snapshot doesn't depend on woff2 cache state.
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('homepage.png', { fullPage: true });
  });
});

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

    // Stimmen disclosure toggles. Scope to the dialog because the same
    // author names also appear in the Footer's Stimmen column.
    const stimmenToggle = dialog.getByRole('button', { name: /^Stimmen$/ });
    await expect(stimmenToggle).toHaveAttribute('aria-expanded', 'false');
    await stimmenToggle.click();
    await expect(stimmenToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.getByRole('link', { name: 'Rainer Maria Rilke' })).toBeVisible();

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

    // Pflicht (per docs/vocabulary.md §2): /widerrufsrecht (NOT /widerruf).
    const widerruf = footer.getByRole('link', { name: 'Widerrufsrecht' });
    await expect(widerruf).toHaveAttribute('href', '/widerrufsrecht');

    // /editionen replaces /collections/alle-werke.
    const editionen = footer.getByRole('link', { name: 'Alle Editionen' });
    await expect(editionen).toHaveAttribute('href', '/editionen');

    // No deprecated old-Liquid routes anywhere in the footer.
    const html = await footer.innerHTML();
    expect(html).not.toContain('/collections/alle-werke');
    expect(html).not.toContain('/blogs/journal');
    expect(html).not.toContain('/pages/ueber-uns');
    expect(html).not.toContain('/pages/autoren');
    expect(html).not.toMatch(/\/widerruf(?!s)/); // matches /widerruf but not /widerrufsrecht/widerrufsformular

    // Five voices present, in the canonical naming.
    for (const name of [
      'Rainer Maria Rilke',
      'Franz Kafka',
      'Thomas Mann',
      'Stefan Zweig',
      'Marie von Ebner-Eschenbach',
    ]) {
      await expect(footer.getByRole('link', { name })).toBeVisible();
    }
  });
});

test.describe('redirects', () => {
  test('old liquid routes 301 to new equivalents', async ({ request }) => {
    const cases = [
      { from: '/collections/alle-werke', to: '/editionen' },
      { from: '/pages/ueber-uns', to: '/werkstatt' },
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
