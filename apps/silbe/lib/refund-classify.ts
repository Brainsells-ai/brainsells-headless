// Pure full-refund classification for the refunds/create webhook.
//
// Why separate from the route: the full-refund decision must NOT depend on the
// order's settled `displayFinancialStatus`. Shopify Payments refunds settle
// asynchronously — at refunds/create time the refund transaction is
// REFUND/PENDING, the order is still PAID, and `totalRefunded` is 0.0. The
// status flips to REFUNDED only at settlement, and refunds/create does NOT
// re-fire then. Gating on `=== 'REFUNDED'` therefore drops every Shopify-
// Payments refund. Instead we decide from the refund's own amount (carried in
// the webhook payload) vs the order total — both known at webhook time,
// settlement-independent.
//
// Deliberately "full refunds only" for now (smaller blast radius), but the
// shape — returning `amount` alongside `isFull` — keeps a later partial-refund
// extension a one-branch change, not a rewrite: GA4's `refund` event already
// accepts a partial `value`.

export type RefundTransactionInput = {
  amount?: string | null;
  kind?: string | null;
};

export type RefundClassification = {
  /** Money moved by THIS refund (sum of its refund transactions), incl. pending. */
  amount: number;
  /** True when prior-settled + this refund covers the full order total. */
  isFull: boolean;
};

function toCents(n: number): number {
  return Math.round(n * 100);
}

// Sum the money this refund moves. `kind === 'refund'` transactions only;
// PENDING is included on purpose — Shopify Payments settles async but the money
// WILL move, so a pending full refund still counts.
export function sumRefundAmount(
  transactions: RefundTransactionInput[] | undefined | null,
): number {
  if (!transactions) return 0;
  return transactions.reduce(
    (sum, t) => (t.kind === 'refund' ? sum + (Number(t.amount) || 0) : sum),
    0,
  );
}

export function classifyRefund(args: {
  transactions: RefundTransactionInput[] | undefined | null;
  /** Already-SETTLED prior refunds on the order (order.totalRefunded). */
  priorRefunded: number;
  /** Order total (currentTotalPrice). */
  orderTotal: number;
}): RefundClassification {
  const amount = sumRefundAmount(args.transactions);
  const totalCents = toCents(args.orderTotal);
  // Integer cents avoid float drift (0.1 + 0.2 !== 0.3). A zero-total order
  // never qualifies (guards an empty/edited order against a false "full").
  const isFull =
    totalCents > 0 && toCents(amount + args.priorRefunded) >= totalCents;
  return { amount, isFull };
}
