// Locale-pinned money formatter for cart surfaces. Mirrors the helper in
// Hero.tsx but lives here so the cart components don't reach across the
// PDP boundary. Refactor Hero.tsx onto this helper in a follow-up polish
// pass (out of Phase-4 scope by design — atomic delivery).

import type { Money } from '@/lib/shopify-cart';

export function formatPrice(money: Money): string {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}
