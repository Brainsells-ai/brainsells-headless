import { describe, it, expect, afterEach } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  verifyShopifyWebhookHmac,
  verifyShopifyWebhook,
  webhookSecretCandidates,
} from './shopify-webhook-hmac';

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

const SECRET_KEYS = [
  'SHOPIFY_WEBHOOK_SECRET',
  'SHOPIFY_WEBHOOK_SECRET_OLD',
  'SHOPIFY_CLIENT_SECRET',
];
const setEnv = (k: string, v: string | undefined): void => {
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
};

describe('webhookSecretCandidates', () => {
  const orig = Object.fromEntries(SECRET_KEYS.map((k) => [k, process.env[k]]));
  afterEach(() => SECRET_KEYS.forEach((k) => setEnv(k, orig[k])));

  it('lists set secrets in precedence order (webhook, old, client)', () => {
    setEnv('SHOPIFY_WEBHOOK_SECRET', 'w');
    setEnv('SHOPIFY_WEBHOOK_SECRET_OLD', 'o');
    setEnv('SHOPIFY_CLIENT_SECRET', 'c');
    expect(webhookSecretCandidates()).toEqual([
      { name: 'SHOPIFY_WEBHOOK_SECRET', value: 'w' },
      { name: 'SHOPIFY_WEBHOOK_SECRET_OLD', value: 'o' },
      { name: 'SHOPIFY_CLIENT_SECRET', value: 'c' },
    ]);
  });

  it('skips unset entries and dedups equal values', () => {
    setEnv('SHOPIFY_WEBHOOK_SECRET', 'same');
    setEnv('SHOPIFY_WEBHOOK_SECRET_OLD', undefined);
    setEnv('SHOPIFY_CLIENT_SECRET', 'same');
    expect(webhookSecretCandidates()).toEqual([
      { name: 'SHOPIFY_WEBHOOK_SECRET', value: 'same' },
    ]);
  });

  it('is empty when none are set', () => {
    SECRET_KEYS.forEach((k) => setEnv(k, undefined));
    expect(webhookSecretCandidates()).toEqual([]);
  });
});

describe('verifyShopifyWebhook (rotation-safe)', () => {
  const orig = Object.fromEntries(SECRET_KEYS.map((k) => [k, process.env[k]]));
  afterEach(() => SECRET_KEYS.forEach((k) => setEnv(k, orig[k])));

  it('accepts a signature from ANY configured candidate (Old or New)', () => {
    setEnv('SHOPIFY_WEBHOOK_SECRET', 'new-secret-with-good-length');
    setEnv('SHOPIFY_WEBHOOK_SECRET_OLD', 'old-secret-with-good-length');
    setEnv('SHOPIFY_CLIENT_SECRET', undefined);
    expect(verifyShopifyWebhook(BODY, sign(BODY, 'new-secret-with-good-length'))).toBe(true);
    expect(verifyShopifyWebhook(BODY, sign(BODY, 'old-secret-with-good-length'))).toBe(true);
    expect(verifyShopifyWebhook(BODY, sign(BODY, 'a-secret-nobody-configured'))).toBe(false);
  });

  it('refuses when no candidate secret is set', () => {
    SECRET_KEYS.forEach((k) => setEnv(k, undefined));
    expect(verifyShopifyWebhook(BODY, sign(BODY, 'whatever-secret-value'))).toBe(false);
  });
});
