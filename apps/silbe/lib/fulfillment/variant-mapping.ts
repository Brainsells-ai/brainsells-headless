// Auflösung Shopify-Variante → Provider-Katalog-Variante.
//
// ENTSCHEIDUNG (Recon R3, 2026-08-11): das Mapping lebt als METAFIELD AUF DER
// SHOPIFY-VARIANTE. Verworfen wurden:
//   - eine Map in brand.config → wäre eine zweite Wahrheitsquelle neben Shopify
//     (das Muster aus Leck #4) und nicht agent-schreibbar: jede neue Variante
//     bräuchte Commit und Deploy.
//   - eine Payload-Collection → würde Payload für Fulfillment load-bearing machen
//     und eine echte Postgres-DB pro Brand erzwingen. Der Schicht-0-Fork hat
//     belegt, dass Payload NICHT auf dem kritischen Pfad liegt (Lage A); das
//     wieder einzureißen wäre teuer erkauft.
//
// Der gewählte Weg schreibt Mapping und Variante im selben Admin-Call — sie
// können nicht auseinanderlaufen. Shopify bleibt Quelle der Wahrheit (Modell B).

import { brandConfig } from '@/lib/brand.config';
import { shopifyAdminFetch } from '@/lib/shopify-admin';

/** Metafield-Key auf der Variante. Namespace kommt aus brand.config. */
export const VARIANT_MAPPING_KEY = 'provider_catalog_variant_id';

/**
 * Löst eine Shopify-Varianten-GID in die Katalog-Varianten-ID des Providers auf.
 * `null` bedeutet: kein Mapping hinterlegt — der Aufrufer MUSS das als harten
 * Fehler behandeln, niemals als "überspringen".
 */
export type VariantResolver = (shopifyVariantGid: string) => Promise<number | null>;

const QUERY = /* GraphQL */ `
  query VariantFulfillmentMapping($id: ID!, $ns: String!, $key: String!) {
    node(id: $id) {
      ... on ProductVariant {
        id
        metafield(namespace: $ns, key: $key) {
          value
        }
      }
    }
  }
`;

/**
 * Echter Resolver gegen die Shopify Admin API.
 *
 * 🔴 UNVERIFIZIERT. Diese Funktion ist nie gegen einen echten Store gelaufen —
 * zum Zeitpunkt des Schreibens existiert kein Nicht-Prod-Store, und SILBE.AT ist
 * produktiv und ausgeschlossen. Die Query-Form ist aus der Admin-API-Doku
 * abgeleitet, nicht empirisch bestätigt. Vor dem ersten echten Einsatz gegen
 * einen Dev-Store prüfen: Feldname `metafield` auf ProductVariant, Verhalten bei
 * fehlendem Metafield (erwartet `null`), und ob der Namespace-Zugriff die
 * Scopes der App abdeckt.
 */
export const resolveVariantViaMetafield: VariantResolver = async (shopifyVariantGid) => {
  const data = await shopifyAdminFetch<{
    node: { id: string; metafield: { value: string } | null } | null;
  }>(QUERY, {
    id: shopifyVariantGid,
    ns: brandConfig.fulfillment.metafieldNamespace,
    key: VARIANT_MAPPING_KEY,
  });

  const raw = data.node?.metafield?.value?.trim();
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    // Ein gesetztes, aber unbrauchbares Mapping ist schlimmer als gar keines:
    // es sieht nach Konfiguration aus. Deshalb werfen statt null zurückgeben.
    throw new Error(
      `[variant-mapping] Variante ${shopifyVariantGid} trägt ein ungültiges Mapping ` +
        `("${raw}") — erwartet wird eine positive Ganzzahl (catalog_variant_id).`,
    );
  }
  return parsed;
};
