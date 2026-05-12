// Shopify Storefront Cart API — write layer. Mirrors the read-side
// architecture of shopify-queries.ts: GraphQL fragment/operation strings
// declared once, parser converts raw shapes into our public types.
//
// All cart operations run client-side (Zustand store invokes them). They
// pass `cache: 'no-store'` to bypass Next's ISR cache on the shopifyFetch
// helper — cart state is per-user and must never be cached.
//
// Shopify returns 200 OK with `userErrors[]` populated on cart-level
// errors (out-of-stock variant, invalid quantity, expired cart). We
// surface those as a typed CartUserError so the store / UI can show a
// targeted message instead of a generic network error.

import { shopifyFetch } from './shopify';

// ─── Public Types ──────────────────────────────────────────────────────────

export type Money = { amount: string; currencyCode: string };

export type CartLine = {
  id: string;
  quantity: number;
  variantId: string;
  variantTitle: string;
  selectedOptions: { name: string; value: string }[];
  availableForSale: boolean;
  unitPrice: Money;
  linePrice: Money;
  productHandle: string;
  productTitle: string;
  image: { url: string; altText: string | null; width: number; height: number } | null;
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  subtotal: Money;
  total: Money;
  totalTax: Money | null;
  lines: CartLine[];
};

export class CartUserError extends Error {
  readonly errors: { field: string[] | null; message: string; code: string | null }[];
  constructor(errors: { field: string[] | null; message: string; code: string | null }[]) {
    super(errors.map((e) => e.message).join('; ') || 'Cart user error');
    this.name = 'CartUserError';
    this.errors = errors;
  }
}

// ─── Raw Shopify Response Shapes ───────────────────────────────────────────

type RawImage = { url: string; altText: string | null; width: number; height: number };

type RawCartLine = {
  id: string;
  quantity: number;
  cost: {
    totalAmount: Money;
    amountPerQuantity: Money;
  };
  merchandise: {
    id: string;
    title: string;
    availableForSale: boolean;
    price: Money;
    selectedOptions: { name: string; value: string }[];
    image: RawImage | null;
    product: {
      handle: string;
      title: string;
      featuredImage: RawImage | null;
    };
  };
};

type RawCart = {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
  };
  lines: { nodes: RawCartLine[] };
};

type RawUserError = { field: string[] | null; message: string; code: string | null };

type CartMutationPayload = {
  cart: RawCart | null;
  userErrors: RawUserError[];
};

// ─── GraphQL Fragment + Operations ─────────────────────────────────────────

const CART_FRAGMENT = /* GraphQL */ `
  fragment CartFragment on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      subtotalAmount { amount currencyCode }
      totalAmount    { amount currencyCode }
      totalTaxAmount { amount currencyCode }
    }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost {
          totalAmount       { amount currencyCode }
          amountPerQuantity { amount currencyCode }
        }
        merchandise {
          ... on ProductVariant {
            id
            title
            availableForSale
            price { amount currencyCode }
            selectedOptions { name value }
            image { url altText width height }
            product {
              handle
              title
              featuredImage { url altText width height }
            }
          }
        }
      }
    }
  }
`;

const CART_CREATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartCreate($lines: [CartLineInput!]) {
    cartCreate(input: { lines: $lines }) {
      cart { ...CartFragment }
      userErrors { field message code }
    }
  }
`;

const CART_LINES_ADD = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { ...CartFragment }
      userErrors { field message code }
    }
  }
`;

const CART_LINES_UPDATE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { ...CartFragment }
      userErrors { field message code }
    }
  }
`;

const CART_LINES_REMOVE = /* GraphQL */ `
  ${CART_FRAGMENT}
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { ...CartFragment }
      userErrors { field message code }
    }
  }
`;

const CART_QUERY = /* GraphQL */ `
  ${CART_FRAGMENT}
  query CartQuery($cartId: ID!) {
    cart(id: $cartId) { ...CartFragment }
  }
`;

// ─── Parsing Helpers ───────────────────────────────────────────────────────

function parseLine(raw: RawCartLine): CartLine {
  const variantImage = raw.merchandise.image ?? raw.merchandise.product.featuredImage;
  return {
    id: raw.id,
    quantity: raw.quantity,
    variantId: raw.merchandise.id,
    variantTitle: raw.merchandise.title,
    selectedOptions: raw.merchandise.selectedOptions,
    availableForSale: raw.merchandise.availableForSale,
    unitPrice: raw.cost.amountPerQuantity,
    linePrice: raw.cost.totalAmount,
    productHandle: raw.merchandise.product.handle,
    productTitle: raw.merchandise.product.title,
    image: variantImage,
  };
}

function parseCart(raw: RawCart): Cart {
  return {
    id: raw.id,
    checkoutUrl: raw.checkoutUrl,
    totalQuantity: raw.totalQuantity,
    subtotal: raw.cost.subtotalAmount,
    total: raw.cost.totalAmount,
    totalTax: raw.cost.totalTaxAmount,
    lines: raw.lines.nodes.map(parseLine),
  };
}

function unwrapMutation(payload: CartMutationPayload, opName: string): Cart {
  if (payload.userErrors.length > 0) {
    throw new CartUserError(payload.userErrors);
  }
  if (!payload.cart) {
    throw new Error(`Shopify ${opName} returned no cart and no userErrors`);
  }
  return parseCart(payload.cart);
}

// ─── Public Functions ──────────────────────────────────────────────────────

export async function createCart(variantId: string, quantity = 1): Promise<Cart> {
  const data = await shopifyFetch<{ cartCreate: CartMutationPayload }>(
    CART_CREATE,
    { lines: [{ merchandiseId: variantId, quantity }] },
    { cache: 'no-store' },
  );
  return unwrapMutation(data.cartCreate, 'cartCreate');
}

export async function addCartLines(
  cartId: string,
  variantId: string,
  quantity = 1,
): Promise<Cart> {
  const data = await shopifyFetch<{ cartLinesAdd: CartMutationPayload }>(
    CART_LINES_ADD,
    { cartId, lines: [{ merchandiseId: variantId, quantity }] },
    { cache: 'no-store' },
  );
  return unwrapMutation(data.cartLinesAdd, 'cartLinesAdd');
}

export async function updateCartLine(
  cartId: string,
  lineId: string,
  quantity: number,
): Promise<Cart> {
  const data = await shopifyFetch<{ cartLinesUpdate: CartMutationPayload }>(
    CART_LINES_UPDATE,
    { cartId, lines: [{ id: lineId, quantity }] },
    { cache: 'no-store' },
  );
  return unwrapMutation(data.cartLinesUpdate, 'cartLinesUpdate');
}

export async function removeCartLine(cartId: string, lineId: string): Promise<Cart> {
  const data = await shopifyFetch<{ cartLinesRemove: CartMutationPayload }>(
    CART_LINES_REMOVE,
    { cartId, lineIds: [lineId] },
    { cache: 'no-store' },
  );
  return unwrapMutation(data.cartLinesRemove, 'cartLinesRemove');
}

// Returns null when the cart no longer exists on Shopify (expired after
// 10 days inactivity, or invalid id). Caller is expected to drop the
// persisted cartId and treat the user as a fresh visitor.
export async function getCart(cartId: string): Promise<Cart | null> {
  const data = await shopifyFetch<{ cart: RawCart | null }>(
    CART_QUERY,
    { cartId },
    { cache: 'no-store' },
  );
  return data.cart ? parseCart(data.cart) : null;
}
