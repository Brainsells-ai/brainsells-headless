// Verifies a Shopify webhook HMAC against the raw request body.
//
// Secret note: we ASSUMED Shopify signs Admin-API-registered webhooks with the
// App Client-Secret used by client_credentials. 2026-06: it actually signs with
// a DIFFERENT secret (the "Old" client secret), while the OAuth/mint can use
// either. So verify tries MULTIPLE candidates and accepts a match against ANY —
// rotation-safe: during a rotation both Old and New pass. SHOPIFY_WEBHOOK_SECRET
// is the real signing secret; SHOPIFY_WEBHOOK_SECRET_OLD and SHOPIFY_CLIENT_SECRET
// are also tried. See memory: shopify-webhook-hmac-secret-mismatch.
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

// Env vars tried as candidate webhook signing secrets, in precedence order.
// verify accepts a match against ANY (rotation-safe); the SHOPIFY_HMAC_DEBUG
// diagnostic logs each by NAME.
const CANDIDATE_SECRET_ENVS = [
  'SHOPIFY_WEBHOOK_SECRET',
  'SHOPIFY_WEBHOOK_SECRET_OLD',
  'SHOPIFY_CLIENT_SECRET',
];

// Resolved candidate secrets (values from env; deduped; unset skipped).
export function webhookSecretCandidates(): { name: string; value: string }[] {
  const seen = new Set<string>();
  const out: { name: string; value: string }[] = [];
  for (const name of CANDIDATE_SECRET_ENVS) {
    const value = process.env[name];
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push({ name, value });
    }
  }
  return out;
}

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

// Central webhook verification for all SILBE webhook routes: accepts the HMAC if
// ANY candidate secret matches (rotation-safe). When SHOPIFY_HMAC_DEBUG=1 and no
// candidate matches, logs received-vs-computed HMAC per candidate env (no secret,
// no PII) so a SINGLE real delivery reveals which secret Shopify signs with.
export function verifyShopifyWebhook(rawBody: string, sigHeader: string | null): boolean {
  const candidates = webhookSecretCandidates();
  if (candidates.length === 0) {
    console.error(
      '[webhook-hmac] no webhook secret set (SHOPIFY_WEBHOOK_SECRET / SHOPIFY_CLIENT_SECRET) — refusing',
    );
    return false;
  }
  for (const c of candidates) {
    if (verifyShopifyWebhookHmac(rawBody, sigHeader, c.value)) return true;
  }
  if (process.env.SHOPIFY_HMAC_DEBUG === '1') logHmacCandidates(rawBody, sigHeader);
  return false;
}
