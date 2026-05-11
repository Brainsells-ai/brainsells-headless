/* eslint-disable no-console */
import { promises as fs } from 'node:fs';
import path from 'node:path';

// docs/vocabulary.md §7 — verbotene Phrasen.
// Matched case-insensitive as substrings. Order is preserved for deterministic
// reporting; longer phrases come first so "Limited Edition" matches before
// "limited" if both were on the list.
const FORBIDDEN: { pattern: string; reason: string }[] = [
  { pattern: 'Limitierte Edition', reason: 'limitiert verboten — siehe vocabulary.md §3' },
  { pattern: 'Limitierte Erstauflage', reason: 'Auflage-Tracking verboten — siehe vocabulary.md §3' },
  { pattern: 'Limited Edition', reason: 'Englisch + UWG-angreifbar bei PoD' },
  { pattern: 'limited edition', reason: 'Englisch + UWG-angreifbar bei PoD' },
  { pattern: 'Numbered Edition', reason: 'Stückzahl-Tracking verboten' },
  { pattern: 'limitiert', reason: 'limitiert verboten — siehe vocabulary.md §3' },
  { pattern: 'handgesetzt', reason: 'Bleisatz-Konnotation, faktisch falsch (Gelato druckt digital)' },
  { pattern: 'handgedruckt', reason: 'faktisch falsch — Gelato druckt digital' },
  { pattern: 'handnummeriert', reason: 'bei PoD nicht der Fall, faktisch falsch' },
  { pattern: 'Wir prüfen jedes Blatt selbst', reason: 'Ihr seht die Drucke nie — UWG §5' },
  { pattern: 'Atelier verlässt', reason: 'Es gibt kein physisches Atelier' },
  { pattern: 'Buettenpapier', reason: 'faktisch falsch — Premium-Naturpapier statt Bütten' },
  { pattern: 'Büttenpapier', reason: 'faktisch falsch — Premium-Naturpapier statt Bütten' },
  { pattern: 'Edition X von Y', reason: 'Stückzahlen werden nicht getrackt' },
  { pattern: 'Auflage X / 200', reason: 'Stückzahlen werden nicht getrackt' },
  { pattern: 'Sold out', reason: 'Englisch — Replacement: "Vergriffen"' },
  { pattern: 'Subscription', reason: 'kein Abo angeboten — App-Rest' },
  { pattern: 'Cancellation Policy', reason: 'Englisch — Replacement: "Widerrufsrecht"' },
  { pattern: 'Bald wieder verfügbar', reason: 'entweder verfügbar oder "In Vorbereitung"' },
  { pattern: 'Coming soon', reason: 'Englisch — siehe vocabulary.md §3' },
  { pattern: 'kohlenstoffneutral', reason: 'UWG-angreifbar wenn nicht zertifiziert' },
  { pattern: 'klimaneutral', reason: 'UWG-angreifbar wenn nicht zertifiziert' },
  { pattern: 'Mission-A', reason: 'Interne Codename — niemals frontend-sichtbar' },
  { pattern: 'Mission-B', reason: 'Interne Codename — niemals frontend-sichtbar' },
  { pattern: 'Mission-C', reason: 'Interne Codename — niemals frontend-sichtbar' },
  { pattern: 'Mission-D', reason: 'Interne Codename — niemals frontend-sichtbar' },
  { pattern: 'Mission-E', reason: 'Interne Codename — niemals frontend-sichtbar' },
  { pattern: 'Mission-F', reason: 'Interne Codename — niemals frontend-sichtbar' },
  { pattern: 'Mission-G', reason: 'Interne Codename — niemals frontend-sichtbar' },
  { pattern: 'Wiener Stimmen', reason: 'geographisch falsch — siehe vocabulary.md §7' },
  { pattern: 'Lorem ipsum', reason: 'Theme-Default, niemals im Output' },
  { pattern: 'Pair text with an image', reason: 'Shopify-Theme-Default, niemals im Output' },
  { pattern: 'literally obsessed', reason: 'Influencer-Speak verboten' },
  { pattern: 'game-changer', reason: 'Influencer-Speak verboten' },
  { pattern: 'Newsletter abonnieren', reason: 'DTC-Ton — siehe vocabulary.md §10' },
  { pattern: 'Subscribe to our newsletter', reason: 'Englisch — siehe vocabulary.md §10' },
  { pattern: 'Erhalten Sie Updates', reason: 'Marketing-Sprache — siehe vocabulary.md §10' },
  { pattern: 'Bleiben Sie informiert', reason: 'Banal — siehe vocabulary.md §10' },
];

