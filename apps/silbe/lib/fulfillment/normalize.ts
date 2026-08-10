// Shopify-Order-Webhook-Payload → NormalizedOrder.
//
// Bewusst PUR: die Auflösung Shopify-Variante → catalog_variant_id kommt als
// injizierter Resolver herein, nicht als Import. Dadurch ist diese Datei ohne
// Netzwerk und ohne Store testbar, und der Hard-Fail-Pfad ist deterministisch
// prüfbar — genau der Teil, der nicht "irgendwann am echten Store" verifiziert
// werden soll, sondern jetzt.
//
// HARD FAIL bei unbekannter Variante. Kein Skip, kein Default. Eine Order, deren
// Variante kein Provider-Mapping trägt, ist nicht "teilweise erfüllbar" — sie ist
// nicht erfüllbar, und das muss laut sein. Ein stiller Skip würde eine bezahlte
// Position aus der Produktion fallen lassen, ohne dass es irgendwo auffällt.

import type { NormalizedOrder, NormalizedOrderItem } from './types';
import type { VariantResolver } from './variant-mapping';

/** Die Felder des Shopify-Order-Payloads, die wir tatsächlich lesen. */
export interface ShopifyOrderPayload {
  id?: number | string;
  admin_graphql_api_id?: string;
  name?: string;
  currency?: string;
  total_price?: string | number;
  email?: string;
  customer?: { first_name?: string | null; last_name?: string | null; email?: string | null } | null;
  shipping_address?: {
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    zip?: string | null;
    country_code?: string | null;
    province_code?: string | null;
  } | null;
  line_items?: Array<{
    id?: number | string;
    sku?: string | null;
    title?: string | null;
    quantity?: number;
    variant_id?: number | string | null;
    admin_graphql_api_id?: string | null;
    product_id?: number | string | null;
    properties?: Array<{ name: string; value: string }> | null;
  }> | null;
}

export class OrderNotFulfillable extends Error {
  constructor(message: string) {
    super(`[fulfillment/normalize] ${message}`);
    this.name = 'OrderNotFulfillable';
  }
}

function variantGid(raw: number | string): string {
  const s = String(raw);
  return s.startsWith('gid://') ? s : `gid://shopify/ProductVariant/${s}`;
}

/** Liest eine Line-Item-Property (Cart-Attribut) case-insensitiv. */
function prop(
  item: NonNullable<ShopifyOrderPayload['line_items']>[number],
  name: string,
): string | undefined {
  const hit = (item.properties ?? []).find((p) => p.name.toLowerCase() === name.toLowerCase());
  return hit?.value?.trim() || undefined;
}

export interface NormalizeOptions {
  /** Auflösung Shopify-Variante → Provider-Katalog-Variante. */
  resolveVariant: VariantResolver;
  /**
   * Platzierung, wenn die Position keine eigene mitbringt. Kein Default im Code:
   * ein falsches Placement druckt an der falschen Stelle, und "front" ist für
   * neue DTG-Produkte nicht mehr die richtige Wahl (front_large, 15x18).
   */
  defaultPlacement: string;
}

export async function normalizeShopifyOrder(
  payload: ShopifyOrderPayload,
  opts: NormalizeOptions,
): Promise<NormalizedOrder> {
  const reference = payload.name ?? (payload.id !== undefined ? `#${payload.id}` : undefined);
  if (!reference) {
    throw new OrderNotFulfillable('Order ohne id und ohne name — nicht zuordenbar.');
  }

  const id = payload.admin_graphql_api_id ?? (payload.id !== undefined ? String(payload.id) : '');
  if (!id) throw new OrderNotFulfillable(`Order ${reference} ohne verwertbare id.`);

  const addr = payload.shipping_address;
  if (!addr?.address1 || !addr.city || !addr.zip || !addr.country_code) {
    // Ohne vollständige Lieferadresse kann kein Provider produzieren. Früh und
    // laut scheitern ist besser, als es der Provider-API zu überlassen.
    throw new OrderNotFulfillable(
      `Order ${reference}: unvollständige Lieferadresse ` +
        `(address1/city/zip/country_code erforderlich).`,
    );
  }

  const email = payload.customer?.email ?? payload.email;
  if (!email) throw new OrderNotFulfillable(`Order ${reference}: keine E-Mail-Adresse.`);

  const lineItems = payload.line_items ?? [];
  if (lineItems.length === 0) {
    throw new OrderNotFulfillable(`Order ${reference}: keine Positionen.`);
  }

  const items: NormalizedOrderItem[] = [];
  for (const li of lineItems) {
    const label = li.sku || li.title || String(li.id ?? '?');

    if (li.variant_id === null || li.variant_id === undefined) {
      throw new OrderNotFulfillable(
        `Order ${reference}, Position "${label}": keine variant_id — nicht auflösbar.`,
      );
    }
    const gid = li.admin_graphql_api_id ?? variantGid(li.variant_id);

    const catalogVariantId = await opts.resolveVariant(gid);
    if (catalogVariantId === null) {
      // DER Hard-Fail dieses Sprints. Bewusst mit der Variante im Text, damit die
      // Behebung (Mapping-Metafield setzen) ohne Nachforschung möglich ist.
      throw new OrderNotFulfillable(
        `Order ${reference}, Position "${label}": Variante ${gid} trägt kein ` +
          `Provider-Mapping. Order wird NICHT teilweise ausgeführt.`,
      );
    }

    const quantity = li.quantity ?? 0;
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new OrderNotFulfillable(
        `Order ${reference}, Position "${label}": ungültige Menge (${li.quantity}).`,
      );
    }

    items.push({
      sku: li.sku ?? '',
      productHandle: String(li.product_id ?? ''),
      quantity,
      metadata: {
        catalogVariantId,
        shopifyVariantGid: gid,
        placement: prop(li, 'placement') ?? opts.defaultPlacement,
        // Druckdatei-URL kommt als Line-Item-Property aus dem Cart (Modell B:
        // extern gehostet, Provider besitzt das Produkt nicht). Fehlt sie, faellt
        // es beim Provider auf — createOrder verlangt sie und wirft.
        ...(prop(li, 'printFileUrl') ? { printFileUrl: prop(li, 'printFileUrl') } : {}),
        ...(prop(li, 'fulfillmentProvider')
          ? { fulfillmentProvider: prop(li, 'fulfillmentProvider') }
          : {}),
      },
    });
  }

  const total = Number(payload.total_price ?? 0);

  return {
    id,
    reference,
    customer: {
      email,
      firstName: payload.customer?.first_name ?? '',
      lastName: payload.customer?.last_name ?? '',
    },
    shippingAddress: {
      line1: addr.address1,
      ...(addr.address2 ? { line2: addr.address2 } : {}),
      city: addr.city,
      postalCode: addr.zip,
      country: addr.country_code,
      ...(addr.province_code ? { state: addr.province_code } : {}),
    },
    items,
    currency: payload.currency ?? 'EUR',
    totalAmount: Number.isFinite(total) ? total : 0,
  };
}
