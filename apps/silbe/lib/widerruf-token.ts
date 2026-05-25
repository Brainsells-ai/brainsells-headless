// HMAC-signed widerruf tokens for the § 356a BGB elektronische Widerrufsfunktion.
//
// Wire format (URL-safe, single segment in the magic-link query string):
//   ${b64url(orderId)}.${b64url(email)}.${expiresAt}.${sigHex}
//
// HMAC signs the canonical "${b64orderId}.${b64email}.${expiresAt}" string
// (everything before the trailing sig). Segment-base64url instead of pipe-
// delimited so RFC-edge-case characters in emails (e.g. "a|b@x.de") can't
// shift the parse. expiresAt is unsigned-decimal seconds-since-epoch and
// safe to leave unencoded.
//
// Requires Node runtime — uses node:crypto. Pinned via runtime='nodejs' on
// the calling page segments (/widerruf, /widerruf/bestaetigen, /widerruf/
// erfolg). Server actions and this lib inherit the runtime from the caller.

import { createHmac, timingSafeEqual } from 'node:crypto';

export type WiderrufTokenPayload = {
  /** Shopify Order GID, e.g. "gid://shopify/Order/1234567890". */
  orderId: string;
  /** Customer email, lowercase, trimmed. */
  email: string;
  /** Unix seconds. Server validates before trusting the payload. */
  expiresAt: number;
};

function b64urlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function b64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function readSecret(): string {
  const secret = process.env.WIDERRUF_TOKEN_SECRET;
  if (!secret) throw new Error('WIDERRUF_TOKEN_SECRET is not set');
  if (secret.length < 32) {
    throw new Error('WIDERRUF_TOKEN_SECRET must be at least 32 chars (hex-encoded 16+ bytes)');
  }
  return secret;
}

export function signWiderrufToken(payload: WiderrufTokenPayload): string {
  const secret = readSecret();
  const canonical = `${b64urlEncode(payload.orderId)}.${b64urlEncode(payload.email)}.${payload.expiresAt}`;
  const sig = createHmac('sha256', secret).update(canonical).digest('hex');
  return `${canonical}.${sig}`;
}

/**
 * Verifies a token and returns its payload if valid, else null.
 *
 * Returns null indistinguishably for: malformed format, bad signature,
 * expired, secret missing. No oracle — caller surfaces a single generic
 * error message ("ungültig oder abgelaufen") to the user.
 */
export function verifyWiderrufToken(token: string): WiderrufTokenPayload | null {
  if (!process.env.WIDERRUF_TOKEN_SECRET) return null; // fail-closed
  if (typeof token !== 'string' || token.length === 0) return null;

  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [b64OrderId, b64Email, expiresAtStr, providedSig] = parts;
  if (!b64OrderId || !b64Email || !expiresAtStr || !providedSig) return null;

  // Hex-only check for sig — prevents Buffer.from('!!','hex') silently zero-padding.
  if (!/^[0-9a-f]+$/i.test(providedSig)) return null;

  const expiresAt = Number.parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
  if (Math.floor(Date.now() / 1000) > expiresAt) return null;

  const canonical = `${b64OrderId}.${b64Email}.${expiresAt}`;
  const expectedSig = createHmac('sha256', readSecret()).update(canonical).digest('hex');

  const expectedBuf = Buffer.from(expectedSig, 'hex');
  const providedBuf = Buffer.from(providedSig, 'hex');
  if (expectedBuf.length !== providedBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, providedBuf)) return null;

  let orderId: string;
  let email: string;
  try {
    orderId = b64urlDecode(b64OrderId);
    email = b64urlDecode(b64Email);
  } catch {
    return null;
  }
  if (!orderId || !email) return null;

  return { orderId, email, expiresAt };
}