const DEFAULT_ROOTS = ['app', 'components', 'lib', 'scripts'];
const DEFAULT_EXTENSIONS = new Set(['.ts', '.tsx', '.mdx', '.md']);
// Auto-generated and third-party files MUST be excluded — they may quote
// vocabulary docs or include source paths that contain banned words verbatim.
const SELF_EXEMPT = new Set([
  path.join('scripts', 'content-lint.ts'),
  path.join('lib', 'asset-manifest.ts'),
]);

type Finding = { file: string; line: number; col: number; pattern: string; reason: string; excerpt: string };

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.next')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      const ext = path.extname(entry.name);
      if (DEFAULT_EXTENSIONS.has(ext)) yield full;
    }
  }
}

function findInText(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const lower = text.toLowerCase();
  const lines = text.split(/\r?\n/);
  for (const { pattern, reason } of FORBIDDEN) {
    const needle = pattern.toLowerCase();
    let from = 0;
    while (true) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      // Resolve idx → line/col.
      let cursor = 0;
      let line = 0;
      while (line < lines.length && cursor + lines[line].length < idx) {
        cursor += lines[line].length + 1;
        line += 1;
      }
      const col = idx - cursor;
      const lineText = lines[line] ?? '';
      findings.push({ file, line: line + 1, col: col + 1, pattern, reason, excerpt: lineText.trim() });
      from = idx + needle.length;
    }
  }
  return findings;
}

// Vocab §4 — deutsche Anführungszeichen: opening „ (U+201E) must close with
// " (U+201C), never with " (U+0022). Per-line heuristic: if a line contains
// U+201E AND U+0022, the U+0022 is treated as a wrong closing. JSON-array
// preview strings in TODO_AUTHOR comments (no U+201E on the same line) are
// safe by construction.
function findGermanQuoteMisuse(file: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const opens = [...line].some((c) => c.codePointAt(0) === 0x201e);
    if (!opens) continue;
    for (let j = 0; j < line.length; j++) {
      if (line.charCodeAt(j) === 0x22) {
        findings.push({
          file,
          line: i + 1,
          col: j + 1,
          pattern: 'U+0022 closing in German-quote context',
          reason: 'Use U+201C (right double quotation mark) to close German quotes — siehe vocabulary.md §4',
          excerpt: line.trim(),
        });
      }
    }
  }
  return findings;
}

async function lintFile(absPath: string, relativeFrom: string): Promise<Finding[]> {
  const text = await fs.readFile(absPath, 'utf8');
  const rel = path.relative(relativeFrom, absPath);
  if (SELF_EXEMPT.has(rel)) return [];
  return [...findInText(rel, text), ...findGermanQuoteMisuse(rel, text)];
}

async function main() {
  const cwd = process.cwd();
  const args = process.argv.slice(2);

  const targets: string[] = [];
  if (args.length > 0) {
    for (const arg of args) targets.push(path.resolve(arg));
  } else {
    for (const root of DEFAULT_ROOTS) {
      const abs = path.resolve(cwd, root);
      try {
        const stat = await fs.stat(abs);
        if (stat.isDirectory()) {
          for await (const file of walk(abs)) targets.push(file);
        }
      } catch {
        // root does not exist yet (e.g. components/) — skip silently.
      }
    }
  }

  const findings: Finding[] = [];
  for (const target of targets) {
    const stat = await fs.stat(target).catch(() => null);
    if (!stat) {
      console.error(`[lint:content] not found: ${target}`);
      process.exit(2);
    }
    if (stat.isDirectory()) {
      for await (const file of walk(target)) {
        findings.push(...(await lintFile(file, cwd)));
      }
    } else {
      findings.push(...(await lintFile(target, cwd)));
    }
  }

  if (findings.length === 0) {
    console.log(`[lint:content] OK — ${targets.length} target(s) scanned, no forbidden phrases.`);
    process.exit(0);
  }

  console.error(`[lint:content] FAIL — ${findings.length} forbidden phrase(s) found:`);
  for (const f of findings) {
    console.error(`  ${f.file}:${f.line}:${f.col}  "${f.pattern}" forbidden — ${f.reason}`);
    console.error(`    > ${f.excerpt}`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
