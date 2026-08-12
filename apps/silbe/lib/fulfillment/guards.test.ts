// Struktur-Wächter für das Fulfillment-Modul.
//
// Diese Datei testet kein Verhalten, sondern zwei EIGENSCHAFTEN, die still
// verlorengehen können — und beide sind schon einmal genau so verlorengegangen:
//
//   1. Kein Env-Zugriff auf MODUL-EBENE. Turbo läuft mit envMode=strict und
//      entfernt undeklarierte Variablen aus der Build-Umgebung. Liest ein Modul
//      seine Config beim Import, wird sie zur Build-Anforderung — und fehlt sie,
//      bricht der Build oder, schlimmer, ein Default greift still. Genau das war
//      Gap #10, und im Recon (R5) war der gute Zustand nur ein ZUSTAND, keine
//      Garantie: es gab keinen Wächter im Code.
//
//   2. Kein Confirm-Aufruf gegen den Provider. Provider-Orders entstehen in
//      diesem Sprint ausschließlich als Draft. Ein versehentlich ergänzter
//      Confirm-Call würde echtes Geld ausgeben und Produktion auslösen.
//
// Doku schützt den, der sie liest. Ein Test schützt auch den, der sie nicht liest.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const FULFILLMENT_DIR = path.resolve(__dirname);
const EXTRA_FILES = [
  path.resolve(__dirname, '../../app/api/webhooks/fulfillment-dispatch/route.ts'),
  path.resolve(__dirname, '../../app/api/webhooks/fulfillment/[provider]/route.ts'),
];

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...collectSourceFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts') || entry.endsWith('.test.ts')) continue;
    out.push(full);
  }
  return out;
}

const FILES = [...collectSourceFiles(FULFILLMENT_DIR), ...EXTRA_FILES];

/**
 * Wird dieser Knoten beim IMPORT ausgewertet? Wir laufen die Eltern hoch: trifft
 * man zuerst auf eine Funktion (inkl. Getter und Methode), ist der Ausdruck lazy;
 * erreicht man die SourceFile, läuft er zur Modul-Ladezeit.
 *
 * Bewusst AST statt Regex: `const x = process.env.FOO` und
 * `function f() { return process.env.FOO }` sind textlich fast gleich und
 * semantisch das Gegenteil. Ein Regex, der das unterscheidet, wäre rateweise.
 */
function runsAtImportTime(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isGetAccessorDeclaration(current) ||
      ts.isSetAccessorDeclaration(current) ||
      ts.isConstructorDeclaration(current)
    ) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

interface Finding {
  file: string;
  line: number;
  text: string;
}

function findImportTimeConfigReads(file: string): Finding[] {
  const source = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true);
  const findings: Finding[] = [];

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const text = node.getText(sf);
      const isConfigRead = /(^|[^A-Za-z0-9_])process\.env\b/.test(text) || /^brandConfig\./.test(text);
      if (isConfigRead && runsAtImportTime(node)) {
        findings.push({
          file: path.relative(FULFILLMENT_DIR, file),
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          text: text.split('\n')[0].slice(0, 90),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return findings;
}

describe('Fulfillment-Module lesen keine Config beim Import', () => {
  it('findet überhaupt Dateien zum Prüfen', () => {
    // Ohne diesen Assert wäre ein leerer Glob ein stilles Bestanden — genau die
    // Fehlerklasse, gegen die diese Datei geschrieben ist.
    expect(FILES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(FILES.map((f) => [path.relative(FULFILLMENT_DIR, f), f] as const))(
    '%s liest process.env / brandConfig nur innerhalb von Funktionen',
    (_label, file) => {
      const findings = findImportTimeConfigReads(file);
      const rendered = findings.map((f) => `  ${f.file}:${f.line}  ${f.text}`).join('\n');
      expect(
        findings,
        findings.length
          ? `Config-Zugriff auf Modul-Ebene gefunden — turbo (envMode=strict) würde die ` +
            `Variable aus der Build-Umgebung entfernen und der Wert wäre still weg:\n${rendered}`
          : '',
      ).toEqual([]);
    },
  );
});

describe('Kein Confirm-Aufruf gegen den Provider', () => {
  it('keine Provider-Order wird in diesem Sprint bestätigt', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const source = readFileSync(file, 'utf8');
      // Gesucht wird der Endpoint-Pfad, nicht das Wort: Kommentare, die Confirm
      // erwähnen, sollen nicht anschlagen — sie sind erwünscht.
      if (/['"`][^'"`]*\/confirm\b/.test(source)) {
        offenders.push(path.relative(FULFILLMENT_DIR, file));
      }
    }
    expect(
      offenders,
      `Confirm-Endpoint gefunden in: ${offenders.join(', ')} — Provider-Orders bleiben ` +
        `in diesem Sprint Drafts. Ein Confirm gibt echtes Geld aus.`,
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Store-Kontext: kein Modul ausser shopify-admin.ts liest Shopify-Credentials
// direkt aus der Umgebung.
//
// Anlass: seit es zwei Stores gibt (SILBE-Produktion und ein Pool-Dev-Store) war
// `process.env.SHOPIFY_SHOP` ein stiller globaler Default. Jedes lokal
// ausgefuehrte Script haette PRODUKTION getroffen — die schreibenden ohne jede
// Warnung und ohne Rueckweg. "Welcher Store" ist deshalb jetzt eine ANGABE an
// der Aufrufstelle. Dieser Waechter haelt das durch, wenn die Disziplin
// nachlaesst — Doku schuetzt nur den, der sie liest.
// ---------------------------------------------------------------------------

const CREDENTIAL_KEYS = ['SHOPIFY_SHOP', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET'] as const;
const CREDENTIAL_OWNER = path.resolve(__dirname, '..', 'shopify-admin.ts');
const APP_ROOT = path.resolve(__dirname, '..', '..');

function collectRepoSources(): string[] {
  const out: string[] = [];
  for (const rel of ['lib', 'scripts']) {
    const root = path.join(APP_ROOT, rel);
    if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) continue;
    out.push(...collectSourceFiles(root));
  }
  return out;
}

describe('Shopify-Credentials werden nur an EINER Stelle aus der Umgebung gelesen', () => {
  const files = collectRepoSources().filter((f) => path.resolve(f) !== CREDENTIAL_OWNER);

  it('findet ueberhaupt Dateien zum Pruefen', () => {
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it('nur shopify-admin.ts liest process.env.SHOPIFY_{SHOP,CLIENT_ID,CLIENT_SECRET}', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const key of CREDENTIAL_KEYS) {
        const dotAccess = new RegExp(String.raw`process\.env\.${key}\b`);
        const idxAccess = new RegExp(String.raw`process\.env\[\s*['"\`]${key}['"\`]\s*\]`);
        if (dotAccess.test(src) || idxAccess.test(src)) {
          offenders.push(`${path.relative(APP_ROOT, file)} -> ${key}`);
        }
      }
    }
    expect(
      offenders,
      [
        'Direkter Credential-Zugriff gefunden:',
        ...offenders.map((o) => `  ${o}`),
        '',
        'Store-Kontext ueber storeFromEnv() / deploymentStore() beziehen und als',
        'Parameter durchreichen. Ein direkter Zugriff greift stillschweigend nach',
        'dem PRODUKTIONS-Store — und die schreibenden Pfade tun das ohne Warnung.',
      ].join('\n'),
    ).toEqual([]);
  });
});
