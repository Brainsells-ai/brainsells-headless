// Provider-agnostic fulfillment contract (MEGAPROMPT Phase 7 §7.3).
//
// SCOPE: this interface exists for the Brand-Factory and new brands. It does NOT
// change SILBE's current fulfillment — SILBE's prints run through the Gelato
// Shopify app and the tote bags through Printful on app level, both outside this
// code path. Nothing here is wired into an existing SILBE route.
//
// Model B (decided 2026-08-06): Shopify is the source of truth. The provider
// receives an order plus an externally hosted print-file URL and never owns the
// product. Printful's Ecommerce-Platform-Sync API is deliberately NOT used.

/** Shopify order reduced to the fields every provider needs. */
export interface NormalizedOrder {
  /** Provider-agnostic order id (Shopify Order GID). */
  id: string;
  /** Human-readable reference, e.g. "#1042". */
  reference: string;
  /**
   * Die Marke, zu der ALLE Positionen dieser Order gehoeren.
   *
   * Steht auf der Order, nicht auf der Position, weil eine Order mit zwei Marken
   * kein gueltiger Zustand ist — nicht buchhalterisch, nicht in der Attribution,
   * nicht gegenueber dem Kunden, sobald Marken eigene Rechtstexte, eigene
   * Bestaetigungen und eigene Absender haben. normalize.ts erzwingt die
   * Einheitlichkeit; hier steht das Ergebnis.
   */
  brand: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
  };
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postalCode: string;
    /** ISO 3166-1 alpha-2. */
    country: string;
    state?: string;
  };
  items: NormalizedOrderItem[];
  /** ISO 4217. */
  currency: string;
  totalAmount: number;
}

export interface NormalizedOrderItem {
  sku: string;
  productHandle: string;
  quantity: number;
  /**
   * Provider-specific hints. Recognised keys:
   * - `fulfillmentProvider`  → per-item provider override (router input)
   * - `printFileUrl`         → externally hosted print file (Model B)
   * - `catalogVariantId`     → provider catalog variant id
   * - `placement`            → e.g. "front_large"
   *
   * Deliberately `unknown`-valued: the router and the providers narrow what they
   * need. A missing key must fail loudly at the point of use, never default.
   */
  metadata: Record<string, unknown>;
}

export interface FulfillmentResponse {
  providerOrderId: string;
  status: 'created' | 'queued' | 'failed';
  estimatedDelivery?: string;
  /** Provider-specific raw response, for debugging. Never logged wholesale. */
  raw: unknown;
}

export interface OrderStatus {
  providerOrderId: string;
  status:
    | 'created'
    | 'in_production'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'failed';
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  events: Array<{
    timestamp: string;
    status: string;
    note?: string;
  }>;
}

export interface WebhookResult {
  providerOrderId: string;
  newStatus: OrderStatus['status'];
  shouldNotifyCustomer: boolean;
}

export interface FulfillmentProvider {
  /** Stable identifier, e.g. "printful", "mock", "warehouse-vienna". */
  readonly name: string;

  /** Verifies a webhook payload actually originates from the provider. */
  verifyWebhook(payload: string, headers: Headers): boolean;

  /** Creates an order at the provider. */
  createOrder(order: NormalizedOrder): Promise<FulfillmentResponse>;

  /** Cancels an order if the provider still allows it (before production). */
  cancelOrder(providerOrderId: string): Promise<void>;

  /** Polls current status (dashboard, cron, reconciliation). */
  getStatus(providerOrderId: string): Promise<OrderStatus>;

  /** Parses a provider webhook into the unified shape. */
  handleWebhook(payload: unknown): Promise<WebhookResult>;
}

// ---------------------------------------------------------------------------
// Print-file domain
// ---------------------------------------------------------------------------

/**
 * Geometry of one print placement, as served by the provider catalog.
 *
 * EMPIRICAL NOTE (Printful, verified 2026-08-06 against the live v2 API):
 * `width`/`height` come from `GET /v2/catalog-products/{id}/catalog-variants`
 * → `placement_dimensions[]`. The API does NOT declare a unit. Inches is
 * established by cross-check: `front_large` returns 15 x 18, and Printful
 * documents that placement as 15" x 18". Do not assume any other unit.
 *
 * `catalog-products.placements[]` does NOT carry dimensions — only placement,
 * technique, layers and conflicting_placements. Reading geometry from there
 * yields `undefined`.
 */
export interface PlacementSpec {
  /** Provider placement id, e.g. "front_large". */
  placement: string;
  /** Print technique the placement belongs to, e.g. "dtg". */
  technique: string;
  /** Printable width in INCHES. */
  widthIn: number;
  /** Printable height in INCHES. */
  heightIn: number;
  /** Placements that cannot be combined with this one. */
  conflictsWith: string[];
}

/** A print file as handed to a provider, after rasterisation. */
export interface PrintFile {
  /** Publicly reachable URL the provider fetches the file from (Model B). */
  url: string;
  /** Raster width in pixels. */
  widthPx: number;
  /** Raster height in pixels. */
  heightPx: number;
  /** Lower-case format token, e.g. "png". */
  format: string;
  /** File size in bytes. */
  bytes: number;
}

/** One reason a print file was rejected. Never a warning — the gate hard-fails. */
export interface ValidationFailure {
  code:
    | 'FORMAT_NOT_ALLOWED'
    | 'BELOW_MIN_DPI'
    | 'DIMENSIONS_MISMATCH'
    | 'FILE_TOO_LARGE'
    | 'PLACEMENT_UNKNOWN';
  message: string;
}
