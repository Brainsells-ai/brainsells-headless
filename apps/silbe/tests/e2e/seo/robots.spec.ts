import { test, expect } from '@playwright/test';

// Regressions-Guard für /robots.txt.
//
// Warum es diese Datei gibt: die Route war von ihrer Einführung (#37, 2026-05-27)
// bis 2026-08-10 TOT. `robots.ts` lag unter `app/(frontend)/` statt im App-Root,
// Next hat sie dort stillschweigend ignoriert, `/robots.txt` lieferte 404 — in
// Produktion und im Wegwerf-Fork gleichermaßen. Der Build blieb dabei grün und
// kein Test hat hingesehen. Genau zweieinhalb Monate lang.
//
// Der wichtigste Assert hier ist deshalb der langweiligste: Status 200.

const EXPECTED_ORIGIN = (process.env.METADATA_BASE_URL ?? '').replace(/\/+$/, '');

test.describe('robots.txt @seo', () => {
  test('wird überhaupt ausgeliefert (200, text/plain) @seo', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status(), '/robots.txt muss existieren — war 2,5 Monate ein 404').toBe(200);
    expect(res.headers()['content-type']).toContain('text/plain');
  });

  test('erlaubt Crawling und sperrt die token-gated Pfade @seo', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).toMatch(/^Allow: \/$/m);
    // Die Widerruf-Bestätigungsschritte sind token-gated und dürfen nicht in den
    // Index; /api/ hat keinen Crawl-Wert.
    expect(body).toContain('Disallow: /widerruf/bestaetigen');
    expect(body).toContain('Disallow: /widerruf/erfolg');
    expect(body).toContain('Disallow: /api/');
  });

  test('zeigt auf die Sitemap des KONFIGURIERTEN Origins @seo', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    expect(
      EXPECTED_ORIGIN,
      'METADATA_BASE_URL muss für die SEO-Suite gesetzt sein',
    ).toBeTruthy();
    // Brand-agnostisch: keine Host-Allowlist, sondern Kopplung an die Konfiguration.
    expect(body).toContain(`Sitemap: ${EXPECTED_ORIGIN}/sitemap.xml`);
    expect(body).not.toContain('silbe.at');
  });

  test('Host-Direktive ist ein nackter Hostname, keine URL @seo', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text();
    const host = body.match(/^Host:\s*(.+)$/m)?.[1]?.trim();
    if (host === undefined) return; // Direktive ist optional
    expect(host, 'Host darf kein Schema tragen').not.toMatch(/^https?:\/\//);
    expect(host, 'Host darf keinen Trailing Slash tragen').not.toMatch(/\/$/);
    expect(host).toBe(new URL(EXPECTED_ORIGIN).host);
  });
});
