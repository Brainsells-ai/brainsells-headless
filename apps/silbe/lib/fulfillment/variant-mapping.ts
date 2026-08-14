// Auflösung Shopify-Variante → Fulfillment-Zuordnung.
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
import { shopifyAdminFetch, type ShopifyStore } from '@/lib/shopify-admin';

/** Metafield-Key auf der Variante. Namespace kommt aus brand.config. */
export const VARIANT_MAPPING_KEY = 'provider_catalog_variant_id';

/**
 * Welcher Provider diese Variante erfüllt ("printful", "mock", …).
 *
 * Trägt die Variante selbst, statt es aus dem Store zu schliessen. Pool = ein
 * Provider ist eine Konvention, keine Eigenschaft — SILBE ist bereits gemischt
 * (Gelato für Drucke, Printful für Tote Bags).
 *
 * ⚠️ Der Provider kommt AUSSCHLIESSLICH von hier. Es gibt bewusst KEINEN Weg über
 * eine Cart-/Line-Item-Property: die kommt aus dem Browser, und ein daraus
 * ableitbarer Provider wäre eine Angriffsfläche — jemand könnte Bestellungen an
 * einen fremden Provider routen. Kein Override, kein Fallback. Per Wächter in
 * guards.test.ts abgesichert, damit der Pfad nicht zurückkehrt.
 */
export const VARIANT_PROVIDER_KEY = 'provider';

/**
 * Auf welcher Druckposition diese Variante produziert wird ("default",
 * "front_large", …).
 *
 * WARUM ALS METAFIELD UND NICHT AUS DEM KATALOG ABGELEITET: die Provider-API
 * beantwortet eine andere Frage als die gestellte. Sie sagt, welche Placements
 * MÖGLICH sind — Variante 4025 liefert front, back, sleeve_left, sleeve_right,
 * embroidery_chest_left … — nicht, auf welches dieses Produkt druckt. Das ist
 * eine Designentscheidung, kein Katalogfakt.
 *
 * Eine Ableitung würde ausgerechnet beim Poster funktionieren, weil dort genau
 * ein druckbares Placement übrig bleibt, und beim Shirt unentscheidbar sein. Ein
 * Verfahren, das am degenerierten Fall richtig aussieht.
 *
 * ⚠️ KEIN DEFAULT. Vorher stand in der Dispatch-Route DEFAULT_PLACEMENT =
 * 'front_large' — ein DTG-Shirt-Placement, für jedes Poster still falsch. Der
 * Fehler wäre erst beim Provider aufgefallen, nicht im eigenen Code. Fehlt der
 * Wert, ist die Variante nicht erfüllbar (Hard Fail in normalize.ts).
 */
export const VARIANT_PLACEMENT_KEY = 'provider_placement';

/**
 * Zu welcher Marke das PRODUKT gehoert, zu dem diese Variante zaehlt.
 *
 * AUF DEM PRODUKT, nicht auf der Variante: eine Marke ist eine Eigenschaft des
 * Produkts. Varianten-Ebene wuerde "Variante A gehoert Marke X, Variante B
 * desselben Produkts Marke Y" darstellbar machen — ein Zustand, der nichts
 * bedeuten kann. Was nicht bedeutbar ist, soll nicht darstellbar sein.
 *
 * NICHT `vendor`. Shopifys vendor bedeutet Hersteller/Lieferant; bei
 * Print-on-Demand ist der semantisch KORREKTE Wert "Printful" — fuer jede Marke
 * derselbe. Wer das Feld richtig benutzt, laesst alle Marken zu einer
 * verschmelzen und der Marken-Waechter meldet still Einheitlichkeit. Dazu ist
 * vendor Freitext: "testbrand-a" und "Testbrand A" waeren zwei Marken und wuerden
 * eine legitime Order ablehnen. Ein Feld mit fremder Semantik zu ueberladen
 * heisst, dass sein richtiger Gebrauch unseren Gebrauch bricht.
 */
export const PRODUCT_BRAND_KEY = 'brand';

