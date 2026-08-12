// ███ UNERREICHT — DIESES MODUL LAEUFT NICHT ███
//
// Kein Einstiegspunkt fuehrt hierher. Weder eine Route noch ein Script ruft
// dieses Modul auf; die einzigen Aufrufer sind Tests. Die gruenen Tests belegen,
// dass die Funktionen ARBEITEN — nicht, dass sie LAUFEN.
//
// Das ist keine Fussnote. Das Druckdatei-Gate war das Kernversprechen von PR #78
// und ist eine Attrappe, solange nichts es aufruft. Verschaerfend: die zwei
// Fehler, die 2026-08-12 in fetchPlacementSpec gefunden wurden, waren durch das
// Totsein KONSERVIERT — einer stand im eigenen Fehlertext, der andere direkt
// unter einem Kommentar, der woertlich davor warnt. Was nie laeuft, kann nicht
// auffallen und verrottet trotzdem.
//
// Verdrahtung haengt an der Rasterisierung und an der Hosting-Entscheidung fuer
// Modell B (extern erreichbare Druckdatei-URL). Eigener Vorgang.
// Abgesichert durch den Erreichbarkeits-Waechter in guards.test.ts
// (KNOWN_UNREACHED) — dieses Modul kann nicht still verdrahtet ODER still
// weiter vergessen werden.
// ██████████████████████████████████████████████

// THE single place where non-provider-declared print rules live.
//
// Gate decision (b), 2026-08-06: the validation gate is HYBRID.
//   - data-driven, read from the provider catalog: placement geometry, techniques
//   - hard-coded here: allowed file formats, DPI floor, bleed / safe area, size cap
//
// Merlin's condition: the allowlist lives at ONE place with a comment on the
// documented contradiction. Do not scatter these constants across provider files.
// A provider may READ from here; it must never define its own competing values.
//
// ---------------------------------------------------------------------------
// Why the formats are hard-coded — the contradiction, stated rather than smoothed
// ---------------------------------------------------------------------------
// Printful's file-type documentation lists JPEG, PNG and SVG as supported, with a
// dedicated 20 MB cap for SVG (a dedicated cap implies a real, separate code path
// on their side). Printful's DTG guide, however, says "Save the file as a PNG",
// never mentions SVG at all, and justifies PNG by DTG's transparency requirement.
//
// Verified empirically 2026-08-06 against the live v2 API: the catalog response
// declares NO accepted-format field anywhere — not on catalog-products, not on
// catalog-variants, not on mockup-templates. The API neither permits nor forbids
// a format. So the contradiction cannot be resolved from the API, and there is
// nothing to be data-driven about. Hence: house allowlist, deliberately narrow.
//
// Our resolution: SVG is the MASTER format, PNG is the DELIVERY format. We never
// hand an SVG to a provider. Two independent reasons:
//   1. An SVG has no inherent DPI, so a "minimum DPI" gate on an SVG is undefined
//      — the check would silently pass on everything, which is exactly the
//      failure class this sprint exists to avoid.
//   2. SVG carries the same unpredictability Printful explicitly warns about for
//      PDF (fonts, filters, embedded raster, blend modes → unpredictable output).

/**
 * Formats we are willing to HAND TO a provider, after rasterisation.
 * JPEG is intentionally absent for DTG: it cannot carry transparency, and DTG
 * without transparency prints a white box around the artwork.
 */
export const ALLOWED_DELIVERY_FORMATS = ['png'] as const;

/**
 * Formats we accept as design MASTERS on the way in. SVG belongs here and only
 * here — it is rasterised before it ever reaches a provider.
 */
export const ALLOWED_MASTER_FORMATS = ['svg', 'png'] as const;

