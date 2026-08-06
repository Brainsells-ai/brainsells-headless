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

export class PrintfulProvider implements FulfillmentProvider {
  readonly name = 'printful';

  private token(): string {
    const value = process.env.PRINTFUL_API_TOKEN;
    if (!value) {
      throw new Error('[printful] required env var PRINTFUL_API_TOKEN is not set');
    }
    return value;
  }

  private storeId(): string {
    return brandConfig.fulfillment.printful.storeId;
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
   * Placement geometry for one catalog variant, straight from the catalog.
   * This is the data-driven half of the validation gate.
   *
   * The variant is selected BY ID and a miss throws. Never "the first variant" —
   * placement dimensions can differ per size, so a positional pick would validate
   * against the wrong geometry and pass a file that is wrong for the ordered size.
   */
  async fetchPlacementSpec(
    catalogProductId: number,
    catalogVariantId: number,
    placement: string,
  ): Promise<PlacementSpec> {
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
        `[printful] placement "${placement}" not offered by product ${catalogProductId}. Known: ${known}`,
      );
    }

    const variants = await this.request<{
      data: Array<{
        id: number;
        placement_dimensions?: Array<{ placement: string; width: number; height: number }>;
      }>;
    }>(`/v2/catalog-products/${catalogProductId}/catalog-variants?limit=100`, {
      storeScoped: false,
    });

    const variant = variants.data.find((v) => v.id === catalogVariantId);
    if (!variant) {
      throw new Error(
        `[printful] variant ${catalogVariantId} not found on product ${catalogProductId} ` +
          '(note: the variant list is paged — a product with >100 variants needs paging here)',
      );
    }

    const dims = variant.placement_dimensions?.find((d) => d.placement === placement);
    if (!dims) {
      throw new Error(
        `[printful] variant ${catalogVariantId} declares no dimensions for placement "${placement}"`,
      );
    }

    return {
      placement,
      technique: placementMeta.technique,
      // INCHES. The API declares no unit; inches is established by cross-check
      // (front_large returns 15 x 18, documented as 15" x 18"). See print-spec.ts.
      widthIn: dims.width,
      heightIn: dims.height,
      conflictsWith: placementMeta.conflicting_placements ?? [],
    };
  }

  async createOrder(order: NormalizedOrder): Promise<FulfillmentResponse> {
    if (order.items.length === 0) {
      throw new Error('[printful] refusing to create an order with no items');
    }

    const items = order.items.map((item) => {
      const variantId = item.metadata.catalogVariantId;
      const printFileUrl = item.metadata.printFileUrl;
      const placement = item.metadata.placement;

      // Printful's own documentation warns that confusing variant and product ids
      // is a common and costly mistake, so this is checked rather than coerced.
      if (typeof variantId !== 'number') {
        throw new Error(
          `[printful] item ${item.sku}: metadata.catalogVariantId must be a number ` +
            '(a CATALOG VARIANT id, not a product id)',
        );
      }
      if (typeof printFileUrl !== 'string' || printFileUrl.length === 0) {
        throw new Error(`[printful] item ${item.sku}: metadata.printFileUrl is required`);
      }
      if (typeof placement !== 'string' || placement.length === 0) {
        throw new Error(`[printful] item ${item.sku}: metadata.placement is required`);
      }

      return {
        source: 'catalog',
        catalog_variant_id: variantId,
        quantity: item.quantity,
        placements: [
          {
            placement,
            technique: (item.metadata.technique as string | undefined) ?? 'dtg',
            layers: [{ type: 'file', url: printFileUrl }],
          },
        ],
      };
    });

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
   * 🔴 UNVERIFIED SUBSYSTEM — fails closed on purpose.
   *
   * The spike did not establish Printful's webhook signing scheme: which header
   * carries the signature, which algorithm, and over which bytes. Rather than
   * return `true` and call the endpoint "verified", this requires an explicitly
   * configured shared secret and a matching HMAC-SHA256 over the raw body.
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
