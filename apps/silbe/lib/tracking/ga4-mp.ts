// GA4 Measurement Protocol sender — server-side event delivery (no browser,
// no gtag). Used by the refunds/create webhook to post a `refund` event GA4
// can join to the original purchase via transaction_id.
//
// Secrets: GA4_MEASUREMENT_ID and GA4_API_SECRET come from the environment and
// are NEVER logged. The api_secret is a query parameter on the collect URL, so
// callers must log status codes only — never the URL.
//
// Endpoints:
//   prod   https://www.google-analytics.com/mp/collect        → 204, no body
//   debug  https://www.google-analytics.com/debug/mp/collect  → 200 + JSON
//          { validationMessages: [...] }  (empty array = payload is valid)
// Validate against the debug endpoint BEFORE pointing anything at prod — the
// prod endpoint accepts and silently drops malformed payloads.

const MP_PROD_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const MP_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

export type Ga4MpEvent = {
  name: string;
  params: Record<string, string | number | boolean>;
};

export type Ga4MpValidationMessage = {
  fieldPath?: string;
  description?: string;
  validationCode?: string;
};

export type Ga4MpResult = {
  ok: boolean;
  status: number;
  // Populated only when debug=true.
  validationMessages?: Ga4MpValidationMessage[];
};

export async function sendGa4MeasurementProtocol(args: {
  clientId: string;
  events: Ga4MpEvent[];
  debug?: boolean;
}): Promise<Ga4MpResult> {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId) throw new Error('GA4_MEASUREMENT_ID is not set');
  if (!apiSecret) throw new Error('GA4_API_SECRET is not set');

  const endpoint = args.debug ? MP_DEBUG_ENDPOINT : MP_PROD_ENDPOINT;
  const url =
    `${endpoint}?measurement_id=${encodeURIComponent(measurementId)}` +
    `&api_secret=${encodeURIComponent(apiSecret)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: args.clientId, events: args.events }),
    cache: 'no-store',
  });

  if (args.debug) {
    const json = (await response.json().catch(() => ({}))) as {
      validationMessages?: Ga4MpValidationMessage[];
    };
    return {
      ok: response.ok,
      status: response.status,
      validationMessages: json.validationMessages ?? [],
    };
  }

  return { ok: response.ok, status: response.status };
}