/**
 * Absolute floor. Below this the gate hard-fails; there is no "warn and ship".
 *
 * 🔴 NOT provider-declared. Verified 2026-08-06: `"dpi"` appears in NO Printful
 * v2 catalog response (catalog-products, catalog-variants, mockup-templates).
 * The v2 documentation shows an example `"dpi": 150` — that field does not exist
 * in the live payloads. This was originally scoped as a data-driven value; the
 * spike moved it here. Printful documents 150 DPI as the minimum for most
 * products and 300 DPI for a subset (posters, phone cases, stickers).
 */
export const MIN_DPI = 150;

/**
 * What we render to by default. Higher than the floor on purpose: rasterising a
 * vector master costs nothing in quality, so we render at the better of the two
 * and keep headroom for products that require 300.
 */
export const TARGET_DPI = 300;

/**
 * Per-technique DPI floors, where a technique is known to need more than MIN_DPI.
 * Keys are provider technique tokens as returned by the catalog.
 */
export const MIN_DPI_BY_TECHNIQUE: Readonly<Record<string, number>> = {
  dtg: 150,
  dtfilm: 150,
  // Embroidery is digitised from artwork rather than printed; a raster DPI floor
  // is not the governing constraint there. Listed so the lookup is explicit
  // rather than silently falling through to MIN_DPI.
  embroidery: 150,
};

/**
 * Hard cap on a delivered print file.
 *
 * 🔴 NOT provider-declared by the API. Documented by Printful as 100 MB for
 * PNG/JPEG (and 20 MB for SVG, which we never deliver). We cap well below the
 * documented ceiling because a file that large almost always means a mistake in
 * the rasterise step, and discovering that at the provider is too late.
 */
export const MAX_DELIVERY_BYTES = 40 * 1024 * 1024;

/**
 * Safe-area inset, in inches, applied inside the printable placement.
 *
 * 🔴 HOUSE RULE — not provider-declared and not derivable from the catalog.
 * 1/8" is the common print convention for keeping content away from an edge that
 * may shift during production. Revisit per product family before a brand goes
 * live; it is deliberately a single named constant so that revisit is one edit.
 */
export const SAFE_AREA_INSET_IN = 0.125;

/**
 * Bleed, in inches.
 *
 * Zero by design for garment DTG: bleed exists for products that are TRIMMED
 * after printing (paper, stickers). A DTG placement is printed inside a fixed
 * area on an already-finished garment — there is no trim, so bleed would only
 * shrink the usable area. Paper products, if a brand adds them later, need their
 * own value here rather than a silent reuse of this one.
 */
export const BLEED_IN = 0;

/** Pixel dimensions a print file must have for a given placement and DPI. */
export interface TargetRaster {
  widthPx: number;
  heightPx: number;
  dpi: number;
}

/**
 * Turns placement geometry (inches, from the catalog) into target pixels.
 * This is the step that makes DPI defined at all — before rasterisation there is
 * no such thing as the DPI of a vector master.
 *
 * Rounds UP: a fractional pixel that rounds down would put the raster marginally
 * below the required DPI, which the gate would then reject for a rounding error.
 */
export function targetRasterFor(
  widthIn: number,
  heightIn: number,
  dpi: number = TARGET_DPI,
): TargetRaster {
  if (!(widthIn > 0) || !(heightIn > 0)) {
    throw new Error(
      `[print-spec] placement geometry must be positive, got ${widthIn}x${heightIn} in`,
    );
  }
  if (!(dpi > 0)) {
    throw new Error(`[print-spec] dpi must be positive, got ${dpi}`);
  }
  return {
    widthPx: Math.ceil(widthIn * dpi),
    heightPx: Math.ceil(heightIn * dpi),
    dpi,
  };
}

/** Effective DPI a raster achieves when printed across a physical size. */
export function effectiveDpi(pixels: number, inches: number): number {
  if (!(inches > 0)) {
    throw new Error(`[print-spec] inches must be positive, got ${inches}`);
  }
  return pixels / inches;
}

/** The DPI floor that applies to a technique. */
export function minDpiFor(technique: string): number {
  return MIN_DPI_BY_TECHNIQUE[technique] ?? MIN_DPI;
}
