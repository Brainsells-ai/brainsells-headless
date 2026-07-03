import { describe, it, expect } from 'vitest';
import {
  gtagProducts,
  buildPurchaseGtagUrl,
  STAPE_SERVER_BASE,
} from './ga4-gtag-purchase';
import { buildUserDataBundle, packUserData } from './user-data';

describe('gtagProducts', () => {
  it('builds id_~nm~pr~qt with literal ~ delimiters', () => {
    expect(
      gtagProducts([{ item_id: '42', item_name: 'Habe Geduld', price: '0.50', quantity: 1 }]),
    ).toEqual(['pr1=id_42~nmHabe%20Geduld~pr0.50~qt1']);
  });

  it('Caveat 1: appends ~va only when item_variant is present + non-empty', () => {
    expect(
      gtagProducts([{ item_id: '42', item_name: 'X', price: '1', quantity: 1, item_variant: 'A3' }])[0],
    ).toContain('~vaA3');
    expect(
      gtagProducts([{ item_id: '42', item_name: 'X', price: '1', quantity: 1, item_variant: null }])[0],
    ).not.toContain('~va');
    expect(
      gtagProducts([{ item_id: '42', item_name: 'X', price: '1', quantity: 1, item_variant: '' }])[0],
    ).not.toContain('~va');
  });

  it('suppresses Shopify\'s "Default Title" single-variant noise', () => {
    expect(
      gtagProducts([
        { item_id: '42', item_name: 'X', price: '1', quantity: 1, item_variant: 'Default Title' },
      ])[0],
    ).not.toContain('~va');
  });

  it('numbers products pr1, pr2, …', () => {
    const segs = gtagProducts([
      { item_id: '1', item_name: 'A', price: '1', quantity: 1 },
      { item_id: '2', item_name: 'B', price: '2', quantity: 3 },
    ]);
    expect(segs[0]).toMatch(/^pr1=/);
    expect(segs[1]).toMatch(/^pr2=id_2~nmB~pr2~qt3$/);
  });

  it('encodes value chars but keeps structural ~ literal', () => {
    // Ampersand + slash in the name must be encoded; the ~ separators must not.
    const seg = gtagProducts([{ item_id: 'a/b', item_name: 'C & D', price: '1', quantity: 1 }])[0];
    expect(seg).toContain('id_a%2Fb~nmC%20%26%20D~pr1~qt1');
    expect(seg).not.toContain('%7E');
  });
});

describe('buildPurchaseGtagUrl', () => {
  const base = {
    measurementId: 'G-Z06HHP6EFM',
    clientId: '1234567890.1700000000',
    sessionId: '1700000000',
    transactionId: '13894249349460',
    value: '0.50',
    currency: 'EUR',
    items: [{ item_id: '42', item_name: 'Habe Geduld', price: '0.50', quantity: 1, item_variant: 'A3' }],
  };

  it('targets the Stape /g/collect endpoint', () => {
    expect(buildPurchaseGtagUrl(base).startsWith(STAPE_SERVER_BASE + '/g/collect?')).toBe(true);
  });

  it('carries the verified Stufe-0 params', () => {
    const url = buildPurchaseGtagUrl(base);
    for (const part of [
      'v=2',
      'tid=G-Z06HHP6EFM',
      'gtm=45je',
      '_p=1',
      'cid=1234567890.1700000000',
      'sid=1700000000',
      'sct=1',
      'seg=1',
      'en=purchase',
      '_et=100',
      'ep.transaction_id=13894249349460',
      'epn.value=0.50',
      'ep.currency=EUR',
      'pr1=id_42~nmHabe%20Geduld~pr0.50~qt1~vaA3',
    ]) {
      expect(url).toContain(part);
    }
  });

  it('adds _dbg=1 only when debug', () => {
    expect(buildPurchaseGtagUrl(base)).not.toContain('_dbg=1');
    expect(buildPurchaseGtagUrl({ ...base, debug: true })).toContain('_dbg=1');
  });

  // Backward-compat: without the Stufe-2 args the hit is byte-shape-identical to
  // the verified-green Stufe-0 purchase (no event_id / bs_ud leak in).
  it('omits ep.event_id and ep.bs_ud when their args are absent', () => {
    const url = buildPurchaseGtagUrl(base);
    expect(url).not.toContain('ep.event_id=');
    expect(url).not.toContain('ep.bs_ud=');
  });

  it('adds ep.event_id when eventId is given (CAPI dedup = order id)', () => {
    expect(buildPurchaseGtagUrl({ ...base, eventId: '13894249349460' })).toContain(
      'ep.event_id=13894249349460',
    );
  });

  it('adds ep.bs_ud only when a packed bundle is present', () => {
    const packed = packUserData(
      buildUserDataBundle({
        email: 'test@example.com',
        ip: '2001:4bc9:b06c:7dc9:3cc8:4a17:70d0:d645', // IPv6 passthrough
        userAgent: 'Mozilla/5.0',
      }),
    )!;
    const withUd = buildPurchaseGtagUrl({ ...base, userDataPacked: packed });
    expect(withUd).toContain('ep.bs_ud=' + packed); // base64url is URL-safe → unchanged
    // null / undefined → not attached (GA4-only hit)
    expect(buildPurchaseGtagUrl({ ...base, userDataPacked: null })).not.toContain('ep.bs_ud=');
    expect(buildPurchaseGtagUrl(base)).not.toContain('ep.bs_ud=');
  });

  it('emits no bs_test_ params when testEventCodes is absent or all empty', () => {
    expect(buildPurchaseGtagUrl(base)).not.toContain('bs_test_');
    expect(
      buildPurchaseGtagUrl({ ...base, testEventCodes: { meta: '', tiktok: null } }),
    ).not.toContain('bs_test_');
  });

  it('emits only the set platform test code (serial isolation)', () => {
    const url = buildPurchaseGtagUrl({ ...base, testEventCodes: { meta: 'TEST123' } });
    expect(url).toContain('ep.bs_test_meta=TEST123');
    expect(url).not.toContain('ep.bs_test_tiktok=');
    expect(url).not.toContain('ep.bs_test_pinterest=');
  });

  it('maps each platform to its own bs_test_ param', () => {
    const url = buildPurchaseGtagUrl({
      ...base,
      testEventCodes: { meta: 'M1', tiktok: 'T2', pinterest: 'P3' },
    });
    expect(url).toContain('ep.bs_test_meta=M1');
    expect(url).toContain('ep.bs_test_tiktok=T2');
    expect(url).toContain('ep.bs_test_pinterest=P3');
  });
});
