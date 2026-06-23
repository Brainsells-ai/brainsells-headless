// Web-GTM bootstrap + Google Consent Mode v2 plumbing.
//
// Two-stage tracking architecture (ADR 2026-06-03 tracking-stack, Schritt 2):
//
//   Next.js → dataLayer.push() → Web-GTM container → Stape sGTM → platforms
//
// This module owns ONLY the left half: the dataLayer primitive, the Consent
// Mode v2 default/update signals, and the consent-gated loader for the WEB
// container (NEXT_PUBLIC_GTM_ID). No platform pixels live in code — GA4 /
// Meta / TikTok / Pinterest are wired server-side in Stape (Schritt 3-4).
//
// Consent Mode contract:
//   - All four signals default to 'denied' BEFORE gtm.js can possibly load.
//   - Shopify Customer Privacy categories (Schritt 1) map onto the signals:
//       analytics → analytics_storage
//       marketing → ad_storage + ad_user_data + ad_personalization
//   - gtm.js is only injected once analytics OR marketing is granted; per-
//     platform gating below that line is Consent Mode's job inside GTM.

import type { ConsentCategories } from '@/lib/consent/types';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

// The WEB container id (GTM-…). NOT the Stape server container — that one
// never appears in this codebase; the web container forwards to it via its
// own server_container_url setting (Dashboard-Arbeit, Schritt 3).
export function getGtmId(): string | null {
  const id = process.env.NEXT_PUBLIC_GTM_ID;
  return id && id.trim().length > 0 ? id.trim() : null;
}

export function ensureDataLayer(): unknown[] | null {
  if (typeof window === 'undefined') return null;
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

// Consent Mode commands must arrive as an Arguments object — GTM's consent
// queue pattern-matches on it and ignores plain arrays. Hence a classic
// function using `arguments` instead of rest-spread.
function gtag(..._args: unknown[]): void {
  // _args exists only for the call signature; the push must forward the
  // Arguments object itself.
  void _args;
  const dl = ensureDataLayer();
  if (!dl) return;
  // eslint-disable-next-line prefer-rest-params
  dl.push(arguments);
}

type ConsentSignal = 'granted' | 'denied';

type ConsentModeSignals = {
  ad_storage: ConsentSignal;
  ad_user_data: ConsentSignal;
  ad_personalization: ConsentSignal;
  analytics_storage: ConsentSignal;
};

// Tolerant input shape for the bridge. Shopify's headless
// currentVisitorConsent() returns STRING values per category — 'yes' | 'no' |
// '' (verified via Production console) — while our own in-session writes
// (ConsentProvider ALL_ACCEPTED / ALL_DENIED) pass booleans. The bridge must
// accept both. Keyed off ConsentCategories so the category set stays in lockstep.
type ConsentFieldValue = boolean | string | null | undefined;
export type ConsentInput = Partial<
  Record<keyof ConsentCategories, ConsentFieldValue>
>;

// A category is GRANTED only on an explicit affirmative: Shopify's 'yes', the
// API's 'granted', or a boolean true. EVERYTHING else — 'no', '' (undecided),
// 'denied', false, null, undefined — is DENIED.
//
// This is the actual bug fix: the previous mapping used boolean truthiness
// (`consent.marketing ? 'granted' : 'denied'`), but Shopify hands us the STRING
// 'no' for a rejected category, and 'no' is truthy → it was mapped to 'granted'.
// An explicit value check is the only robust mapping for the 'yes'/'no' shape.
function isGranted(value: ConsentFieldValue): boolean {
  return value === true || value === 'yes' || value === 'granted';
}

export function toConsentModeSignals(consent: ConsentInput): ConsentModeSignals {
  const ad: ConsentSignal = isGranted(consent.marketing) ? 'granted' : 'denied';
  return {
    ad_storage: ad,
    ad_user_data: ad,
    ad_personalization: ad,
    analytics_storage: isGranted(consent.analytics) ? 'granted' : 'denied',
  };
}

const ALL_DENIED: ConsentModeSignals = {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
};

// Both GtmLoader (mount) and the event helpers (lazily, belt-and-braces)
// call this; the flag keeps the default a single dataLayer entry so the
// consent queue stays deterministic.
let consentDefaultPushed = false;

export function pushConsentDefault(): void {
  if (consentDefaultPushed) return;
  if (typeof window === 'undefined') return;
  consentDefaultPushed = true;
  gtag('consent', 'default', ALL_DENIED);
}

export function pushConsentUpdate(consent: ConsentInput): void {
  // Defaults must precede any update in the queue.
  pushConsentDefault();
  gtag('consent', 'update', toConsentModeSignals(consent));
}

// gtm.js is injected at most once per page lifecycle; consent revocation
// afterwards is handled via consent-update signals, not by unloading.
let gtmInjected = false;

export function isGtmInjected(): boolean {
  return gtmInjected;
}

// Standard GTM bootstrap, made consent-aware: caller decides WHEN (only
// after analytics/marketing consent), this function owns HOW. async script,
// never render-blocking.
export function injectGtm(gtmId: string): void {
  if (gtmInjected) return;
  if (typeof window === 'undefined') return;
  const dl = ensureDataLayer();
  if (!dl) return;
  gtmInjected = true;
  dl.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}
