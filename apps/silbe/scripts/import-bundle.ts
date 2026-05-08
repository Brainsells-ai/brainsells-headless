/* eslint-disable no-console */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Bundle root: configurable via BUNDLE_DIR. Defaults to the canonical Downloads
// location used in the 2026-05-06 creatives bundle drop.
const BUNDLE_DIR =
  process.env.BUNDLE_DIR ??
  'C:\\Users\\Administrator\\Downloads\\silbe-creatives-bundle-2026-05-06\\silbe-creatives-bundle';

const APP_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(APP_ROOT, 'public');
const MANIFEST_OUT = path.join(APP_ROOT, 'lib', 'asset-manifest.ts');

// Status-Filter per MEGAPROMPT §0.3. live-in-store-winner (variant_A) is
// explicitly deprecated in asset-mapping.md §4.1 and excluded.
const ALLOWED_STATUS = new Set(['live-candidate', 'polished']);

// Lasker-Schüler is archived (Mai 2026 decision, vocabulary.md §6).
const HARD_BANS = ['lasker-schueler', 'lasker_schueler'];

type Category = 'mockups' | 'og' | 'brand' | 'textures' | 'stimmen' | 'werkstatt';

type BundleEntry = {
  bundle_path: string;
  filename: string;
  format: string;
  dimensions?: [number, number];
  status: string;
  purpose?: string;
};

type EmittedAsset = {
  category: Category;
  key: string;
  source: string;
  base: string;
  ext: 'jpg' | 'png' | 'svg';
  width?: number;
  height?: number;
  variants: { avif?: string; webp?: string; original: string };
};

function categorize(bundlePath: string): Category | null {
  const p = bundlePath.replace(/\\/g, '/').toLowerCase();
  if (p.includes('mockups-v3-composites')) return 'mockups';
  if (p.includes('og-cards')) return 'og';
  if (p.includes('brand-assets')) return 'brand';
  if (p.includes('recraft-svgs/textures')) return 'textures';
  if (p.includes('p4-polished-editorial')) return 'stimmen';
  if (p.includes('about-triptych-deployed')) return 'werkstatt';
  return null;
}

function deriveKey(filename: string): string {
  return filename
    .replace(/\.(jpe?g|png|svg)$/i, '')
    .replace(/^silbe-/, '')
    .replace(/^bio-/, '')
    .replace(/^brand-/, '')
    .replace(/^about-triptych-/, 'triptych-')
    .replace(/^og-card-/, 'og-')
    .toLowerCase();
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

async function processRaster(srcPath: string, destBase: string, ext: 'jpg' | 'png'): Promise<{ width: number; height: number }> {
  const buf = await fs.readFile(srcPath);
  const meta = await sharp(buf).metadata();
  await sharp(buf).toFile(`${destBase}.${ext}`);
  await sharp(buf).avif({ quality: 70 }).toFile(`${destBase}.avif`);
  await sharp(buf).webp({ quality: 85 }).toFile(`${destBase}.webp`);
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

async function copySvg(srcPath: string, destBase: string): Promise<void> {
  await fs.copyFile(srcPath, `${destBase}.svg`);
}

async function main() {
  const manifestPath = path.join(BUNDLE_DIR, 'manifest.json');
  console.log(`[import-bundle] reading ${manifestPath}`);
  const raw = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as { entries: BundleEntry[] };

  const allowed = raw.entries.filter((e) => ALLOWED_STATUS.has(e.status));
  console.log(`[import-bundle] ${raw.entries.length} total entries, ${allowed.length} after status filter`);

  const emitted: EmittedAsset[] = [];
  let skippedBanned = 0;
  let skippedUncategorized = 0;

  for (const entry of allowed) {
    if (HARD_BANS.some((ban) => entry.filename.toLowerCase().includes(ban))) {
      skippedBanned += 1;
      continue;
    }
    const category = categorize(entry.bundle_path);
    if (!category) {
      skippedUncategorized += 1;
      continue;
    }

    const targetDir = path.join(PUBLIC_DIR, category);
    await ensureDir(targetDir);
    const key = deriveKey(entry.filename);
    const destBase = path.join(targetDir, key);
    const srcPath = path.join(BUNDLE_DIR, entry.bundle_path);

    const ext = entry.format.toLowerCase();
    if (ext === 'jpg' || ext === 'jpeg') {
      const dims = await processRaster(srcPath, destBase, 'jpg');
      emitted.push({
        category,
        key,
        source: entry.bundle_path,
        base: `/${category}/${key}`,
        ext: 'jpg',
        width: dims.width,
        height: dims.height,
        variants: {
          original: `/${category}/${key}.jpg`,
          webp: `/${category}/${key}.webp`,
          avif: `/${category}/${key}.avif`,
        },
      });
    } else if (ext === 'png') {
      const dims = await processRaster(srcPath, destBase, 'png');
      emitted.push({
        category,
        key,
        source: entry.bundle_path,
        base: `/${category}/${key}`,
        ext: 'png',
        width: dims.width,
        height: dims.height,
        variants: {
          original: `/${category}/${key}.png`,
          webp: `/${category}/${key}.webp`,
          avif: `/${category}/${key}.avif`,
        },
      });
    } else if (ext === 'svg') {
      await copySvg(srcPath, destBase);
      emitted.push({
        category,
        key,
        source: entry.bundle_path,
        base: `/${category}/${key}`,
        ext: 'svg',
        variants: { original: `/${category}/${key}.svg` },
      });
    } else {
      console.warn(`[import-bundle] unhandled format "${ext}" for ${entry.filename}`);
    }
  }

  await ensureDir(path.dirname(MANIFEST_OUT));
  await fs.writeFile(MANIFEST_OUT, renderManifest(emitted), 'utf8');

  const counts = emitted.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[import-bundle] emitted: ${JSON.stringify(counts)}`);
  console.log(`[import-bundle] skipped: ${skippedBanned} banned, ${skippedUncategorized} uncategorized`);
  console.log(`[import-bundle] manifest: ${MANIFEST_OUT}`);
}

function renderManifest(emitted: EmittedAsset[]): string {
  const grouped = emitted.reduce<Record<string, EmittedAsset[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a);
    return acc;
  }, {});

  const sections = Object.entries(grouped)
    .map(([category, list]) => {
      const items = list
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((a) => {
          const meta: Record<string, unknown> = {
            ...a.variants,
            source: a.source.replace(/\\/g, '/'),
          };
          if (a.width && a.height) {
            meta.width = a.width;
            meta.height = a.height;
          }
          return `    ${JSON.stringify(a.key)}: ${JSON.stringify(meta)}`;
        })
        .join(',\n');
      return `  ${category}: {\n${items},\n  }`;
    })
    .join(',\n');

  return `// AUTO-GENERATED by scripts/import-bundle.ts. Do not edit by hand.
// Source: docs/asset-mapping.md (canonical) — re-run \`pnpm import:bundle\` to refresh.

export const assetManifest = {
${sections},
} as const;

export type AssetCategory = keyof typeof assetManifest;
export type AssetManifest = typeof assetManifest;
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
