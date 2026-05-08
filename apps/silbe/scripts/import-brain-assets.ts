/* eslint-disable no-console */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// Brain repo path is configurable via BRAIN_DIR. Defaults to the canonical
// location described in docs/setup-status.md.
const BRAIN_DIR =
  process.env.BRAIN_DIR ?? 'C:\\Users\\Administrator\\Developer\\brainsells-brain';

const APP_ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(APP_ROOT, 'public');

const SKU_SRC = path.join(BRAIN_DIR, 'cowork', 'outputs', 'sku-png-v3');
const PORTRAITS_SRC = path.join(BRAIN_DIR, 'cowork', 'outputs', 'silbe-day5', 'author-portraits');
const LOGOS_SRC = path.join(BRAIN_DIR, 'cowork', 'outputs', 'logos-final');
const DAY5_SRC = path.join(BRAIN_DIR, 'cowork', 'outputs', 'silbe-day5');

// Lasker-Schüler ist seit Mai 2026 archiviert — niemals importieren.
const HARD_BANS = ['lasker', 'lasker-schueler', 'lasker_schueler'];

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function isBanned(filename: string): boolean {
  const f = filename.toLowerCase();
  return HARD_BANS.some((ban) => f.includes(ban));
}

async function copyPng(srcPath: string, destBase: string): Promise<void> {
  const buf = await fs.readFile(srcPath);
  await sharp(buf).toFile(`${destBase}.png`);
  await sharp(buf).avif({ quality: 70 }).toFile(`${destBase}.avif`);
  await sharp(buf).webp({ quality: 85 }).toFile(`${destBase}.webp`);
}

async function copyJpg(srcPath: string, destBase: string): Promise<void> {
  const buf = await fs.readFile(srcPath);
  await sharp(buf).toFile(`${destBase}.jpg`);
  await sharp(buf).avif({ quality: 70 }).toFile(`${destBase}.avif`);
  await sharp(buf).webp({ quality: 85 }).toFile(`${destBase}.webp`);
}

async function copyRaw(srcPath: string, destPath: string): Promise<void> {
  await fs.copyFile(srcPath, destPath);
}

async function importProducts(): Promise<number> {
  const dest = path.join(PUBLIC_DIR, 'products');
  await ensureDir(dest);
  // Print-quality PNGs are passed through unmodified — next/image generates
  // optimized variants on-demand, and Shopify CDN takes over once SKUs ship.
  const entries = await fs.readdir(SKU_SRC);
  let count = 0;
  for (const file of entries) {
    if (!file.toLowerCase().endsWith('.png')) continue;
    if (isBanned(file)) continue;
    await copyRaw(path.join(SKU_SRC, file), path.join(dest, file));
    count += 1;
  }
  console.log(`[brain] products: ${count} SKUs imported to /public/products`);
  return count;
}

async function importAuthors(): Promise<number> {
  const dest = path.join(PUBLIC_DIR, 'authors');
  await ensureDir(dest);
  let count = 0;
  const entries = await fs.readdir(PORTRAITS_SRC);
  for (const file of entries) {
    if (!file.toLowerCase().match(/\.(jpe?g|png)$/)) continue;
    if (isBanned(file)) continue;
    const base = file.replace(/\.(jpe?g|png)$/i, '');
    if (file.toLowerCase().endsWith('.png')) {
      await copyPng(path.join(PORTRAITS_SRC, file), path.join(dest, base));
    } else {
      await copyJpg(path.join(PORTRAITS_SRC, file), path.join(dest, base));
    }
    count += 1;
  }

  // Wikimedia PD attribution stub — fill in later when sources are confirmed.
  const credits = {
    rilke: { source: 'Wikimedia Commons', license: 'Public Domain', url: '' },
    kafka: { source: 'Wikimedia Commons', license: 'Public Domain', url: '' },
    mann: { source: 'Wikimedia Commons', license: 'Public Domain', url: '' },
    zweig: { source: 'Wikimedia Commons', license: 'Public Domain', url: '' },
    'ebner-eschenbach': { source: 'Wikimedia Commons', license: 'Public Domain', url: '' },
  };
  await fs.writeFile(path.join(dest, '_credits.json'), JSON.stringify(credits, null, 2), 'utf8');

  console.log(`[brain] authors: ${count} portraits imported to /public/authors`);
  return count;
}

async function importLogos(): Promise<number> {
  const dest = path.join(PUBLIC_DIR, 'brand');
  await ensureDir(dest);
  // HOT 2 is Aleks-canonical per asset-mapping.md §2.7. HOT 1 is the stamp-mark
  // variant, kept for footer/seal usage. We import every variant so future
  // surfaces can pick between them without re-running this script.
  const entries = await fs.readdir(LOGOS_SRC);
  let count = 0;
  for (const file of entries) {
    if (!file.toLowerCase().endsWith('.png')) continue;
    const base = `wordmark-${file.replace(/\.png$/i, '').toLowerCase()}`;
    await copyPng(path.join(LOGOS_SRC, file), path.join(dest, base));
    count += 1;
  }
  console.log(`[brain] logos: ${count} wordmark variants imported to /public/brand`);
  return count;
}

async function importFavicon(): Promise<void> {
  // app/favicon.ico is the Next.js App Router metadata-file convention and
  // takes precedence over public/favicon.ico — overwrite the default scaffold.
  const sources = [
    { src: path.join(DAY5_SRC, 'favicon.ico'), dest: path.join(APP_ROOT, 'app', 'favicon.ico') },
    { src: path.join(DAY5_SRC, 'apple-touch-icon-192.png'), dest: path.join(PUBLIC_DIR, 'apple-touch-icon-192.png') },
    { src: path.join(DAY5_SRC, 'apple-touch-icon-512.png'), dest: path.join(PUBLIC_DIR, 'apple-touch-icon-512.png') },
  ];
  for (const { src, dest } of sources) {
    try {
      await copyRaw(src, dest);
      console.log(`[brain] favicon: copied ${path.basename(src)}`);
    } catch (err) {
      console.warn(`[brain] favicon: missing ${path.basename(src)} (${(err as Error).message})`);
    }
  }
}

async function main() {
  console.log(`[brain] importing from ${BRAIN_DIR}`);
  const products = await importProducts();
  await importAuthors();
  await importLogos();
  await importFavicon();
  console.log(`[brain] done — products: ${products}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
