/* eslint-disable */
// SILBE purchase Web Pixel — Shopify Customer Events (Custom Pixel).
//
// THIS IS A TEMPLATE / REFERENCE COPY of the pixel that lives in the Shopify
// Admin (Settings → Customer events → Custom pixels). It is NOT imported or
// bundled by the Next.js app — it runs in Shopify's Web Pixel sandbox
// (`analytics.subscribe`, `browser.cookie`). Committed so the repo documents
// the deployed pixel.
//
// SECRET: GA4_API_SECRET is a PLACEHOLDER here — set the real value only in the
// Shopify Admin pixel, never in git.
//
// Stufe-1 cutover (Weg A): `purchase` goes to GA4 via the Stape server container
// (gtag /g/collect) so the server-side GA4/Meta/TikTok/Pinterest tags fan out
// from a single hit. PURCHASE_TARGET flips instantly back to the proven
// direct-MP path. The gtag /g/collect wire-format was verified in Stufe 0
// (GA4-Server tag green in DebugView: value/currency/transaction_id/ga_session_id).
//
// Template per shop: just the constants below + DEBUG.

const GA4_MEASUREMENT_ID = "G-Z06HHP6EFM";
const GA4_API_SECRET = "<set in Shopify Admin — do NOT commit>"; // only used by the ga4direct fallback
const DEBUG = false; // VERIFICATION: true → _dbg=1 (DebugView) + body log. Set false after a green test!

// Weg A: route purchase through the Stape server container (gtag /g/collect).
const PURCHASE_TARGET = "stape"; // "stape" | "ga4direct" (instant rollback to the proven MP path)
const STAPE_SERVER_BASE = "https://ctsqyrwh.eus.stape.net";
const GTAG_GTM_FINGERPRINT = "45je"; // from the green Stufe-0 hit (gtm=)

// ga4direct fallback only: MP straight to GA4. DEBUG → /debug/mp/collect (which
// only VALIDATES, does not record) — kept as-is from the proven source.
const MP_ENDPOINT = DEBUG
  ? "https://www.google-analytics.com/debug/mp/collect"
  : "https://www.google-analytics.com/mp/collect";

const GA4_SESSION_COOKIE = "_ga_" + GA4_MEASUREMENT_ID.replace("G-", "");

function fallbackClientId() {
  return Math.floor(Math.random() * 1e10) + "." + Math.floor(Date.now() / 1000);
}

