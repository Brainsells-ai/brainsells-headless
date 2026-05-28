/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

// lib/shopify.ts reads NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN (the public
// delegate token). Local .env.local on Merlin's machine ships with that key
// empty and only SHOPIFY_STOREFRONT_PRIVATE_TOKEN populated — Shopify's
// Storefront API accepts either via the same X-Shopify-Storefront-Access-Token
// header, so we tunnel the private token through when the public is empty.
// Script-local shim so the Vercel deploy (which has the public token) stays
// unaffected.
if (
  !process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN &&
  process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN
) {
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN =
    process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN;
}

import { createCart } from '../lib/shopify-cart';

// Mints a real Shopify-hosted checkout URL for a single variant via the
// Storefront Cart API. Open the URL in a browser, finish the checkout, and
// Shopify fires the genuine ORDERS_CREATE webhook downstream.
//
// Why this path (Merlin decision, 2026-05-28):
//   - Admin-side draftOrderCreate + draftOrderComplete is NOT a real customer
//     journey. It bypasses the storefront checkout and there is no guarantee
//     it triggers ORDERS_CREATE the same way a paid checkout does.
//   - The dbg-x7k2p test product is priced at 0,50 € specifically so a
//     real-money round trip costs almost nothing.
//   - This script uses the Storefront token, not Admin — no write_draft_orders
//     scope needed; read_products + the existing Storefront access are enough.
//
// Usage:
//   pnpm tsx scripts/debug-checkout-url.ts
//   pnpm tsx scripts/debug-checkout-url.ts --variant <gid>          # override
//   pnpm tsx scripts/debug-checkout-url.ts --variant <gid> --qty 2  # qty
//
// Default variant is the dbg-x7k2p test product variant.

const DEFAULT_VARIANT_GID = 'gid://shopify/ProductVariant/55876683989332';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main(): Promise<void> {
  const variantId = argValue('--variant') ?? DEFAULT_VARIANT_GID;
  const qty = Number(argValue('--qty') ?? '1');
  if (!Number.isFinite(qty) || qty < 1) {
    throw new Error(`--qty must be a positive integer, got "${qty}"`);
  }

  console.log(`Creating cart…`);
  console.log(`  variant: ${variantId}`);
  console.log(`  qty:     ${qty}\n`);

  const cart = await createCart(variantId, qty);

  console.log(`✓ Cart minted: ${cart.id}`);
  console.log(
    `  ${cart.totalQuantity} × line — subtotal ${cart.subtotal.amount} ${cart.subtotal.currencyCode}\n`,
  );
  console.log(`Checkout URL:`);
  console.log(cart.checkoutUrl);
  console.log(
    `\nOpen the URL in a browser to complete the real Shopify-hosted checkout.`,
  );
  console.log(
    `Completing the payment fires ORDERS_CREATE → /api/webhooks/order-created → Klaviyo.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
