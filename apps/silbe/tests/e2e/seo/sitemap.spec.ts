import { test, expect } from '@playwright/test';
import { CANONICAL_HANDLES } from '../../../scripts/metafields-manifest';

// Phase-9 Sprint-A — /sitemap.xml. Must be valid XML and list every canonical
// edition PDP plus the key static routes. CANONICAL_HANDLES is imported from
// the manifest — the SAME source app/(frontend)/sitemap.ts uses — so this
// stays in lockstep with the generated sitemap.

test.describe('sitemap.xml @seo', () => {
  test('returns 200 XML containing all canonical handles + static routes @seo', async ({
    page,
  }) => {
    const res = await page.request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');

    const body = await res.text();
    expect(body).toContain('<urlset');
    expect(body).toMatch(/<loc>[^<]*\/<\/loc>/); // homepage
    expect(body).toContain('/editionen');

    for (const handle of CANONICAL_HANDLES) {
      expect(body, `sitemap must list /editionen/${handle}`).toContain(
        `/editionen/${handle}`,
      );
    }
  });
});
