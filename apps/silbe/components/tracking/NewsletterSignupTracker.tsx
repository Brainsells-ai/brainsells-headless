'use client';

// Fires the newsletter_signup dataLayer event once on mount, on the DOI
// confirmation landing page (/newsletter/bestaetigt). This is the real
// conversion point — the visitor reached this page by clicking the confirm link
// in Klaviyo's double-opt-in email.
//
// The ref guards against React StrictMode's double-invoke in dev so the event
// is pushed exactly once. Consent gating lives inside trackNewsletterSignup
// (analytics consent required); without it the push silently no-ops.

import { useEffect, useRef } from 'react';
import { trackNewsletterSignup } from '@/lib/tracking/events';

export function NewsletterSignupTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackNewsletterSignup();
  }, []);

  return null;
}
