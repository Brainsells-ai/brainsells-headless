import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Phase-9 Sprint-A — JSON-LD structured data. Parses every ld+json script on a
// route and validates the expected schema.org nodes. Parsing each script as
// JSON also proves the XSS escape held (an unescaped "</script>" would break
// the tag and yield invalid/empty JSON here).

const FLAGSHIP_HANDLE = 'silbe-rilke-habegeduld';

// Returns the flattened list of schema.org nodes across all ld+json scripts on
// the page. Each script may hold a single node or an array of nodes.
async function jsonLdNodes(page: Page): Promise<Record<string, unknown>[]> {
  const scripts = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  expect(scripts.length, 'expected at least one ld+json script').toBeGreaterThan(0);
  const nodes: Record<string, unknown>[] = [];
  for (const raw of scripts) {
    const parsed = JSON.parse(raw); // throws → test fails if escape broke JSON
    if (Array.isArray(parsed)) nodes.push(...parsed);
    else nodes.push(parsed);
  }
  return nodes;
}

const byType = (nodes: Record<string, unknown>[], type: string) =>
  nodes.find((n) => n['@type'] === type);

test.describe('JSON-LD structured data @seo', () => {
  test('homepage exposes Organization + WebSite @seo', async ({ page }) => {
    await page.goto('/');
    const nodes = await jsonLdNodes(page);

    const org = byType(nodes, 'Organization');
    expect(org, 'Organization node').toBeTruthy();
    expect(org!.name).toBe('SILBE');
    expect(org!.legalName).toBe('Brainsells e.U.');

    const website = byType(nodes, 'WebSite');
    expect(website, 'WebSite node').toBeTruthy();
    expect(website!.name).toBe('SILBE');
  });

  test('listing exposes BreadcrumbList with 2 items @seo', async ({ page }) => {
    await page.goto('/editionen');
    const nodes = await jsonLdNodes(page);
    const crumb = byType(nodes, 'BreadcrumbList') as
      | { itemListElement: unknown[] }
      | undefined;
    expect(crumb, 'BreadcrumbList node').toBeTruthy();
    expect(crumb!.itemListElement).toHaveLength(2);
  });

  test('PDP exposes valid Product (AggregateOffer) + 3-item BreadcrumbList @seo', async ({
    page,
  }) => {
    await page.goto(`/editionen/${FLAGSHIP_HANDLE}`);
    const nodes = await jsonLdNodes(page);

    const product = byType(nodes, 'Product') as
      | {
          name: unknown;
          brand: { name: unknown };
          offers: { '@type': unknown; priceCurrency: unknown; availability: unknown };
        }
      | undefined;
    expect(product, 'Product node').toBeTruthy();
    expect(product!.name, 'product name').toBeTruthy();
    expect(product!.brand.name).toBe('SILBE');
    expect(product!.offers['@type']).toBe('AggregateOffer');
    expect(product!.offers.priceCurrency).toBe('EUR');
    expect(product!.offers.availability).toMatch(/schema\.org\/(InStock|OutOfStock)/);

    const crumb = byType(nodes, 'BreadcrumbList') as
      | { itemListElement: unknown[] }
      | undefined;
    expect(crumb, 'BreadcrumbList node').toBeTruthy();
    expect(crumb!.itemListElement).toHaveLength(3);
  });
});
