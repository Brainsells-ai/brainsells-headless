import { describe, it, expect, afterEach } from 'vitest';
import { brandConfig } from './brand.config';
import { buildPurchaseGtagUrl } from './tracking/ga4-gtag-purchase';

// Block-A hardening (surfaced by the Block-B verification run): a trailing slash
// in STAPE_SERVER_BASE built `…net//g/collect` → 404. brand.config now strips
// trailing slash(es) from the one value that flows into a URL path.

const KEY = 'STAPE_SERVER_BASE';
const CLEAN = 'https://ctsqyrwh.eus.stape.net';
const orig = process.env[KEY];

afterEach(() => {
  if (orig === undefined) delete process.env[KEY];
  else process.env[KEY] = orig;
});

describe('brandConfig.stape.serverBase — trailing-slash normalization', () => {
  it('strips a single trailing slash', () => {
    process.env[KEY] = `${CLEAN}/`;
    expect(brandConfig.stape.serverBase).toBe(CLEAN);
  });

  it('strips multiple trailing slashes', () => {
    process.env[KEY] = `${CLEAN}///`;
    expect(brandConfig.stape.serverBase).toBe(CLEAN);
  });

  it('leaves a clean value unchanged', () => {
    process.env[KEY] = CLEAN;
    expect(brandConfig.stape.serverBase).toBe(CLEAN);
  });

  it('a trailing-slash env yields a gtag URL with .net/g/collect (no double slash)', () => {
    process.env[KEY] = `${CLEAN}/`;
    const url = buildPurchaseGtagUrl({
      measurementId: 'G-TEST',
      stapeServerBase: brandConfig.stape.serverBase,
      gtmFingerprint: '45je',
      clientId: '1.2',
      sessionId: '3',
      transactionId: '999',
      value: '0.50',
      currency: 'EUR',
      items: [],
    });
    expect(url).toContain('.net/g/collect?');
    expect(url).not.toContain('.net//g/collect');
  });
});

// Block-A Nachbesserung 2026-08-10: two values that were hardcoded to SILBE's
// identity now come from env. The assertion that matters is the FAIL-FAST one —
// a fork must be told loudly, not silently inherit SILBE's namespace or
// attribution. These tests exist so a future "just add a default" cannot pass.

describe('brandConfig.editorial.namespace — was the hardcoded literal "silbe"', () => {
  const K = 'EDITORIAL_METAFIELD_NAMESPACE';
  const before = process.env[K];
  afterEach(() => {
    if (before === undefined) delete process.env[K];
    else process.env[K] = before;
  });

  it('returns the configured namespace', () => {
    process.env[K] = 'someotherbrand';
    expect(brandConfig.editorial.namespace).toBe('someotherbrand');
  });

  it('THROWS when unset instead of falling back to "silbe"', () => {
    delete process.env[K];
    expect(() => brandConfig.editorial.namespace).toThrow(/EDITORIAL_METAFIELD_NAMESPACE/);
  });

  it('is independent of the purchase-marker namespace', () => {
    process.env[K] = 'editorial-ns';
    process.env.MARKER_NAMESPACE = 'marker-ns';
    expect(brandConfig.editorial.namespace).toBe('editorial-ns');
    expect(brandConfig.marker.namespace).toBe('marker-ns');
  });
});

describe('brandConfig.klaviyo.newsletterSource — was "silbe.at footer"', () => {
  const K = 'KLAVIYO_NEWSLETTER_SOURCE';
  const before = process.env[K];
  afterEach(() => {
    if (before === undefined) delete process.env[K];
    else process.env[K] = before;
  });

  it('returns the configured attribution string', () => {
    process.env[K] = 'meine-brand.at footer';
    expect(brandConfig.klaviyo.newsletterSource).toBe('meine-brand.at footer');
  });

  it('THROWS when unset instead of attributing signups to silbe.at', () => {
    delete process.env[K];
    expect(() => brandConfig.klaviyo.newsletterSource).toThrow(/KLAVIYO_NEWSLETTER_SOURCE/);
  });
});
