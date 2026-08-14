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

// HARD-FAIL print-file gate.
//
// Design rule for this file: it throws or it returns. There is no third outcome.
// No warning path, no "best effort", no silent downscale, and explicitly no trust
// in a provider's auto-enhance — a provider silently "fixing" a file means the
// customer receives something nobody reviewed.
//
// The rule comes from a documented pattern, not from taste. The Schicht-0
// throwaway fork found the same failure class three times: a silent `silbe.at`
// fallback that masked a missing env (Leck #1), a correctly-set METADATA_BASE_URL
// that had no effect and reported nothing (Gap #10), and a Stape container that
// auto-disabled without a signal. In every case the system looked healthy while
// being wrong. A print gate that warns instead of failing would be the fourth.

import {
  ALLOWED_DELIVERY_FORMATS,
  MAX_DELIVERY_BYTES,
  effectiveDpi,
  minDpiFor,
} from './print-spec';
import type { PlacementSpec, PrintFile, ValidationFailure } from './types';

/** Thrown when a print file is not fit to be handed to a provider. */
export class PrintFileRejected extends Error {
  readonly failures: ValidationFailure[];

  constructor(failures: ValidationFailure[], context: string) {
    super(
      `[fulfillment] print file rejected for ${context}: ` +
        failures.map((f) => `${f.code} — ${f.message}`).join(' | '),
    );
    this.name = 'PrintFileRejected';
    this.failures = failures;
  }
}

/**
 * Collects every reason a file is unfit. Returns an empty array when the file
 * passes. Collecting rather than short-circuiting is deliberate: a caller fixing
 * a file should see all problems at once, not one per round trip.
 */
export function collectPrintFileFailures(
  file: PrintFile,
  placement: PlacementSpec,
  opts: { dimensionTolerancePx?: number } = {},
): ValidationFailure[] {
  const failures: ValidationFailure[] = [];
  // A tolerance exists only to absorb the ceil() in targetRasterFor, never to
  // wave through a file that is meaningfully the wrong size.
  const tolerance = opts.dimensionTolerancePx ?? 1;

  const format = file.format.toLowerCase();
  if (!(ALLOWED_DELIVERY_FORMATS as readonly string[]).includes(format)) {
    failures.push({
      code: 'FORMAT_NOT_ALLOWED',
      message:
        `format "${format}" is not a delivery format ` +
        `(allowed: ${ALLOWED_DELIVERY_FORMATS.join(', ')}). ` +
        'Vector masters must be rasterised before delivery.',
    });
  }

  if (file.bytes > MAX_DELIVERY_BYTES) {
    failures.push({
      code: 'FILE_TOO_LARGE',
      message: `${file.bytes} bytes exceeds cap of ${MAX_DELIVERY_BYTES} bytes`,
    });
  }

  const floor = minDpiFor(placement.technique);
  const dpiX = effectiveDpi(file.widthPx, placement.widthIn);
  const dpiY = effectiveDpi(file.heightPx, placement.heightIn);
  const achieved = Math.min(dpiX, dpiY);
  if (achieved < floor) {
    failures.push({
      code: 'BELOW_MIN_DPI',
      message:
        `${file.widthPx}x${file.heightPx}px across ` +
        `${placement.widthIn}x${placement.heightIn}in yields ${achieved.toFixed(1)} DPI, ` +
        `below the ${floor} DPI floor for technique "${placement.technique}"`,
    });
  }

  // Size check against the placement, independent of the DPI check: a
  // file can clear the DPI floor and still be the wrong shape for the placement.
  const expectedW = Math.ceil(placement.widthIn * achieved);
  const expectedH = Math.ceil(placement.heightIn * achieved);
  if (
    Math.abs(file.widthPx - expectedW) > tolerance ||
    Math.abs(file.heightPx - expectedH) > tolerance
  ) {
    failures.push({
      code: 'DIMENSIONS_MISMATCH',
      message:
        `${file.widthPx}x${file.heightPx}px does not match placement ` +
        `"${placement.placement}" (${placement.widthIn}x${placement.heightIn}in); ` +
        `expected ~${expectedW}x${expectedH}px at ${achieved.toFixed(1)} DPI`,
    });
  }

  return failures;
}

/**
 * The gate. Throws `PrintFileRejected` on any failure, returns `void` on pass.
 * Callers must not catch this to continue — if it throws, the order does not go
 * out. That is the point.
 */
export function assertPrintFileValid(
  file: PrintFile,
  placement: PlacementSpec,
  opts: { dimensionTolerancePx?: number } = {},
): void {
  const failures = collectPrintFileFailures(file, placement, opts);
  if (failures.length > 0) {
    throw new PrintFileRejected(failures, `placement "${placement.placement}"`);
  }
}
