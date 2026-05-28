import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EditorialLineItem } from './editorial-context';

// Mock the Admin client and the canonical-URL helper so the test runs offline.
// The mocks are set up before the module-under-test is imported, so the
// dynamic import below picks them up.
vi.mock('@/lib/shopify-admin', () => ({
  shopifyAdminFetch: vi.fn(),
}));
vi.mock('@/lib/seo/canonical-url', () => ({
  canonicalUrl: (path: string) => `https://silbe.at${path}`,
}));

import { shopifyAdminFetch } from '@/lib/shopify-admin';
import { buildEditorialMailItems } from './editorial-context';

const adminFetch = vi.mocked(shopifyAdminFetch);

// Helpers — single source of test fixtures so each test stays readable.
function gid(id: string): string {
  return `gid://shopify/Product/${id}`;
}
function lineItem(productId: string, sku: string, title: string): EditorialLineItem {
  return { productId, sku, title };
}
function productNode(params: {
  id: string;
  handle: string | null;
  title: string;
  brief?: string | null;
  imageUrl?: string | null;
}) {
  return {
    id: gid(params.id),
    handle: params.handle,
    title: params.title,
    featuredImage: params.imageUrl ? { url: params.imageUrl } : null,
    metafield: params.brief != null ? { value: params.brief } : null,
  };
}

describe('buildEditorialMailItems — discriminator', () => {
  beforeEach(() => {
    adminFetch.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // (a) Brief-carrying product → emitted in Items[]
  it('emits an item for a product with a non-empty editorial_context', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '1',
          handle: 'silbe-rilke-habegeduld',
          title: 'Rilke ›Habe Geduld‹ — Edition',
          brief: 'Aus den Briefen an einen jungen Dichter…',
          imageUrl: 'https://cdn.shopify.com/rilke.jpg',
        }),
      ],
    });

    const items = await buildEditorialMailItems([
      lineItem('1', 'SILBE-RILKE-A3', 'Rilke ›Habe Geduld‹ — Edition'),
    ]);

    expect(items).toEqual([
      {
        ProductName: 'Rilke ›Habe Geduld‹ — Edition',
        editorial_context: 'Aus den Briefen an einen jungen Dichter…',
        image_url: 'https://cdn.shopify.com/rilke.jpg',
        pdp_url: 'https://silbe.at/editionen/silbe-rilke-habegeduld',
      },
    ]);
  });

  // (b) Briefless product → silent skip, no throw (the throw that the
  // 2026-05-28 discriminator flip removed)
  it('silently skips a product with no editorial_context metafield', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '99',
          handle: 'kafka-tote-milena',
          title: 'Kafka - Ich liebe Dich (Milena) - Tote',
          brief: null,
        }),
      ],
    });

    const items = await buildEditorialMailItems([
      lineItem('99', 'SILBE-TOTE-MILENA', 'Kafka - Ich liebe Dich (Milena) - Tote'),
    ]);

    expect(items).toEqual([]);
  });

  it('treats a whitespace-only editorial_context as no brief (silent skip)', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '42',
          handle: 'malformed-product',
          title: 'Product with malformed brief',
          brief: '   \n  ',
        }),
      ],
    });

    const items = await buildEditorialMailItems([
      lineItem('42', 'SKU-42', 'Product with malformed brief'),
    ]);

    expect(items).toEqual([]);
  });

  // (c) Order with only briefless products → Items[] empty, no event
  it('returns [] when every line-item is briefless', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '10',
          handle: 'muttertag-bundle',
          title: 'Muttertag-Geschenk-Bundle',
          brief: null,
        }),
        productNode({
          id: '11',
          handle: 'kafka-tote-milena',
          title: 'Kafka - Tote',
          brief: null,
        }),
        productNode({
          id: '12',
          handle: 'dreibriefe-3er',
          title: 'Postkarten-Set Drei Briefe',
          brief: '',
        }),
      ],
    });

    const items = await buildEditorialMailItems([
      lineItem('10', 'BUNDLE', 'Muttertag-Geschenk-Bundle'),
      lineItem('11', 'TOTE', 'Kafka - Tote'),
      lineItem('12', 'POSTCARD', 'Postkarten-Set Drei Briefe'),
    ]);

    expect(items).toEqual([]);
  });

  // Mixed order: only brief-carrying items appear, briefless ones skipped silently.
  it('emits only brief-carrying items in a mixed order', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '1',
          handle: 'silbe-kafka-axt',
          title: 'Kafka ›Axt für das gefrorene Meer‹ — Edition',
          brief: 'Aus einem Brief Franz Kafkas an Oskar Pollak…',
          imageUrl: 'https://cdn.shopify.com/kafka.jpg',
        }),
        productNode({
          id: '11',
          handle: 'kafka-tote-milena',
          title: 'Kafka - Tote',
          brief: null,
        }),
      ],
    });

    const items = await buildEditorialMailItems([
      lineItem('1', 'SILBE-KAFKA-A3', 'Kafka — Edition'),
      lineItem('11', 'TOTE', 'Kafka - Tote'),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0].ProductName).toBe('Kafka ›Axt für das gefrorene Meer‹ — Edition');
    expect(items[0].pdp_url).toBe('https://silbe.at/editionen/silbe-kafka-axt');
  });
});

