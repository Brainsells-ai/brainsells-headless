import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  sha256Hex,
  hashEmail,
  buildUserDataBundle,
  packUserData,
  unpackUserData,
  resolveConsentedUserData,
} from './user-data';

// Independently-known vectors (computed via node crypto, canonical values):
//   sha256("")                 = e3b0c442…b855   (universal empty-string digest)
//   sha256("test@example.com") = 973dfe46…813b
const SHA256_EMPTY =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const SHA256_TEST_EMAIL =
  '973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b';

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  Test@Example.COM  ')).toBe('test@example.com');
  });
  it('does not strip dots or plus-addressing (platforms hash as-entered)', () => {
    expect(normalizeEmail('John.Doe+silbe@Gmail.com')).toBe('john.doe+silbe@gmail.com');
  });
});

describe('sha256Hex', () => {
  it('matches the canonical empty-string digest', () => {
    expect(sha256Hex('')).toBe(SHA256_EMPTY);
  });
  it('matches the known test@example.com vector', () => {
    expect(sha256Hex('test@example.com')).toBe(SHA256_TEST_EMAIL);
  });
});

describe('hashEmail', () => {
  it('hashes the NORMALIZED address (case/whitespace-insensitive)', () => {
    expect(hashEmail('  Test@Example.com ')).toBe(SHA256_TEST_EMAIL);
    expect(hashEmail('test@example.com')).toBe(SHA256_TEST_EMAIL);
  });
  it('returns null for absent email', () => {
    expect(hashEmail(null)).toBeNull();
    expect(hashEmail(undefined)).toBeNull();
    expect(hashEmail('')).toBeNull();
    expect(hashEmail('   ')).toBeNull();
  });
  it('returns null for a non-address (no @) rather than hashing garbage', () => {
    expect(hashEmail('notanemail')).toBeNull();
  });
});

describe('buildUserDataBundle', () => {
  it('email-only: emits em, omits ip/ua (Stufe-2 pre-wiring state)', () => {
    const b = buildUserDataBundle({ email: 'test@example.com' });
    expect(b).toEqual({ em: SHA256_TEST_EMAIL });
    expect(b.ip).toBeUndefined();
    expect(b.ua).toBeUndefined();
  });
  it('includes ip/ua verbatim when provided (post-0a wiring)', () => {
    const b = buildUserDataBundle({
      email: 'test@example.com',
      ip: '2001:4bc9:b06c:7dc9:3cc8:4a17:70d0:d645', // IPv6 customer IP
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/149.0',
    });
    expect(b.em).toBe(SHA256_TEST_EMAIL);
    expect(b.ip).toBe('2001:4bc9:b06c:7dc9:3cc8:4a17:70d0:d645');
    expect(b.ua).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/149.0');
  });
  it('omits fields whose input is empty/absent', () => {
    expect(buildUserDataBundle({ email: null, ip: '', userAgent: undefined })).toEqual({});
  });
});

describe('packUserData / unpackUserData', () => {
  it('empty bundle packs to null (attach nothing)', () => {
    expect(packUserData({})).toBeNull();
    expect(packUserData(buildUserDataBundle({ email: null }))).toBeNull();
  });
  it('round-trips a bundle through base64url', () => {
    const bundle = buildUserDataBundle({
      email: 'test@example.com',
      ip: '203.0.113.7',
      userAgent: 'UA/1.0',
    });
    const packed = packUserData(bundle);
    expect(packed).toBeTypeOf('string');
    // url-safe: no +, /, or = padding that would need query-string encoding
    expect(packed!).not.toMatch(/[+/=]/);
    expect(unpackUserData(packed!)).toEqual(bundle);
  });
});

describe('resolveConsentedUserData — server-side hard consent gate', () => {
  const IPV6 = '2001:4bc9:b06c:7dc9:3cc8:4a17:70d0:d645';
  const full = { email: 'Test@Example.com', ip: IPV6, userAgent: 'Mozilla/5.0' };

  it('granted → packed bundle with em (hashed) + ip (IPv6 verbatim) + ua', () => {
    const packed = resolveConsentedUserData({ marketingConsent: 'granted', ...full });
    expect(packed).toBeTypeOf('string');
    expect(unpackUserData(packed!)).toEqual({
      em: SHA256_TEST_EMAIL, // normalized before hashing
      ip: IPV6,
      ua: 'Mozilla/5.0',
    });
  });

  it('denied → null (no user_data leaves the server)', () => {
    expect(resolveConsentedUserData({ marketingConsent: 'denied', ...full })).toBeNull();
  });

  it('unknown / absent consent → null (fail closed)', () => {
    expect(resolveConsentedUserData({ marketingConsent: null, ...full })).toBeNull();
    expect(resolveConsentedUserData({ marketingConsent: undefined, ...full })).toBeNull();
    expect(resolveConsentedUserData({ marketingConsent: '', ...full })).toBeNull();
  });

  it('granted but no email → em omitted, ip/ua still sent', () => {
    const packed = resolveConsentedUserData({ marketingConsent: 'granted', ip: IPV6, userAgent: 'UA' });
    expect(unpackUserData(packed!)).toEqual({ ip: IPV6, ua: 'UA' });
  });

  it('granted but nothing identifiable → null (empty bundle packs to null)', () => {
    expect(
      resolveConsentedUserData({ marketingConsent: 'granted', email: null, ip: null, userAgent: null }),
    ).toBeNull();
  });
});
