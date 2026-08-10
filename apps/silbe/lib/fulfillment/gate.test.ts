// Unit tests for the print-file gate and the router.
//
// The gate tests assert HARD FAILURE. If a future change turns any of these into
// a warning, these tests must fail — that is their point.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MIN_DPI,
  TARGET_DPI,
  effectiveDpi,
  minDpiFor,
  targetRasterFor,
} from './print-spec';
import { PrintFileRejected, assertPrintFileValid, collectPrintFileFailures } from './validate';
import { getProviderForItem, routeOrder } from './router';
import { resetProviderCache } from './registry';
import type { NormalizedOrder, PlacementSpec, PrintFile } from './types';

// front_large on Bella+Canvas 3001, verified against the live catalog 2026-08-06.
const FRONT_LARGE: PlacementSpec = {
  placement: 'front_large',
  technique: 'dtg',
  widthIn: 15,
  heightIn: 18,
  conflictsWith: ['front', 'front_dtf'],
};

function fileFor(widthPx: number, heightPx: number, over: Partial<PrintFile> = {}): PrintFile {
  return {
    url: 'https://example.com/print.png',
    widthPx,
    heightPx,
    format: 'png',
    bytes: 1024,
    ...over,
  };
}

describe('print-spec geometry', () => {
  it('turns inches x dpi into pixels, rounding up', () => {
    expect(targetRasterFor(15, 18, 300)).toEqual({ widthPx: 9999, heightPx: 5400, dpi: 300 });
    // 3.5in at 150dpi = 525 exactly; 1.13in at 150 = 169.5 → 170
    expect(targetRasterFor(1.13, 3, 150).widthPx).toBe(170);
  });

  it('defaults to TARGET_DPI, which sits above the floor', () => {
    expect(targetRasterFor(1, 1).dpi).toBe(TARGET_DPI);
    expect(TARGET_DPI).toBeGreaterThanOrEqual(MIN_DPI);
  });

  it('refuses non-positive geometry instead of producing a zero-size raster', () => {
    expect(() => targetRasterFor(0, 18)).toThrow();
    expect(() => targetRasterFor(15, -1)).toThrow();
    expect(() => targetRasterFor(15, 18, 0)).toThrow();
  });

  it('computes effective dpi and per-technique floors', () => {
    expect(effectiveDpi(4500, 15)).toBe(300);
    expect(minDpiFor('dtg')).toBe(150);
    // An unknown technique falls back to the global floor rather than to zero.
    expect(minDpiFor('sublimation-not-listed')).toBe(MIN_DPI);
  });
});

describe('print-file gate', () => {
  it('passes a file rendered exactly for the placement', () => {
    const target = targetRasterFor(FRONT_LARGE.widthIn, FRONT_LARGE.heightIn, 300);
    expect(() =>
      assertPrintFileValid(fileFor(target.widthPx, target.heightPx), FRONT_LARGE),
    ).not.toThrow();
  });

  it('HARD-FAILS below the DPI floor', () => {
    // 15x18in at 100 dpi → below the 150 floor.
    const failures = collectPrintFileFailures(fileFor(1500, 1800), FRONT_LARGE);
    expect(failures.map((f) => f.code)).toContain('BELOW_MIN_DPI');
    expect(() => assertPrintFileValid(fileFor(1500, 1800), FRONT_LARGE)).toThrow(
      PrintFileRejected,
    );
  });

  it('HARD-FAILS a non-delivery format, including SVG', () => {
    const target = targetRasterFor(15, 18, 300);
    const failures = collectPrintFileFailures(
      fileFor(target.widthPx, target.heightPx, { format: 'svg' }),
      FRONT_LARGE,
    );
    expect(failures.map((f) => f.code)).toContain('FORMAT_NOT_ALLOWED');
  });

  it('HARD-FAILS a file that is the wrong shape for the placement', () => {
    // Square file at a placement that is 15x18 — clears DPI on one axis, wrong shape.
    const failures = collectPrintFileFailures(fileFor(4500, 4500), FRONT_LARGE);
    expect(failures.map((f) => f.code)).toContain('DIMENSIONS_MISMATCH');
  });

  it('HARD-FAILS an oversized file', () => {
    const target = targetRasterFor(15, 18, 300);
    const failures = collectPrintFileFailures(
      fileFor(target.widthPx, target.heightPx, { bytes: 500 * 1024 * 1024 }),
      FRONT_LARGE,
    );
    expect(failures.map((f) => f.code)).toContain('FILE_TOO_LARGE');
  });

  it('reports every failure at once rather than one per round trip', () => {
    const failures = collectPrintFileFailures(
      fileFor(300, 300, { format: 'jpeg', bytes: 500 * 1024 * 1024 }),
      FRONT_LARGE,
    );
    expect(failures.length).toBeGreaterThanOrEqual(3);
  });
});

describe('router', () => {
  beforeEach(() => {
    resetProviderCache();
    vi.stubEnv('FULFILLMENT_DEFAULT_PROVIDER', 'mock');
    vi.stubEnv('FULFILLMENT_ENABLED_PROVIDERS', 'mock');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    resetProviderCache();
  });

  const item = (metadata: Record<string, unknown>) => ({
    sku: 'SKU-1',
    productHandle: 'h',
    quantity: 1,
    metadata: { printFileUrl: 'https://example.com/f.png', ...metadata },
  });

  const order = (items: NormalizedOrder['items']): NormalizedOrder => ({
    id: 'gid://shopify/Order/1',
    reference: '#1',
    customer: { email: 'a@example.com', firstName: 'A', lastName: 'B' },
    shippingAddress: { line1: 'x', city: 'Wien', postalCode: '1010', country: 'AT' },
    items,
    currency: 'EUR',
    totalAmount: 1,
  });

  it('falls back to the brand default provider', () => {
    expect(getProviderForItem(item({})).name).toBe('mock');
  });

  it('refuses a provider that is not on the brand allowlist', () => {
    expect(() => getProviderForItem(item({ fulfillmentProvider: 'printful' }))).toThrow(
      /not enabled/,
    );
  });

  it('refuses a non-string provider override instead of coercing it', () => {
    expect(() => getProviderForItem(item({ fulfillmentProvider: 7 }))).toThrow(/must be a string/);
  });

  it('refuses to route an order with no items', async () => {
    await expect(routeOrder(order([]))).rejects.toThrow(/no items/);
  });

  it('returns one settled result per provider group', async () => {
    const results = await routeOrder(order([item({}), item({})]));
    expect(results).toHaveLength(1);
    expect(results[0].provider).toBe('mock');
    expect(results[0].outcome.status).toBe('fulfilled');
  });
});
