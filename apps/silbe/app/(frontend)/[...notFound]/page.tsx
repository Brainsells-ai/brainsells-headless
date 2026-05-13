import { notFound } from 'next/navigation';

// Multi-root-layout catch-all. Because (frontend) and (payload) are
// sibling root layouts (no app/layout.tsx), Next.js's default unmatched-
// URL handling falls back to its built-in error page instead of the
// (frontend)/not-found.tsx. This catch-all routes every otherwise-
// unmatched URL into the (frontend) tree, triggers notFound(), and lets
// the nearest not-found.tsx render with the full (frontend) chrome.
// Static segments (e.g. /admin under (payload)) win on routing
// specificity, so the Payload admin is unaffected.
export default function CatchAll() {
  notFound();
}
