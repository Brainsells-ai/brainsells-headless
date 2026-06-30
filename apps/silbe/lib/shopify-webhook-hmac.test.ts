import { describe, it, expect, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyShopifyWebhookHmac, resolveWebhookSecret } from './shopify-webhook-hmac';

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

describe('resolveWebhookSecret', () => {
  const orig = {
    webhook: process.env.SHOPIFY_WEBHOOK_SECRET,
    client: process.env.SHOPIFY_CLIENT_SECRET,
  };
  const set = (k: string, v: string | undefined): void => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  };
  afterEach(() => {
    set('SHOPIFY_WEBHOOK_SECRET', orig.webhook);
    set('SHOPIFY_CLIENT_SECRET', orig.client);
  });

  it('prefers SHOPIFY_WEBHOOK_SECRET when set', () => {
    process.env.SHOPIFY_WEBHOOK_SECRET = 'webhook-secret';
    process.env.SHOPIFY_CLIENT_SECRET = 'client-secret';
    expect(resolveWebhookSecret()).toBe('webhook-secret');
  });

  it('falls back to SHOPIFY_CLIENT_SECRET when the webhook secret is unset', () => {
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    process.env.SHOPIFY_CLIENT_SECRET = 'client-secret';
    expect(resolveWebhookSecret()).toBe('client-secret');
  });

  it('returns null when neither is set', () => {
    delete process.env.SHOPIFY_WEBHOOK_SECRET;
    delete process.env.SHOPIFY_CLIENT_SECRET;
    expect(resolveWebhookSecret()).toBeNull();
  });
});
