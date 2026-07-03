// CAPI user_data helper — hashes/packs the customer identifiers that the
// Meta / TikTok / Pinterest server tags need for conversion matching. Used
// ONLY by the server-side purchase path (orders/paid webhook → Stape); the
// packed value rides the gtag hit as a single `bs_ud` param and is stripped
// from the GA4 tag Stape-side so PII never reaches GA4 (see design Stufe 2).
//
// Hashing happens HERE (Vercel function), never Stape-side: raw email must not
// travel over the wire. Email → SHA-256 of the normalized (lowercase+trim)
// address, per the identical normalization Meta/TikTok/Pinterest apply before
// matching. ip + user_agent are sent PLAINTEXT — all three platforms require
// client_ip_address / client_user_agent UNHASHED (IPv4 or IPv6).
//
// Node runtime only (node:crypto). Contains no secrets.

import { createHash } from 'node:crypto';

// Lowercase + trim — the normalization all three CAPIs expect before hashing.
// (No dot-stripping / plus-addressing removal: platforms hash the address
// as-entered post-lowercase/trim; over-normalizing would MISS matches.)
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

// Returns the SHA-256 hex of the normalized email, or null when there is no
// usable email (absent / empty / not an address). Null → em is simply omitted
// from the bundle; callers never send an empty or garbage hash.
export function hashEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const normalized = normalizeEmail(email);
  if (normalized === '' || !normalized.includes('@')) return null;
  return sha256Hex(normalized);
}

// The CAPI user_data bundle. em = SHA-256 hex; ip / ua = plaintext. Every field
// optional so a consent-gated caller can attach as much or as little as it has.
export type UserDataBundle = {
  em?: string; // sha256 hex of normalized email
  ip?: string; // client IP, plaintext (IPv4 or IPv6)
  ua?: string; // client user-agent, plaintext
};

// Build the bundle from raw inputs. em is hashed; ip/ua pass through verbatim.
// Fields whose input is missing/empty are omitted (never present-but-empty).
// NOTE: ip/ua are accepted here but the orders/paid wiring passes them only
// after the Schritt-0a IP decision — until then callers may omit them and the
// bundle is email-only.
export function buildUserDataBundle(args: {
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): UserDataBundle {
  const bundle: UserDataBundle = {};
  const em = hashEmail(args.email);
  if (em) bundle.em = em;
  if (args.ip) bundle.ip = args.ip;
  if (args.userAgent) bundle.ua = args.userAgent;
  return bundle;
}

// base64url(JSON) — the single `bs_ud` gtag param value. url-safe + unpadded so
// it needs no percent-encoding in the query string. An EMPTY bundle → null: the
// caller then attaches nothing, keeping the hit clean and the GA4 firewall a
// no-op when there is no (consented) user_data to send.
export function packUserData(bundle: UserDataBundle): string | null {
  if (Object.keys(bundle).length === 0) return null;
  return Buffer.from(JSON.stringify(bundle), 'utf8').toString('base64url');
}

// Inverse of packUserData — the Stape-side sGTM variable performs the equivalent
// decode. Kept here so the format has one authoritative definition and the
// round-trip is unit-tested.
export function unpackUserData(packed: string): UserDataBundle {
  return JSON.parse(Buffer.from(packed, 'base64url').toString('utf8')) as UserDataBundle;
}

// The HARD server-side consent gate + build + pack in one testable unit. Returns
// the packed bs_ud value ONLY when the order carries explicit marketing consent
// ('granted', captured onto the order at begin_checkout in PR A); every other
// value ('denied' / unknown / absent → null) yields null and NO user_data leaves
// the server. `marketingConsent` is the raw _marketing_consent order attribute.
export function resolveConsentedUserData(args: {
  marketingConsent: string | null | undefined;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): string | null {
  if (args.marketingConsent !== 'granted') return null;
  return packUserData(
    buildUserDataBundle({ email: args.email, ip: args.ip, userAgent: args.userAgent }),
  );
}
