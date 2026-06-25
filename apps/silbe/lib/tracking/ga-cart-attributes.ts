// Cart-attribute keys that ferry the GA4 client_id / session_id from the
// storefront (browser capture at begin_checkout) onto the Shopify order's
// customAttributes (server-side read in the refunds/create webhook).
//
// Why a separate, browser-free module: the client capture (ga-identifiers.ts)
// pulls window-only Customer-Privacy code, while the refund route reads these
// keys server-side. Sharing the constants from here keeps the two sides
// byte-identical without dragging browser imports across the server boundary.
//
// Shopify carries cart `attributes` through to the order as customAttributes
// (REST: note_attributes) automatically — no extra wiring needed.

export const GA_CLIENT_ID_ATTR = '_ga_client_id';
export const GA_SESSION_ID_ATTR = '_ga_session_id';
