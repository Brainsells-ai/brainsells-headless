// Printful provider — Model B: Shopify owns the product, Printful receives an
// order plus an externally hosted print-file URL. The Ecommerce-Platform-Sync API
// is deliberately not used.
//
// Epistemic status of the endpoints used here (spike 2026-08-06, live API):
//   ✅ empirical  GET  /v2/catalog-products/{id}                 → placements, techniques
//   ✅ empirical  GET  /v2/catalog-products/{id}/catalog-variants → placement_dimensions
//   ✅ empirical  header `X-PF-Store-Id` selects the store; store-scoped calls
//                 without it return HTTP 400 ("This endpoint requires `store_id`!")
//   📄 documentary POST /v2/orders with placements[].layers[].url — read from the
//                 v2 docs, NOT executed (creating a real order was out of scope)
//   📄 documentary POST /v2/orders/{id}/cancel
//   🔴 unverified  webhook signing scheme — see verifyWebhook below
//
// Credential split, made explicit because this is the first place the blueprint
// needs it: PRINTFUL_API_TOKEN is FACTORY level (one account-wide token across all
// brands, read here from env). The store id is PER BRAND and comes from
// brand.config. The account genuinely carries multiple stores — verified — so
// picking "the only" or "the first" store is a real bug, not a hypothetical one.

import crypto from 'crypto';
import { brandConfig } from '@/lib/brand.config';
import type {
  FulfillmentProvider,
  FulfillmentResponse,
  NormalizedOrder,
  OrderStatus,
  PlacementSpec,
  WebhookResult,
} from '../types';

const API_BASE = 'https://api.printful.com';

/** Printful order status → our normalised status. */
const STATUS_MAP: Readonly<Record<string, OrderStatus['status']>> = {
  draft: 'created',
  pending: 'created',
  onhold: 'created',
  inprocess: 'in_production',
  partial: 'in_production',
  fulfilled: 'shipped',
  shipped: 'shipped',
  delivered: 'delivered',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  failed: 'failed',
};

export interface PrintfulProviderOptions {
  /**
   * Printful store this instance talks to. Part of the CONSTRUCTOR signature, not
   * a per-call argument: one provider instance belongs to exactly one brand's
   * store, and threading a store id through every call would make it possible to
   * pass a different one per call — the mistake this design forecloses.
   *
   * Omit it and the value is resolved from brand.config on first use. Resolution
   * stays lazy either way, so constructing a provider never touches the env.
   */
  storeId?: string;
}

export class PrintfulProvider implements FulfillmentProvider {
  readonly name = 'printful';

  private readonly storeIdOverride?: string;

  constructor(options: PrintfulProviderOptions = {}) {
    this.storeIdOverride = options.storeId;
  }

  private token(): string {
    const value = process.env.PRINTFUL_API_TOKEN;
    if (!value) {
      throw new Error('[printful] required env var PRINTFUL_API_TOKEN is not set');
    }
    return value;
  }

