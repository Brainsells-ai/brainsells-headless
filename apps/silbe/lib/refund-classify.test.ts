import { describe, it, expect } from 'vitest';
import { sumRefundAmount, classifyRefund } from './refund-classify';

describe('sumRefundAmount', () => {
  it('sums refund-kind transactions (incl. pending — status is not consulted)', () => {
    expect(sumRefundAmount([{ amount: '0.50', kind: 'refund' }])).toBe(0.5);
  });
  it('ignores non-refund transactions (e.g. the original sale/capture)', () => {
    expect(
      sumRefundAmount([
        { amount: '0.50', kind: 'sale' },
        { amount: '0.30', kind: 'refund' },
      ]),
    ).toBe(0.3);
  });
  it('handles missing / empty / amount-less input', () => {
    expect(sumRefundAmount(undefined)).toBe(0);
    expect(sumRefundAmount(null)).toBe(0);
    expect(sumRefundAmount([])).toBe(0);
    expect(sumRefundAmount([{ kind: 'refund' }])).toBe(0);
  });
});

describe('classifyRefund', () => {
  it('detects a PENDING Shopify-Payments full refund despite unsettled status', () => {
    // The exact #1014/#1015 case: a real 0.50 refund, still pending, order PAID.
    expect(
      classifyRefund({
        transactions: [{ amount: '0.50', kind: 'refund' }],
        priorRefunded: 0,
        orderTotal: 0.5,
      }),
    ).toEqual({ amount: 0.5, isFull: true });
  });

  it('treats a partial refund as not full', () => {
    expect(
      classifyRefund({
        transactions: [{ amount: '0.20', kind: 'refund' }],
        priorRefunded: 0,
        orderTotal: 0.5,
      }),
    ).toEqual({ amount: 0.2, isFull: false });
  });

  it('counts cumulative: a prior partial + this partial reaching the total is full', () => {
    expect(
      classifyRefund({
        transactions: [{ amount: '0.30', kind: 'refund' }],
        priorRefunded: 0.2,
        orderTotal: 0.5,
      }),
    ).toEqual({ amount: 0.3, isFull: true });
  });

  it('treats a zero / restock-only refund as not full', () => {
    expect(
      classifyRefund({ transactions: [], priorRefunded: 0, orderTotal: 0.5 }),
    ).toEqual({ amount: 0, isFull: false });
  });

  it('avoids float drift via integer cents (0.1 + 0.2 === total 0.3)', () => {
    expect(
      classifyRefund({
        transactions: [{ amount: '0.10', kind: 'refund' }],
        priorRefunded: 0.2,
        orderTotal: 0.3,
      }),
    ).toEqual({ amount: 0.1, isFull: true });
  });

  it('never marks a zero-total order as full', () => {
    expect(
      classifyRefund({ transactions: [{ amount: '0', kind: 'refund' }], priorRefunded: 0, orderTotal: 0 })
        .isFull,
    ).toBe(false);
  });
});
