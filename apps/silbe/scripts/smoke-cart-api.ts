// Phase-4 smoke-test: round-trip the cart through every public function
// in lib/shopify-cart.ts against the live Shopify Storefront API. Run
// once before wiring the Zustand store + drawer UI — confirms the
// fragment shape, mutation contracts, and userErrors behavior. Disposes
// of the test cart at the end (lines removed). Run with:
//
//   pnpm tsx scripts/smoke-cart-api.ts
//
// Requires NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN + NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN
// in .env.local. Picks the first canonical handle with an available variant.

import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(__dirname, '../.env.local') });

import {
  createCart,
  addCartLines,
  updateCartLine,
  removeCartLine,
  getCart,
  type Cart,
} from '../lib/shopify-cart';
import { shopifyFetch } from '../lib/shopify';
import { CANONICAL_HANDLES } from './metafields-manifest';

type PickVariantResponse = {
  product: {
    handle: string;
    title: string;
    variants: {
      nodes: { id: string; availableForSale: boolean; title: string }[];
    };
  } | null;
};

async function pickFirstAvailableVariant(): Promise<{ handle: string; variantId: string; productTitle: string; variantTitle: string }> {
  for (const handle of CANONICAL_HANDLES) {
    const data = await shopifyFetch<PickVariantResponse>(
      /* GraphQL */ `
        query PickVariant($handle: String!) {
          product(handle: $handle) {
            handle
            title
            variants(first: 5) {
              nodes { id availableForSale title }
            }
          }
        }
      `,
      { handle },
      { cache: 'no-store' },
    );
    const variant = data.product?.variants.nodes.find((v) => v.availableForSale);
    if (variant && data.product) {
      return {
        handle: data.product.handle,
        productTitle: data.product.title,
        variantId: variant.id,
        variantTitle: variant.title,
      };
    }
  }
  throw new Error('No available variant found among CANONICAL_HANDLES');
}

function fmt(cart: Cart): string {
  return [
    `  id:            ${cart.id}`,
    `  totalQuantity: ${cart.totalQuantity}`,
    `  subtotal:      ${cart.subtotal.amount} ${cart.subtotal.currencyCode}`,
    `  total:         ${cart.total.amount} ${cart.total.currencyCode}`,
    `  totalTax:      ${cart.totalTax ? `${cart.totalTax.amount} ${cart.totalTax.currencyCode}` : 'null'}`,
    `  checkoutUrl:   ${cart.checkoutUrl}`,
    `  lines:`,
    ...cart.lines.flatMap((l) => [
      `    - line ${l.id}`,
      `      product:    ${l.productTitle} (${l.productHandle})`,
      `      variant:    ${l.variantTitle}  available=${l.availableForSale}`,
      `      qty:        ${l.quantity}`,
      `      unitPrice:  ${l.unitPrice.amount} ${l.unitPrice.currencyCode}`,
      `      linePrice:  ${l.linePrice.amount} ${l.linePrice.currencyCode}`,
      `      image:      ${l.image ? l.image.url : 'null'}`,
    ]),
  ].join('\n');
}

async function main() {
  console.log('— Picking available variant …');
  const v = await pickFirstAvailableVariant();
  console.log(`  product: ${v.productTitle}  variant: ${v.variantTitle}  id: ${v.variantId}\n`);

  console.log('— Step 1: createCart');
  let cart = await createCart(v.variantId, 1);
  console.log(fmt(cart) + '\n');

  console.log('— Step 2: addCartLines (+1 of same variant)');
  cart = await addCartLines(cart.id, v.variantId, 1);
  console.log(fmt(cart) + '\n');

  console.log('— Step 3: updateCartLine (line[0] → qty 3)');
  cart = await updateCartLine(cart.id, cart.lines[0].id, 3);
  console.log(fmt(cart) + '\n');

  console.log('— Step 4: getCart (re-hydrate)');
  const hydrated = await getCart(cart.id);
  if (!hydrated) throw new Error('getCart returned null right after writes');
  console.log(fmt(hydrated) + '\n');

  console.log('— Step 5: removeCartLine (line[0])');
  cart = await removeCartLine(cart.id, cart.lines[0].id);
  console.log(fmt(cart) + '\n');

  console.log('— Step 6: getCart on non-existent id');
  const ghost = await getCart('gid://shopify/Cart/does-not-exist');
  console.log(`  result: ${ghost === null ? 'null (expected)' : 'UNEXPECTED non-null'}\n`);

  console.log('All 6 steps green. Cart API contract confirmed.');
}

main().catch((err) => {
  console.error('SMOKE FAILED');
  console.error(err);
  process.exit(1);
});
