import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyShopifyWebhookHmac } from './shopify-webhook-hmac';

// Phase-9 Sprint-B — acceptance gate per Sprint-B spec ("HMAC-Verify-Test
// gültig + 401-Pfad"). Covers the happy path, the wrong-signature 401 path,
// tampered body, and three classes of fail-closed inputs (missing header,
// missing secret, malformed-length header).

const SECRET = 'test-secret-with-enough-entropy-for-hmac';
const BODY = '{"id":12345,"name":"#1001","line_items":[]}';

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body, 'utf8').digest('base64');
}

describe('verifyShopifyWebhookHmac', () => {
  it('returns true for a valid signature', () => {
    const sig = sign(BODY, SECRET);
    expect(verifyShopifyWebhookHmac(BODY, sig, SECRET)).toBe(true);
  });

  it('returns false for a wrong-key signature (401 path)', () => {
    const sigFromOtherSecret = sign(BODY, 'different-secret-also-with-good-len');
    expect(verifyShopifyWebhookHmac(BODY, sigFromOtherSecret, SECRET)).toBe(false);
  });

  it('returns false when the body was tampered with', () => {
    const sig = sign(BODY, SECRET);
    expect(verifyShopifyWebhookHmac(`${BODY}x`, sig, SECRET)).toBe(false);
  });

  it('returns false when the header is missing (fail-closed)', () => {
    expect(verifyShopifyWebhookHmac(BODY, null, SECRET)).toBe(false);
  });

  it('returns false when the secret is missing (fail-closed)', () => {
    const sig = sign(BODY, SECRET);
    expect(verifyShopifyWebhookHmac(BODY, sig, null)).toBe(false);
    expect(verifyShopifyWebhookHmac(BODY, sig, undefined)).toBe(false);
    expect(verifyShopifyWebhookHmac(BODY, sig, '')).toBe(false);
  });

  it('returns false on length-mismatched header without crashing', () => {
    // timingSafeEqual throws on unequal Buffer lengths — the length-check
    // guard must short-circuit before that.
    expect(verifyShopifyWebhookHmac(BODY, 'too-short', SECRET)).toBe(false);
    expect(verifyShopifyWebhookHmac(BODY, 'a'.repeat(100), SECRET)).toBe(false);
  });
});
