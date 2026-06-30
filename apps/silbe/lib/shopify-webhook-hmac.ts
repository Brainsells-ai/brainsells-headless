// Verifies a Shopify webhook HMAC against the raw request body.
//
// Secret note: we ASSUMED Shopify signs Admin-API-registered webhooks with the
// App Client-Secret (SHOPIFY_CLIENT_SECRET). 2026-06: every REAL delivery 401'd
// while local-signed synthetic POSTs passed → Shopify signs with a DIFFERENT
// secret than the client_credentials client secret. SHOPIFY_WEBHOOK_SECRET now
// overrides it (falling back to SHOPIFY_CLIENT_SECRET so this stays non-breaking
// until the right value is set). See memory: shopify-webhook-hmac-secret-mismatch.
//
// Constant-time comparison via timingSafeEqual; length-checked first so a
// malformed header can't crash the comparison. Returns false for any missing
// input (fail-closed).

import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyShopifyWebhookHmac(
  rawBody: string,
  sigHeader: string | null,
  secret: string | null | undefined,
): boolean {
  if (!sigHeader) return false;
  if (!secret) return false;

  const expected = createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(sigHeader, 'utf8');

  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

// The secret Shopify actually signs webhooks with. SHOPIFY_WEBHOOK_SECRET wins;
// falls back to SHOPIFY_CLIENT_SECRET (the pre-2026-06 assumption) when unset.
export function resolveWebhookSecret(): string | null {
  return process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_CLIENT_SECRET || null;
}

// Env vars tried as candidate secrets when SHOPIFY_HMAC_DEBUG=1 and a verify
// fails. We log each env NAME + whether its HMAC matched + a short prefix of the
// computed digest — NEVER the secret value, NEVER the request body.
const CANDIDATE_SECRET_ENVS = [
  'SHOPIFY_WEBHOOK_SECRET',
  'SHOPIFY_CLIENT_SECRET',
  'SHOPIFY_WEBHOOK_SECRET_OLD',
];

function logHmacCandidates(rawBody: string, sigHeader: string | null): void {
  const received = sigHeader ?? '';
  // bodyPrefix is the START of the order/refund JSON ({"id":…,"admin_graphql…)
  // — metadata only, no PII (email/address come later in the payload).
  console.error(
    `[hmac-debug] verify failed — bodyLen=${Buffer.byteLength(rawBody, 'utf8')} ` +
      `bodyPrefix=${JSON.stringify(rawBody.slice(0, 40))} ` +
      `receivedHmac=${received.slice(0, 12)}…`,
  );
  for (const name of CANDIDATE_SECRET_ENVS) {
    const val = process.env[name];
    if (!val) {
      console.error(`[hmac-debug]   ${name}: (unset)`);
      continue;
    }
    const computed = createHmac('sha256', val).update(rawBody, 'utf8').digest('base64');
    console.error(
      `[hmac-debug]   ${name}: match=${computed === received} computed=${computed.slice(0, 12)}…`,
    );
  }
}

// Central webhook verification for all SILBE webhook routes: resolves the secret,
// verifies, and (when SHOPIFY_HMAC_DEBUG=1) logs received-vs-computed HMAC for
// every candidate env so a SINGLE real delivery reveals which secret Shopify
// signs with — no multi-deploy guessing. Returns true iff the HMAC is valid.
export function verifyShopifyWebhook(rawBody: string, sigHeader: string | null): boolean {
  const secret = resolveWebhookSecret();
  if (!secret) {
    console.error(
      '[webhook-hmac] no webhook secret set (SHOPIFY_WEBHOOK_SECRET / SHOPIFY_CLIENT_SECRET) — refusing',
    );
    return false;
  }
  const ok = verifyShopifyWebhookHmac(rawBody, sigHeader, secret);
  if (!ok && process.env.SHOPIFY_HMAC_DEBUG === '1') {
    logHmacCandidates(rawBody, sigHeader);
  }
  return ok;
}