  private storeId(): string {
    // Explicit injection wins; otherwise the per-brand value from brand.config.
    // There is deliberately no "pick the only store" or "pick the first" path —
    // the account carries several stores (verified 2026-08-06), so a positional
    // fallback would silently route one brand's orders into another brand's store.
    return this.storeIdOverride ?? brandConfig.fulfillment.printful.storeId;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { storeScoped?: boolean } = {},
  ): Promise<T> {
    const { storeScoped = true, headers, ...rest } = init;
    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        Authorization: `Bearer ${this.token()}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(storeScoped ? { 'X-PF-Store-Id': this.storeId() } : {}),
        ...(headers as Record<string, string> | undefined),
      },
    });

    const text = await res.text();
    if (!res.ok) {
      // The body carries Printful's reason and does not contain the token.
      throw new Error(`[printful] ${init.method ?? 'GET'} ${path} → ${res.status} ${text}`);
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  /**
   * The ONE catalog variant, by id. Carries `catalog_product_id` and this
   * variant's own `placement_dimensions` (verified 2026-08-12 against the live
   * v2 API for variants 19526 and 4025).
   *
   * This replaces the previous route of listing a product's variants and picking
   * ours out of the page. That route was unusable for apparel: catalog product 71
   * has 590 variants and the request asked for `limit=100`, so the lookup threw
   * "variant not found on product" for almost every real variant. The old code
   * said so in its own error text — but since nothing ever called it, the note
   * never became a failure anyone had to face.
   */
  private async fetchCatalogVariant(catalogVariantId: number): Promise<{
    catalog_product_id: number;
    placement_dimensions?: Array<{
      placement: string;
      width: number;
      height: number;
      orientation?: string;
    }>;
  }> {
    const res = await this.request<{
      data: {
        catalog_product_id: number;
        placement_dimensions?: Array<{
          placement: string;
          width: number;
          height: number;
          orientation?: string;
        }>;
      };
    }>(`/v2/catalog-variants/${catalogVariantId}`, { storeScoped: false });
    return res.data;
  }

  /**
   * Does this product offer this placement, and under which technique?
   *
   * The technique is NOT a choice — for a given product and placement the catalog
   * names exactly one. That is the difference to the placement itself, which the
   * catalog only offers as a SET (variant 4025: front, back, sleeve_left,
   * sleeve_right, embroidery_chest_left, …) and which therefore has to be carried
   * by the Shopify variant. Derivable → derive it; a choice → store it.
   */
  async fetchPlacementMeta(
    catalogVariantId: number,
    placement: string,
  ): Promise<{ catalogProductId: number; technique: string; conflictsWith: string[] }> {
    const variant = await this.fetchCatalogVariant(catalogVariantId);
    const catalogProductId = variant.catalog_product_id;

    const product = await this.request<{
      data: {
        placements: Array<{
          placement: string;
          technique: string;
          conflicting_placements?: string[];
        }>;
      };
    }>(`/v2/catalog-products/${catalogProductId}`, { storeScoped: false });

    const placementMeta = product.data.placements.find((p) => p.placement === placement);
    if (!placementMeta) {
      const known = product.data.placements.map((p) => p.placement).join(', ');
      throw new Error(
        `[printful] placement "${placement}" not offered by product ${catalogProductId} ` +
          `(variant ${catalogVariantId}). Known: ${known}`,
      );
    }

    return {
      catalogProductId,
      technique: placementMeta.technique,
      conflictsWith: placementMeta.conflicting_placements ?? [],
    };
  }

  /**
   * Placement geometry for one catalog variant, straight from the catalog.
   * This is the data-driven half of the validation gate.
   *
   * ORIENTATION IS NOT GUESSED. A placement can appear MORE THAN ONCE in
   * `placement_dimensions`, distinguished only by `orientation` — variant 19526
   * lists `default` twice: vertical 16.54 x 23.39 and horizontal 23.39 x 16.54
   * (verified 2026-08-12). The previous code took the first match, which is the
   * very mistake the comment above it warned against, one level down: a positional
   * pick validates against the wrong geometry. When several entries qualify and no
   * orientation is given, this throws rather than choosing.
   */
  async fetchPlacementSpec(
    catalogVariantId: number,
    placement: string,
    orientation?: string,
  ): Promise<PlacementSpec> {
    const meta = await this.fetchPlacementMeta(catalogVariantId, placement);
    const variant = await this.fetchCatalogVariant(catalogVariantId);

    const all = (variant.placement_dimensions ?? []).filter((d) => d.placement === placement);
    if (all.length === 0) {
      throw new Error(
        `[printful] variant ${catalogVariantId} declares no dimensions for placement "${placement}"`,
      );
    }

    const candidates = orientation
      ? all.filter((d) => (d.orientation ?? 'any') === orientation)
      : all;

    if (candidates.length !== 1) {
      const shown = all
        .map((d) => `${d.orientation ?? 'any'}: ${d.width}x${d.height}`)
        .join(' | ');
      throw new Error(
        `[printful] variant ${catalogVariantId}, placement "${placement}": ` +
          `${candidates.length === 0 ? 'no' : candidates.length} dimension entries match ` +
          `orientation "${orientation ?? '(none given)'}". Available: ${shown}. ` +
          'Refusing to pick one — a positional pick validates against the wrong geometry.',
      );
    }
    const dims = candidates[0];

    return {
      placement,
      technique: meta.technique,
      // INCHES. The API declares no unit; inches is established by cross-check
      // (front_large returns 15 x 18, documented as 15" x 18"). See print-spec.ts.
      widthIn: dims.width,
      heightIn: dims.height,
      conflictsWith: meta.conflictsWith,
    };
  }

  async createOrder(order: NormalizedOrder): Promise<FulfillmentResponse> {
    if (order.items.length === 0) {
      throw new Error('[printful] refusing to create an order with no items');
    }

    const items = await Promise.all(order.items.map(async (item) => {
      const variantId = item.metadata.catalogVariantId;
      const printFileUrl = item.metadata.printFileUrl;
      const placement = item.metadata.placement;

      // DIE PROVIDER-GRENZE. Die agnostische Schicht reicht die Katalog-ID als
      // opaken String durch — ein anderer POD-Anbieter darf alphanumerisch
      // zaehlen. Printful verlangt eine positive Ganzzahl, also wird hier und nur
      // hier umgewandelt und geprueft.
      //
      // Printful's own documentation warns that confusing variant and product ids
      // is a common and costly mistake, so this is checked rather than coerced.
      if (typeof variantId !== 'string' || variantId.length === 0) {
        throw new Error(
          `[printful] item ${item.sku}: metadata.catalogVariantId fehlt oder ist kein String`,
        );
      }
      const numericVariantId = Number(variantId);
      if (!Number.isInteger(numericVariantId) || numericVariantId <= 0) {
        throw new Error(
          `[printful] item ${item.sku}: catalogVariantId "${variantId}" ist keine positive ` +
            'Ganzzahl. Printful erwartet eine CATALOG VARIANT id, keine Produkt-ID.',
        );
      }
      if (typeof printFileUrl !== 'string' || printFileUrl.length === 0) {
        throw new Error(`[printful] item ${item.sku}: metadata.printFileUrl is required`);
      }
      if (typeof placement !== 'string' || placement.length === 0) {
        throw new Error(`[printful] item ${item.sku}: metadata.placement is required`);
      }

      // TECHNIK AUS DEM KATALOG, nicht aus einem Default. Hier stand
      // `?? 'dtg'` — die Shirt-Technik, für jedes Poster ("digital") falsch, und
      // zwar nicht in einer Konstante, sondern direkt im Order-Body. Derselbe
      // Fehler wie beim Placement-Default, eine Ebene tiefer.
      //
      // Der Call validiert zugleich, dass das Placement zu DIESEM Produkt gehört
      // — die Prüfung, die bisher niemand machte: das Gate hielt die Datei gegen
      // ein Placement, aber nichts hielt das Placement gegen das Produkt.
      //
      // Kein Memo: eine Order hat wenige Positionen und je Position eine andere
      // Variante. Wenn Bestellungen mit vielen Positionen üblich werden, gehört
      // hier ein Cache pro Aufruf hin — nicht pro Instanz, die lebt zu lang.
      const { technique } = await this.fetchPlacementMeta(numericVariantId, placement);

      return {
        source: 'catalog',
        catalog_variant_id: numericVariantId,
        quantity: item.quantity,
        placements: [
          {
            placement,
            technique,
            layers: [{ type: 'file', url: printFileUrl }],
          },
        ],
      };
    }));

    const body = {
      external_id: order.id,
      recipient: {
        name: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        email: order.customer.email,
        address1: order.shippingAddress.line1,
        address2: order.shippingAddress.line2,
        city: order.shippingAddress.city,
        state_code: order.shippingAddress.state,
        country_code: order.shippingAddress.country,
        zip: order.shippingAddress.postalCode,
      },
      order_items: items,
    };

    const created = await this.request<{ data: { id: number | string; status?: string } }>(
      '/v2/orders',
      { method: 'POST', body: JSON.stringify(body) },
    );

    return {
      providerOrderId: String(created.data.id),
      status: 'created',
      raw: created,
    };
  }

  async cancelOrder(providerOrderId: string): Promise<void> {
    await this.request(`/v2/orders/${providerOrderId}/cancel`, { method: 'POST' });
  }

  async getStatus(providerOrderId: string): Promise<OrderStatus> {
    const res = await this.request<{
      data: {
        id: number | string;
        status?: string;
        shipments?: Array<{ tracking_number?: string; tracking_url?: string; carrier?: string }>;
      };
    }>(`/v2/orders/${providerOrderId}`);

    const raw = (res.data.status ?? '').toLowerCase();
    const mapped = STATUS_MAP[raw];
    if (!mapped) {
      // An unmapped status is a real signal that Printful changed its vocabulary.
      // Guessing 'created' here would quietly report progress that did not happen.
      throw new Error(
        `[printful] unmapped order status "${res.data.status}" for order ${providerOrderId}`,
      );
    }

    const shipment = res.data.shipments?.[0];
    return {
      providerOrderId: String(res.data.id),
      status: mapped,
      trackingNumber: shipment?.tracking_number,
      trackingUrl: shipment?.tracking_url,
      carrier: shipment?.carrier,
      events: [],
    };
  }

  /**
   * 🔴 SEARCHED, NOT FOUND — fails closed on purpose.
   *
   * Status as of 2026-08-06, after actively looking rather than assuming:
   * Printful's v2 release notes state the new webhooks add "enforcing HTTPS,
   * added expiration date, and request signing". The developer documentation
   * announces that request signing exists but does NOT specify the mechanism —
   * no header name, no algorithm, no description of which bytes are signed and
   * no account of how the secret is obtained. A web search over printful.com,
   * help.printful.com and developers.printful.com surfaced the same sentence and
   * nothing implementable.
   *
   * So this is not "we did not check". It is "we checked, the scheme is not
   * published at the level needed to implement it". The remaining path is a real
   * webhook delivery: register an endpoint, capture the headers of one genuine
   * call, and derive the scheme from it. Until then the implementation below is a
   * PLACEHOLDER — the header name in particular is a guess and must not be
   * trusted.
   *
   * Rather than return `true` and call the endpoint "verified", this requires an
   * explicitly configured shared secret and a matching HMAC-SHA256 over the raw
   * body.
   *
   * Consequence, stated plainly: with PRINTFUL_WEBHOOK_SECRET unset, every
   * Printful webhook is rejected. That is the intended behaviour until the scheme
   * is confirmed against a real delivery — a webhook endpoint that accepts
   * anything is worse than one that accepts nothing.
   *
   * The header name below is a PLACEHOLDER and must be confirmed before this is
   * enabled in production.
   */
  verifyWebhook(payload: string, headers: Headers): boolean {
    const secret = process.env.PRINTFUL_WEBHOOK_SECRET;
    if (!secret) return false;

    const signature = headers.get('x-printful-signature');
    if (!signature || payload.length === 0) return false;

    const expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  async handleWebhook(payload: unknown): Promise<WebhookResult> {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('[printful] webhook payload must be an object');
    }
    const data = (payload as { data?: Record<string, unknown> }).data ?? (payload as Record<string, unknown>);
    const orderId = data.order_id ?? data.id;
    const rawStatus = String(data.status ?? '').toLowerCase();

    if (orderId === undefined) {
      throw new Error('[printful] webhook payload carries no order id');
    }
    const mapped = STATUS_MAP[rawStatus];
    if (!mapped) {
      throw new Error(`[printful] webhook carries unmapped status "${rawStatus}"`);
    }

    return {
      providerOrderId: String(orderId),
      newStatus: mapped,
      shouldNotifyCustomer: mapped === 'shipped',
    };
  }
}
