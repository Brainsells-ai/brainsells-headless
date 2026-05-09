import { test, expect } from '@playwright/test';

// Tests are tagged so they can be selected via --grep ("@hero", "@trust",
// "@stimmen", "@featured", "@a11y").

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('hero hybrid layout', () => {
  test('renders quote, source, tagline, CTA pair, and composite image @hero', async ({ page }) => {
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    await expect(h1).toContainText('Habe Geduld gegen alles Ungelöste');
    await expect(h1).toContainText('„'); // deutsches Anführungszeichen
    await expect(h1).toContainText('"');

    // Source caption with Guillemets.
    const source = page.getByText(/Rainer Maria Rilke · ›Briefe an einen jungen Dichter‹ · 1903/);
    await expect(source.first()).toBeVisible();

    // CTA pair — exact:true to avoid colliding with the closing
    // "Alle Editionen ansehen →" links elsewhere on the page.
    await expect(page.getByRole('link', { name: 'Editionen ansehen', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Bibliothek lesen →' })).toBeVisible();

    // Composite image present with descriptive alt text.
    const heroImg = page.getByRole('img', { name: /Goldrahmen.*Atelier Wien|Rilke-Edition/ });
    await expect(heroImg.first()).toBeVisible();
  });

  test('hero figure caption is present @hero', async ({ page }) => {
    await expect(page.getByText('Goldrahmen-Edition · Atelier Wien').first()).toBeVisible();
  });

  test('hero quote uses German typography only @hero', async ({ page }) => {
    const heroSection = page.getByRole('region', { name: /Editorial Klassiker/ });
    const html = await heroSection.innerHTML();
    expect(html).toMatch(/„Habe Geduld/);
    expect(html).not.toMatch(/"Habe Geduld/);
    expect(html).not.toMatch(/"Briefe an einen jungen Dichter"/);
    expect(html).toMatch(/›Briefe an einen jungen Dichter‹/);
  });
});

test.describe('trust bar', () => {
  test('renders the four canonical trust statements @trust', async ({ page }) => {
    await expect(page.getByText('Hochweißes Premium-Papier · 200 g/m² · matt · säurefrei')).toBeVisible();
    await expect(page.getByText('Gedruckt in der EU · überwiegend Deutschland')).toBeVisible();
    await expect(page.getByText('Versand 3–6 Werktage · DE · AT · ab €39 frei')).toBeVisible();
    await expect(page.getByText('Kuratiert in Wien · Per Hand · primärquellenverifiziert')).toBeVisible();
  });
});

test.describe('fünf stimmen', () => {
  test('lists all five voices with full names and Guillemets work titles @stimmen', async ({ page }) => {
    const section = page.getByRole('region', { name: /Die SILBE-Auswahl/ });
    for (const name of [
      'Rainer Maria Rilke',
      'Franz Kafka',
      'Thomas Mann',
      'Stefan Zweig',
      'Marie von Ebner-Eschenbach',
    ]) {
      await expect(section.getByRole('heading', { name })).toBeVisible();
    }
    // No archived Lasker-Schüler appears anywhere on the homepage.
    const html = await page.content();
    expect(html).not.toMatch(/Lasker-Schüler|Lasker-Schueler/);
  });
});

test.describe('featured editions', () => {
  test('featured editions render — either Shopify products or in-Vorbereitung fallback @featured', async ({ page }) => {
    const section = page.getByRole('region', { name: /(Ausgewählte Editionen|Editionen — in Vorbereitung)/ });
    await expect(section).toBeVisible();
    // The "Alle Editionen ansehen →" link is present in both states.
    await expect(section.getByRole('link', { name: /Alle Editionen ansehen/ })).toBeVisible();
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

  test('every section is reachable as a landmark @a11y', async ({ page }) => {
    for (const label of [
      /Editorial Klassiker/, // Hero
      /Vertrauen/, // TrustBar
      /(Ausgewählte Editionen|Editionen — in Vorbereitung)/, // FeaturedEditions
      /Die SILBE-Auswahl/, // FuenfStimmen
      /Editorial-Brief/, // EditorialLetter
      /Editorial-Atelier/, // WerkstattTeaser
      /Bibliothek/, // BibliothekTeaser
    ]) {
      await expect(page.getByRole('region', { name: label })).toBeVisible();
    }
  });
});
