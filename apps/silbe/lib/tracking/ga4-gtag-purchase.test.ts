import { describe, it, expect } from 'vitest';
import {
  gtagProducts,
  buildPurchaseGtagUrl,
  STAPE_SERVER_BASE,
} from './ga4-gtag-purchase';

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
});
