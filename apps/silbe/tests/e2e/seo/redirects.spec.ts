import { test, expect } from '@playwright/test';

// Phase-9 Sprint-A — legacy SILBE.AT → headless 301-map. Next.js redirects()
// with permanent:true emit HTTP 308 (NOT 301). Decision 1: keep 308 (Google
// treats 308 ≡ 301 for SEO); assert 308 here. The wildcard /blogs/journal/:slug*
// rules are covered by their non-wildcard base case.

const REDIRECTS: { from: string; to: string }[] = [
  { from: '/collections/alle-werke', to: '/editionen' },
  { from: '/blogs/journal', to: '/bibliothek' },
  { from: '/pages/journal', to: '/bibliothek' },
  { from: '/pages/ueber-uns', to: '/ueber-uns' },
  { from: '/werkstatt', to: '/ueber-uns' },
  { from: '/pages/autoren', to: '/stimmen' },
  { from: '/pages/widerruf', to: '/widerrufsrecht' },
];

test.describe('legacy redirects @seo', () => {
  for (const { from, to } of REDIRECTS) {
    test(`${from} → ${to} is a 308 @seo`, async ({ page }) => {
      const res = await page.request.get(from, { maxRedirects: 0 });
      expect(res.status(), `${from} status`).toBe(308);
      expect(res.headers()['location'], `${from} location`).toContain(to);
    });
  }
});
