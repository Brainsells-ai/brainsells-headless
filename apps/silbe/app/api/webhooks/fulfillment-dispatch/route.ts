// Shopify-Order → Fulfillment-Provider. EIGENE Route, bewusst getrennt.
//
// ⚠️ RÜHRT orders-paid NICHT AN. SILBEs Purchase-Tracking (orders/paid → Stape →
// GA4, PR #52/#55/#56) ist real-delivery-verifiziert und bleibt unberührt. Diese
// Route ist eine SEPARAT registrierte Webhook-Route mit eigenem Topic, eigenem
// Ziel und eigener Fehlersemantik. Ein gemeinsamer Handler würde ein verifiziertes System an
// ein unverifiziertes koppeln — inklusive dessen 500-Retry-Logik.
//
// 🔴 ALS GANZES UNVERIFIZIERT. Diese Route ist nie gegen einen echten Store
// gelaufen: zum Zeitpunkt des Schreibens existiert kein Nicht-Prod-Store, und
// SILBE.AT ist produktiv und ausgeschlossen. Unit-getestet ist die Normalisierung,
// nicht der Durchstich. Nicht als fertig behandeln.
//
// DREI SICHERHEITSGURTE, in dieser Reihenfolge:
//   1. HMAC — unverifizierte Payloads werden gar nicht erst gelesen
//   2. Feature-Flag, Default AUS
//   3. Store-Allowlist, LEER by design — ohne Eintrag arbeitet die Route für
//      keinen Store, auch nicht für SILBE.AT
//   4. Store-Credential-Abgleich: der liefernde Shop muss der sein, dessen
//      Zugangsdaten dieses Deployment hält
// Provider-Orders entstehen ausschließlich als DRAFT; ein Confirm-Aufruf existiert
// in diesem Code nicht (per Test abgesichert, s. lib/fulfillment/guards.test.ts).

import { NextResponse, type NextRequest } from 'next/server';
import { verifyShopifyWebhook } from '@/lib/shopify-webhook-hmac';
import { brandConfig } from '@/lib/brand.config';
import { normalizeShopifyOrder, OrderNotFulfillable } from '@/lib/fulfillment/normalize';
import { makeVariantResolver } from '@/lib/fulfillment/variant-mapping';
import { deploymentStore, shopDomainOf } from '@/lib/shopify-admin';
import { routeOrder } from '@/lib/fulfillment/router';

export const runtime = 'nodejs';

/** Placement-Default. Siehe normalize.ts: bewusst hier und nicht im Modul. */
const DEFAULT_PLACEMENT = 'front_large';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const sigHeader = req.headers.get('x-shopify-hmac-sha256');

  // Gurt 1 — vor allem anderen. Ein nicht verifizierter Payload wird nicht geparst.
  if (!verifyShopifyWebhook(rawBody, sigHeader)) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
  }

  // Gurt 2 — Feature-Flag. `dispatched: false` mit Grund statt eines nackten
  // `ok: true`: ein bewusster No-Op soll im Log nicht wie eine Ausführung aussehen.
  if (!brandConfig.fulfillment.enabled) {
    return NextResponse.json({ ok: true, dispatched: false, reason: 'feature-flag-off' });
  }

  // Gurt 3 — Store-Allowlist. Leere Liste = niemand ist freigegeben.
  const shopDomain = req.headers.get('x-shopify-shop-domain') ?? '';
  const allowlist = brandConfig.fulfillment.storeAllowlist;
  if (!shopDomain || !allowlist.includes(shopDomain)) {
    console.warn(
      `[fulfillment-dispatch] Store "${shopDomain || '(kein Header)'}" nicht freigegeben ` +
        `(Allowlist: ${allowlist.length ? allowlist.join(', ') : 'LEER'}) — keine Aktion.`,
    );
    return NextResponse.json({ ok: true, dispatched: false, reason: 'store-not-allowlisted' });
  }

  // Gurt 4 — der liefernde Store MUSS der sein, dessen Credentials dieses
  // Deployment haelt. Sonst wuerde eine Lieferung von Store A mit den
  // Zugangsdaten von Store B beantwortet: Allowlist und Credential-Herkunft
  // muessen uebereinstimmen, nicht nur je fuer sich stimmen.
  const store = deploymentStore();
  if (shopDomain !== shopDomainOf(store)) {
    console.error(
      `[fulfillment-dispatch] Store-Mismatch: Lieferung von "${shopDomain}", ` +
        `Credentials fuer "${shopDomainOf(store)}" — keine Aktion.`,
    );
    return NextResponse.json({ ok: true, dispatched: false, reason: 'store-credential-mismatch' });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const order = await normalizeShopifyOrder(payload as never, {
      resolveVariant: makeVariantResolver(store),
      defaultPlacement: DEFAULT_PLACEMENT,
    });

    const results = await routeOrder(order);
    const failed = results.filter((r) => r.outcome.status === 'rejected');

    for (const r of failed) {
      const reason = r.outcome.status === 'rejected' ? r.outcome.reason : undefined;
      console.error(`[fulfillment-dispatch] Provider "${r.provider}" fehlgeschlagen:`, reason);
    }

    if (failed.length > 0) {
      // Provider-Fehler koennen transient sein (Netz, Rate-Limit) — 500, damit
      // Shopify erneut zustellt. Kein 200 mit ok:true: ein teilweise gescheiterter
      // Dispatch ist kein Erfolg.
      return NextResponse.json(
        {
          error: 'provider dispatch failed',
          dispatched: results.length - failed.length,
          failed: failed.length,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      dispatched: true,
      providers: results.map((r) => r.provider),
    });
  } catch (error) {
    if (error instanceof OrderNotFulfillable) {
      // DETERMINISTISCH — ein Retry aendert nichts. Deshalb 200 (kein Retry-Sturm),
      // aber laut geloggt und mit dispatched:false ausgewiesen. Behebung ist ein
      // menschlicher Schritt: Mapping-Metafield an der Variante setzen.
      console.error(`[fulfillment-dispatch] ${error.message}`);
      return NextResponse.json({ ok: true, dispatched: false, reason: 'not-fulfillable' });
    }
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[fulfillment-dispatch] unerwarteter Fehler: ${message}`);
    return NextResponse.json({ error: 'dispatch failed' }, { status: 500 });
  }
}
