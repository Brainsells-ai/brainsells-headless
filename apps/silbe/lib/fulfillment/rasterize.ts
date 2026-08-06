// SVG master → PNG delivery raster.
//
// This is the step that makes the validation gate meaningful. A vector master has
// no DPI; only after rendering into a pixel target computed from the placement
// geometry (inches from the catalog) x a chosen DPI does "minimum DPI" mean
// anything. Gate decision (a), 2026-08-06.
//
// No quality is lost by rasterising: we render FROM vector INTO the computed
// target resolution, rather than resampling an existing raster.
//
// Uses `sharp`, already a dependency of this app (^0.33.0) — no new dependency.

import sharp from 'sharp';
import { TARGET_DPI, targetRasterFor } from './print-spec';
import type { PlacementSpec, PrintFile } from './types';

export interface RasterResult {
  /** PNG bytes, ready to be uploaded to wherever the provider will fetch them. */
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

/**
 * Renders an SVG master to a PNG sized exactly for a placement.
 *
 * CAVEAT, deliberately not hidden: sharp rasterises SVG through librsvg, which
 * does not resolve external fonts or the full SVG filter set. A master that
 * relies on a system font renders with a substitute, and the output will look
 * wrong without erroring. Masters must therefore carry outlined text. This is
 * the same class of unpredictability that keeps SVG out of the delivery formats
 * (see print-spec.ts) — rasterising here narrows it but does not remove it.
 */
export async function rasterizeSvgForPlacement(
  svg: Buffer | string,
  placement: PlacementSpec,
  dpi: number = TARGET_DPI,
): Promise<RasterResult> {
  const target = targetRasterFor(placement.widthIn, placement.heightIn, dpi);
  const input = typeof svg === 'string' ? Buffer.from(svg) : svg;

  const buffer = await sharp(input, { density: dpi })
    .resize(target.widthPx, target.heightPx, {
      // `contain` preserves the master's aspect ratio and pads rather than
      // distorting it. A distorted print is worse than a padded one, and the
      // padding is transparent so DTG prints nothing there.
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    // Transparency is mandatory for DTG — see print-spec.ts on why JPEG is out.
    .png()
    .toBuffer();

  const meta = await sharp(buffer).metadata();
  if (meta.width !== target.widthPx || meta.height !== target.heightPx) {
    // Fail loudly rather than returning a raster that the gate would then have
    // to catch. If sharp did not produce what we asked for, something is wrong
    // with the input, not with the expectation.
    throw new Error(
      `[rasterize] expected ${target.widthPx}x${target.heightPx}px, ` +
        `sharp produced ${meta.width}x${meta.height}px`,
    );
  }

  return {
    buffer,
    widthPx: target.widthPx,
    heightPx: target.heightPx,
    dpi: target.dpi,
  };
}

/** Describes an already-uploaded raster so the gate can judge it. */
export function describePrintFile(
  url: string,
  raster: RasterResult,
): PrintFile {
  return {
    url,
    widthPx: raster.widthPx,
    heightPx: raster.heightPx,
    format: 'png',
    bytes: raster.buffer.byteLength,
  };
}
