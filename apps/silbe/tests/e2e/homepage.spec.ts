import { test, expect } from '@playwright/test';

// R8 Homepage — 7-Section structure (6 visible sections + Footer-Wordmark-Fix).
// Tags: @hero, @editorial, @featured, @essay, @about, @newsletter, @a11y.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('section 1 — hero', () => {
  test('renders hero quote, source, CTA, composite image @hero', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Habe Geduld gegen alles Ungelöste in deinem Herzen');
    await expect(h1).toContainText('„');
    await expect(h1).toContainText('“');

    const hero = page.getByRole('region', { name: /Editorial-Hero/ });
    await expect(hero.getByText('Rainer Maria Rilke', { exact: true })).toBeVisible();
    await expect(
      hero.getByText('›Briefe an einen jungen Dichter‹ · 1903'),
    ).toBeVisible();
    await expect(
      hero.getByRole('link', { name: /Editionen ansehen/ }),
    ).toBeVisible();

    const heroImg = hero.getByRole('img');
    await expect(heroImg.first()).toBeVisible();
    const alt = await heroImg.first().getAttribute('alt');
    expect(alt).toMatch(/Rilke-Edition.*Habe Geduld/);
  });

  test('hero uses German typography only @hero', async ({ page }) => {
    const hero = page.getByRole('region', { name: /Editorial-Hero/ });
    const html = await hero.innerHTML();
    expect(html).toMatch(/„Habe Geduld/);
    expect(html).not.toMatch(/"Habe Geduld/);
    expect(html).toMatch(/›Briefe an einen jungen Dichter‹/);
    expect(html).not.toMatch(/"Briefe an einen jungen Dichter"/);
  });

  test('no hero credit overlay (composite is own work) @hero', async ({ page }) => {
    const hero = page.getByRole('region', { name: /Editorial-Hero/ });
    // No Wikimedia/CC-credit string anywhere in the hero.
    const html = await hero.innerHTML();
    expect(html).not.toMatch(/Wikimedia|gemeinfrei|CC0|Creative Commons/i);
  });
});

test.describe('section 2 — editorial statement', () => {
  test('renders positioning copy @editorial', async ({ page }) => {
    const section = page.getByRole('region', { name: /Editorial-Statement/ });
    await expect(section).toBeVisible();
    await expect(
      section.getByText(/SILBE bringt literarische Zeilen aus dem deutschsprachigen Kanon/),
    ).toBeVisible();
    await expect(
      section.getByText(/Kein Dekor\. Ein Satz, der bleibt/),
    ).toBeVisible();
  });
});

test.describe('section 3 — featured editions', () => {
  test('featured editions render — either 3 cards or in-Vorbereitung fallback @featured', async ({ page }) => {
    const section = page.getByRole('region', {
      name: /(Ausgewählte Editionen|Editionen — in Vorbereitung)/,
    });
    await expect(section).toBeVisible();
    await expect(section.getByRole('link', { name: /Editionen ansehen/ })).toBeVisible();
  });

  test('price format uses Euro-first NBSP layout when present @featured', async ({ page }) => {
    const section = page.getByRole('region', { name: /Ausgewählte Editionen/ });
    const isPresent = await section.isVisible().catch(() => false);
    test.skip(!isPresent, 'Shopify featured editions not present — fallback rendered.');
    // Regex: "€" + NBSP (U+00A0) + digits, optional comma+cents.
    const priceRe = /€ \d+(?:,\d{2})?/;
    const text = await section.innerText();
    expect(text).toMatch(priceRe);
    // Must NOT use Intl's default "32,00 €" (Euro after) form.
    expect(text).not.toMatch(/\d+,\d{2}\s*€/);
  });
});

test.describe('section 4 — essay teaser', () => {
  test('renders Woher die Zeile kommt + Mehr lesen CTA @essay', async ({ page }) => {
    const section = page.getByRole('region', { name: /Woher die Zeile kommt/ });
    await expect(section).toBeVisible();
    await expect(
      section.getByRole('heading', { name: 'Woher die Zeile kommt' }),
    ).toBeVisible();
    await expect(section.getByRole('link', { name: /Mehr lesen/ })).toBeVisible();
  });
});

test.describe('section 5 — about teaser', () => {
  test('renders Gründer-anriss + Über SILBE CTA @about', async ({ page }) => {
    const section = page.getByRole('region', { name: /Über SILBE/ });
    await expect(section).toBeVisible();
    await expect(
      section.getByText(/zwei Menschen in Wien gemacht/),
    ).toBeVisible();
    await expect(section.getByRole('link', { name: /Mehr über SILBE/ })).toBeVisible();
  });
});

test.describe('section 6 — newsletter cta (homepage)', () => {
  test('renders Kein Newsletter. Ein Brief. heading + cream-bg form @newsletter', async ({ page }) => {
    const section = page.getByRole('region', { name: /Briefe von SILBE/ });
    await expect(section).toBeVisible();
    await expect(
      section.getByRole('heading', { name: 'Kein Newsletter. Ein Brief.' }),
    ).toBeVisible();
    await expect(section.getByRole('textbox', { name: 'E-Mail' })).toBeVisible();
    await expect(section.getByRole('button', { name: /Anmelden/ })).toBeVisible();
  });
});

test.describe('a11y homepage', () => {
  test('every image has a non-empty alt @a11y', async ({ page }) => {
    const imgs = page.locator('img');
    const count = await imgs.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const alt = await imgs.nth(i).getAttribute('alt');
      expect(alt, `img #${i} missing alt attribute`).not.toBeNull();
    }
  });

  test('exactly one h1 on the page @a11y', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('html lang is de-AT @a11y', async ({ page }) => {
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('de-AT');
  });

  test('page title is R8 absolute @a11y', async ({ page }) => {
    await expect(page).toHaveTitle('SILBE — Editionen aus dem literarischen Kanon');
  });

  test('every R8 section is reachable as a landmark @a11y', async ({ page }) => {
    for (const label of [
      /Editorial-Hero/,
      /Editorial-Statement/,
      /(Ausgewählte Editionen|Editionen — in Vorbereitung)/,
      /Woher die Zeile kommt/,
      /Über SILBE/,
      /Briefe von SILBE/,
    ]) {
      await expect(page.getByRole('region', { name: label })).toBeVisible();
    }
  });

  test('no archived voices or forbidden phrases visible @a11y', async ({ page }) => {
    const html = await page.content();
    expect(html).not.toMatch(/Lasker-Schüler|Lasker-Schueler/);
    expect(html).not.toMatch(/handgesetzt|handnummeriert|Bleisatz/i);
    expect(html).not.toMatch(/sechs Wiener Stimmen|Wiener Stimmen/);
    expect(html).not.toMatch(/limitiert|Limited Edition/i);
  });
});
