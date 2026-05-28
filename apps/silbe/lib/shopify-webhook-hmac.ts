// Verifies a Shopify webhook HMAC against the raw request body.
//
// `secret` is the value Shopify signs callbacks with. For webhooks registered
// programmatically via the Admin API (Phase-9 Sprint-B), that is the App
// Client-Secret (SHOPIFY_CLIENT_SECRET). Manually-registered webhooks use a
// different per-store secret — out of scope here.
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
