// ONE contract suite, run against EVERY provider.
//
// This file is the actual evidence that the abstraction holds. A claim in a PR
// description that "the interface is provider-agnostic" is not evidence; two
// independent implementations passing identical assertions is.
//
// Contract rules asserted here, in plain words:
//   1. `name` is a stable non-empty identifier.
//   2. `verifyWebhook` FAILS CLOSED — no signature, no secret, empty body → false.
//   3. `createOrder` refuses an empty order.
//   4. `createOrder` refuses an item without a print-file URL (Model B).
//   5. `cancelOrder` / `getStatus` reject an unknown provider order id.
//   6. `handleWebhook` refuses a payload that is not an object.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockProvider } from './providers/mock';
import { PrintfulProvider } from './providers/printful';
import type { FulfillmentProvider, NormalizedOrder } from './types';

function orderWith(items: NormalizedOrder['items']): NormalizedOrder {
  return {
    id: 'gid://shopify/Order/1',
    reference: '#1042',
    customer: { email: 'a@example.com', firstName: 'Ada', lastName: 'Lovelace' },
    shippingAddress: {
      line1: 'Teststraße 1',
      city: 'Wien',
      postalCode: '1010',
      country: 'AT',
    },
    items,
    currency: 'EUR',
    totalAmount: 32,
  };
}

const itemWithoutPrintFile: NormalizedOrder['items'][number] = {
  sku: 'SKU-1',
  productHandle: 'handle-1',
  quantity: 1,
  metadata: { catalogVariantId: 4025, placement: 'front_large' },
};

/** Providers under contract. Adding a provider means adding one line here. */
const SUBJECTS: Array<{ name: string; make: () => FulfillmentProvider }> = [
  { name: 'MockProvider', make: () => new MockProvider() },
  { name: 'PrintfulProvider', make: () => new PrintfulProvider() },
];

describe.each(SUBJECTS)('FulfillmentProvider contract — $name', ({ make }) => {
  beforeEach(() => {
    // Printful reads credentials lazily; the contract must not depend on the
    // network, so fetch is stubbed to fail loudly if a test ever reaches it.
    vi.stubEnv('PRINTFUL_API_TOKEN', 'test-token-not-a-real-secret');
    vi.stubEnv('PRINTFUL_STORE_ID', '18090343');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network call not expected in the contract suite');
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('exposes a stable non-empty name', () => {
    const provider = make();
    expect(typeof provider.name).toBe('string');
    expect(provider.name.length).toBeGreaterThan(0);
    expect(provider.name).toBe(make().name);
  });

  it('verifyWebhook fails closed without a signature', () => {
    const provider = make();
    expect(provider.verifyWebhook('{"a":1}', new Headers())).toBe(false);
  });

  it('verifyWebhook fails closed on an empty payload', () => {
    const provider = make();
    const headers = new Headers({
      'x-mock-signature': MockProvider.WEBHOOK_SECRET,
      'x-printful-signature': 'deadbeef',
    });
    expect(provider.verifyWebhook('', headers)).toBe(false);
  });

  it('createOrder refuses an order without items', async () => {
    const provider = make();
    await expect(provider.createOrder(orderWith([]))).rejects.toThrow();
  });

  it('createOrder refuses an item without a print-file URL', async () => {
    const provider = make();
    await expect(provider.createOrder(orderWith([itemWithoutPrintFile]))).rejects.toThrow();
  });

  it('cancelOrder rejects an unknown provider order id', async () => {
    const provider = make();
    await expect(provider.cancelOrder('does-not-exist')).rejects.toThrow();
  });

  it('getStatus rejects an unknown provider order id', async () => {
    const provider = make();
    await expect(provider.getStatus('does-not-exist')).rejects.toThrow();
  });

  it('handleWebhook refuses a non-object payload', async () => {
    const provider = make();
    await expect(provider.handleWebhook('not-an-object')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Provider-specific behaviour that is NOT part of the shared contract.
// ---------------------------------------------------------------------------

describe('MockProvider specifics', () => {
  it('accepts its own signature and completes a full lifecycle', async () => {
    const provider = new MockProvider();
    const created = await provider.createOrder(
      orderWith([
        {
          ...itemWithoutPrintFile,
          metadata: { ...itemWithoutPrintFile.metadata, printFileUrl: 'https://example.com/f.png' },
        },
      ]),
    );
    expect(created.status).toBe('created');

    const headers = new Headers({ 'x-mock-signature': MockProvider.WEBHOOK_SECRET });
    expect(provider.verifyWebhook('{"a":1}', headers)).toBe(true);

    const result = await provider.handleWebhook({
      providerOrderId: created.providerOrderId,
      newStatus: 'shipped',
    });
    expect(result.newStatus).toBe('shipped');
    expect(result.shouldNotifyCustomer).toBe(true);

    const status = await provider.getStatus(created.providerOrderId);
    expect(status.status).toBe('shipped');

    await expect(provider.cancelOrder(created.providerOrderId)).rejects.toThrow(/shipped/);
  });
});

describe('PrintfulProvider specifics', () => {
  beforeEach(() => {
    vi.stubEnv('PRINTFUL_API_TOKEN', 'test-token-not-a-real-secret');
    vi.stubEnv('PRINTFUL_STORE_ID', '18090343');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects a product id passed where a catalog VARIANT id is required', async () => {
    const provider = new PrintfulProvider();
    await expect(
      provider.createOrder(
        orderWith([
          {
            sku: 'SKU-1',
            productHandle: 'h',
            quantity: 1,
            // A string here stands in for "someone passed the wrong id shape".
            metadata: {
              catalogVariantId: '71',
              placement: 'front_large',
              printFileUrl: 'https://example.com/f.png',
            },
          },
        ]),
      ),
    ).rejects.toThrow(/CATALOG VARIANT id/);
  });

  it('verifyWebhook stays closed while PRINTFUL_WEBHOOK_SECRET is unset', () => {
    vi.stubEnv('PRINTFUL_WEBHOOK_SECRET', '');
    const provider = new PrintfulProvider();
    const headers = new Headers({ 'x-printful-signature': 'anything' });
    expect(provider.verifyWebhook('{"a":1}', headers)).toBe(false);
  });
});