describe('buildEditorialMailItems — adjacent invariants', () => {
  beforeEach(() => {
    adminFetch.mockReset();
  });

  // Dedupe contract: Quantity>1 / multi-variant-of-same-product → ONE Items
  // entry, ONE Admin GraphQL roundtrip. Regressing this would either spam the
  // mail with duplicates or fan out the Admin API call.
  it('dedupes by productId for quantity>1 / multi-variant orders', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '1',
          handle: 'silbe-rilke-habegeduld',
          title: 'Rilke — Edition',
          brief: 'Brief.',
          imageUrl: 'https://cdn.shopify.com/rilke.jpg',
        }),
      ],
    });

    const items = await buildEditorialMailItems([
      lineItem('1', 'SKU-A', 'Rilke — Variant A'),
      lineItem('1', 'SKU-A', 'Rilke — Variant A'),
      lineItem('1', 'SKU-B', 'Rilke — Variant B'),
    ]);

    expect(items).toHaveLength(1);
    expect(adminFetch).toHaveBeenCalledTimes(1);
    const [, vars] = adminFetch.mock.calls[0];
    expect((vars as { ids: string[] }).ids).toEqual([gid('1')]);
  });

  // Empty input → no Admin call, no items. Avoids a wasted roundtrip.
  it('short-circuits on empty input without calling Admin', async () => {
    const items = await buildEditorialMailItems([]);
    expect(items).toEqual([]);
    expect(adminFetch).not.toHaveBeenCalled();
  });

  // Fail-loud: a brief-carrying product without a handle blocks event creation
  // because we cannot build pdp_url. Stays fail-loud post-discriminator flip.
  it('throws when a brief-carrying product is missing a handle', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '1',
          handle: null,
          title: 'Brief product, missing handle',
          brief: 'Some brief.',
          imageUrl: 'https://cdn.shopify.com/x.jpg',
        }),
      ],
    });

    await expect(
      buildEditorialMailItems([lineItem('1', 'SKU', 'X')]),
    ).rejects.toThrow(/handle missing/i);
  });

  // featuredImage is a warn-not-throw — the mail must still send.
  it('emits item with image_url="" and warns when featuredImage is null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '1',
          handle: 'silbe-zweig-dir-der-du',
          title: 'Zweig — Edition',
          brief: 'Die erste Zeile…',
          imageUrl: null,
        }),
      ],
    });

    const items = await buildEditorialMailItems([lineItem('1', 'SKU', 'Zweig')]);

    expect(items).toHaveLength(1);
    expect(items[0].image_url).toBe('');
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/featuredImage missing/i),
    );
  });

  // Product hard-deleted between order placement and webhook delivery
  // (Shopify returns null in the nodes array) → warn + skip, don't throw.
  it('warns and skips when a product GID resolves to null', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    adminFetch.mockResolvedValueOnce({ nodes: [null] });

    const items = await buildEditorialMailItems([
      lineItem('9999', 'GHOST', 'Deleted product'),
    ]);

    expect(items).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/not found in Shopify/i),
    );
  });

  // The raw line_items[].product_id Shopify sends is numeric. The lib must
  // wrap it into a Product GID before the nodes() query — and accept already-
  // wrapped GIDs verbatim.
  it('accepts both raw numeric productIds and pre-wrapped GIDs', async () => {
    adminFetch.mockResolvedValueOnce({
      nodes: [
        productNode({
          id: '7',
          handle: 'silbe-rilke-habegeduld',
          title: 'Rilke',
          brief: 'Brief.',
          imageUrl: 'https://cdn.shopify.com/rilke.jpg',
        }),
      ],
    });

    await buildEditorialMailItems([
      lineItem(gid('7'), 'SKU', 'Rilke (pre-wrapped GID)'),
    ]);

    const [, vars] = adminFetch.mock.calls[0];
    expect((vars as { ids: string[] }).ids).toEqual([gid('7')]);
  });
});