// Strips null/undefined keys — GA4 MP accepts missing keys but NOT null values.
function clean(obj) {
  const out = {};
  for (const k in obj) {
    if (obj[k] !== null && obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

// GA4 items → gtag pr<N> segments: id_<id>~nm<name>~pr<price>~qt<qty>[~va<variant>].
// The structural `~` stay LITERAL — encodeURIComponent leaves `~` untouched, so
// only the dynamic values get encoded. Do NOT use URLSearchParams (it would
// percent-encode `~` to %7E and break gtag's product parsing).
function gtagProducts(items) {
  return items.map((it, i) => {
    let seg =
      "id_" + encodeURIComponent(it.item_id != null ? it.item_id : "") +
      "~nm" + encodeURIComponent(it.item_name != null ? it.item_name : "");
    if (it.price != null) seg += "~pr" + it.price;
    if (it.quantity != null) seg += "~qt" + it.quantity;
    // Caveat 1: ~va (item_variant) is the GA4 gtag convention but was NOT
    // present in the Stufe-0 hit → verify in DebugView on the first cutover test.
    if (it.item_variant != null) seg += "~va" + encodeURIComponent(it.item_variant);
    return "pr" + (i + 1) + "=" + seg;
  });
}

// Builds the /g/collect URL in the exact verified Stufe-0 wire format (manual
// query string, no body, no api_secret).
function buildStapeGtagUrl(p) {
  const q = [
    "v=2",
    "tid=" + GA4_MEASUREMENT_ID,
    "gtm=" + GTAG_GTM_FINGERPRINT,
    "_p=1",
    "cid=" + encodeURIComponent(p.clientId),
    "sid=" + encodeURIComponent(p.sessionId),
    "sct=1",
    "seg=1",
    "en=purchase",
    "_et=100",
  ];
  if (p.transactionId != null) q.push("ep.transaction_id=" + encodeURIComponent(p.transactionId));
  if (p.value != null) q.push("epn.value=" + p.value); // numeric — epn. (not ep.)
  if (p.currency != null) q.push("ep.currency=" + encodeURIComponent(p.currency));
  for (const pr of gtagProducts(p.items)) q.push(pr);
  if (DEBUG) q.push("_dbg=1"); // DebugView ONLY — drop in prod or it won't hit Realtime/reports
  return STAPE_SERVER_BASE + "/g/collect?" + q.join("&");
}

analytics.subscribe("checkout_completed", async (event) => {
  console.log("PURCHASE PIXEL: callback fired");
  const checkout = event.data.checkout;
  if (!checkout) { console.log("PURCHASE PIXEL: no checkout"); return; }

  // Derive the session cookie name LOCALLY (works around the GA4_SESSION_COOKIE scope bug).
  const sessionCookieName = "_ga_" + GA4_MEASUREMENT_ID.replace("G-", "");

  // --- client_id + session_id from the real GA cookies (stitching) ---
  let clientId, sessionId;
  try {
    const ga = await browser.cookie.get("_ga"); // GA1.1.<cid1>.<cid2>
    const gaSession = await browser.cookie.get(sessionCookieName); // GS1.1.<sid>.<...>
    if (ga) clientId = ga.split(".").slice(-2).join(".");
    if (gaSession) sessionId = gaSession.split(".")[2];
    console.log("PURCHASE PIXEL: cookies", { ga, gaSession, clientId, sessionId });
  } catch (e) {
    console.log("PURCHASE PIXEL: cookie read failed", e);
  }
  clientId = clientId || fallbackClientId();
  sessionId = sessionId || String(Math.floor(Date.now() / 1000));

  const orderId = String(checkout.order?.id || checkout.token);
  const items = (checkout.lineItems || []).map((li) => clean({
    item_id: String(li.variant?.product?.id || li.id),
    item_name: li.title,
    item_variant: li.variant?.title,
    price: li.variant?.price?.amount,
    quantity: li.quantity,
  }));

  const value = checkout.totalPrice?.amount;
  const currency = checkout.totalPrice?.currencyCode;

  if (PURCHASE_TARGET === "stape") {
    // Weg A: gtag /g/collect to Stape → GA4 server client fans out to the server
    // tags. No body, no api_secret. transaction_id stays = numeric order id so the
    // refund webhook joins purchase↔refund (Caveat 4 — verify in DebugView).
    const url = buildStapeGtagUrl({ clientId, sessionId, transactionId: orderId, value, currency, items });
    console.log("PURCHASE PIXEL: about to POST (stape)", url);
    fetch(url, { method: "POST", keepalive: true })
      .then((r) => console.log("PURCHASE SENT (stape)", r.status, orderId))
      .catch((e) => console.log("PURCHASE FETCH ERROR (stape)", e));
    return;
  }

  // Rollback (ga4direct): MP-JSON straight to GA4 — unchanged from the proven source.
  const params = clean({
    transaction_id: orderId,
    value: value,
    currency: currency,
    session_id: sessionId,
    engagement_time_msec: 100,
    items: items,
  });
  if (DEBUG) params.debug_mode = 1;
  const payload = { client_id: clientId, events: [{ name: "purchase", params }] };
  const url = `${MP_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;
  console.log("PURCHASE PIXEL: about to fetch (ga4direct)", url, payload);
  fetch(url, { method: "POST", body: JSON.stringify(payload), keepalive: true })
    .then(async (r) => console.log("PURCHASE SENT (ga4direct)", r.status, orderId, DEBUG ? await r.text() : ""))
    .catch((e) => console.log("PURCHASE FETCH ERROR (ga4direct)", e));
});
