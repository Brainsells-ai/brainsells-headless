'use client';

// Pushes a page_view dataLayer event on every App-Router route change,
// including the initial render. Uses usePathname only (NOT useSearchParams)
// so the island needs no Suspense boundary and never opts routes out of
// static rendering. Variant switches on the PDP (?variant=A2) are therefore
// NOT separate page_views — intentional, they are the same page.
//
// Consent gate lives inside trackPageView: without analytics/marketing
// consent the push silently does not happen. Events pushed after consent
// but before gtm.js finished loading queue in window.dataLayer and are
// replayed by GTM on load — nothing is lost.
//
// GTM wiring note (Schritt 3): the GA4 tag in the web container must
// trigger on THIS custom page_view event — not additionally on Container
// Load / History Change — or page views will double-count.

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { trackPageView } from '@/lib/tracking/events';

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  return null;
}
