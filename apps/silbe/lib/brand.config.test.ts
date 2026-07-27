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