/** Was eine Variante über ihre Erfüllung aussagt. */
export interface VariantMapping {
  /**
   * Katalog-Varianten-ID beim Provider — OPAK, bewusst `string`.
   *
   * Printfuls ID ist heute numerisch, aber der Vertrag ist provider-agnostisch
   * und ein anderer POD-Anbieter kann alphanumerisch zählen. Die ID wird nie
   * berechnet, nur übergeben und verglichen. Die Umwandlung nach Zahl gehört an
   * die Provider-Grenze — und steht dort (providers/printful.ts).
   */
  catalogVariantId: string;
  /** Provider-Name, oder `null` → der Brand-Default aus brand.config greift. */
  provider: string | null;
  /**
   * Druckposition, oder `null` → NICHT erfüllbar.
   *
   * Die Asymmetrie zu `provider` ist beabsichtigt und der Kern dieses Vertrags:
   * beim Provider gibt es einen brandweit richtigen Default, beim Placement
   * nicht. Ein Placement ist produkttyp-spezifisch — was für das Shirt stimmt,
   * ist für das Poster falsch. Deshalb hier Hard Fail statt Rückfallwert.
   */
  placement: string | null;
  /**
   * Marke des Produkts, oder `null` → NICHT erfuellbar.
   *
   * Wie beim Placement Hard Fail statt Default: eine Order, deren Marke unbekannt
   * ist, ist keiner Buchhaltung und keinem Absender zuzuordnen.
   */
  brand: string | null;
}

/**
 * `null` bedeutet: kein Mapping hinterlegt — der Aufrufer MUSS das als harten
 * Fehler behandeln, niemals als "überspringen".
 */
export type VariantResolver = (shopifyVariantGid: string) => Promise<VariantMapping | null>;

const QUERY = /* GraphQL */ `
  query VariantFulfillmentMapping(
    $id: ID!
    $ns: String!
    $idKey: String!
    $providerKey: String!
    $placementKey: String!
    $brandKey: String!
  ) {
    node(id: $id) {
      ... on ProductVariant {
        id
        catalogVariantId: metafield(namespace: $ns, key: $idKey) {
          value
        }
        provider: metafield(namespace: $ns, key: $providerKey) {
          value
        }
        placement: metafield(namespace: $ns, key: $placementKey) {
          value
        }
        product {
          brand: metafield(namespace: $ns, key: $brandKey) {
            value
          }
        }
      }
    }
  }
`;

/**
 * Baut einen Resolver für EINEN bestimmten Store.
 *
 * Store als Pflichtparameter, kein deploymentStore()-Default: dieser Resolver ist
 * der einzige Fulfillment-Pfad, der gegen einen anderen als den Deployment-Store
 * laufen könnte. Ein Default wäre hier am gefährlichsten.
 *
 * ✅ VERIFIZIERT am 2026-08-12 gegen brainsells-pod-pool-dev, gegen echte
 * Varianten mit gesetzten Metafields. Bestätigt: die zwei aliasierten
 * `metafield`-Felder auf ProductVariant liefern beide Werte in EINEM Call
 * (`{catalogVariantId:"19526", provider:"printful"}`), und eine nicht
 * existierende Variante ergibt `node: null` → Resolver gibt `null` zurück, also
 * den Hard-Fail-Pfad. Kein Throw, keine Teilantwort.
 */
export function makeVariantResolver(store: ShopifyStore): VariantResolver {
  return async (shopifyVariantGid) => {
    const data = await shopifyAdminFetch<{
      node: {
        id: string;
        catalogVariantId: { value: string } | null;
        provider: { value: string } | null;
        placement: { value: string } | null;
        product: { brand: { value: string } | null } | null;
      } | null;
    }>(store, QUERY, {
      id: shopifyVariantGid,
      ns: brandConfig.fulfillment.metafieldNamespace,
      idKey: VARIANT_MAPPING_KEY,
      providerKey: VARIANT_PROVIDER_KEY,
      placementKey: VARIANT_PLACEMENT_KEY,
      brandKey: PRODUCT_BRAND_KEY,
    });

    const rawId = data.node?.catalogVariantId?.value?.trim();
    if (!rawId) return null;

    const rawProvider = data.node?.provider?.value?.trim();
    const rawPlacement = data.node?.placement?.value?.trim();
    const rawBrand = data.node?.product?.brand?.value?.trim();
    return {
      catalogVariantId: rawId,
      // Leerer String zählt als "nicht gesetzt". Sonst käme ein versehentlich
      // geleertes Metafield als Provider "" beim Router an und scheiterte dort
      // erst an der Allowlist — mit einer Meldung, die auf das falsche Problem zeigt.
      provider: rawProvider ? rawProvider : null,
      placement: rawPlacement ? rawPlacement : null,
      brand: rawBrand ? rawBrand : null,
    };
  };
}
