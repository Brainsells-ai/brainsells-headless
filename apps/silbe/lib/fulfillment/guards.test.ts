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

// ---------------------------------------------------------------------------
// Der Provider darf NICHT aus einer Cart-/Line-Item-Property stammen.
//
// Es gab diesen Pfad: normalize.ts las `properties[].fulfillmentProvider` und
// setzte ihn als Provider-Override. Ersatzlos gestrichen, weil Cart-Properties
// aus dem BROWSER kommen — ein daraus ableitbarer Provider waere eine
// Angriffsflaeche: jemand koennte Bestellungen an einen fremden Provider routen.
//
// Der Provider kommt jetzt ausschliesslich aus dem Varianten-Metafield. Dieser
// Waechter verhindert, dass der bequeme Weg zurueckkehrt. Er prueft nicht das
// Wort (der Metadata-Key heisst weiterhin fulfillmentProvider und soll es),
// sondern die VERKNUEPFUNG von Property-Lesung und Provider.
// ---------------------------------------------------------------------------

describe('Provider kommt nicht aus einer Cart-Property', () => {
  const NORMALIZE = path.resolve(__dirname, 'normalize.ts');

  it('normalize.ts liest fulfillmentProvider nicht aus Line-Item-Properties', () => {
    const src = readFileSync(NORMALIZE, 'utf8');
    // prop(...) ist der Property-Leser in normalize.ts. Kommt darin
    // fulfillmentProvider vor, ist der gestrichene Pfad zurueck.
    const viaProp = /prop\([^)]*fulfillmentProvider/i.test(src);
    expect(
      viaProp,
      [
        'normalize.ts leitet den Provider wieder aus einer Line-Item-Property ab.',
        'Cart-Properties kommen aus dem Browser — damit waeren Bestellungen an',
        'einen fremden Provider routbar. Der Provider gehoert ausschliesslich in',
        'das Varianten-Metafield (VARIANT_PROVIDER_KEY).',
      ].join('\n'),
    ).toBe(false);
  });

  it('der Provider-Metadata-Key wird weiterhin gesetzt (aus dem Mapping)', () => {
    // Gegenprobe: der Waechter oben darf nicht dadurch gruen werden, dass der
    // Provider gar nicht mehr gesetzt wird.
    const src = readFileSync(NORMALIZE, 'utf8');
    expect(src).toMatch(/mapping\.provider/);
  });
});

// ---------------------------------------------------------------------------
// Kein produkttyp-spezifischer Default fuer Placement und Technik.
//
// Es gab zwei davon, beide unsichtbar falsch:
//   - DEFAULT_PLACEMENT = 'front_large' in der Dispatch-Route (DTG-Shirt)
//   - technique: ... ?? 'dtg' direkt im Printful-Order-Body (Poster = digital)
//
// Beide sind produkttyp-spezifisch. Ein Wert, der fuer das Shirt stimmt, ist
// fuer das Poster still falsch, und der Fehler zeigt sich erst beim Provider —
// nicht im eigenen Code. Das Placement kommt aus dem Varianten-Metafield, die
// Technik aus dem Katalog. Beides ohne Rueckfallwert.
// ---------------------------------------------------------------------------

describe('Kein Placement- und kein Technik-Default', () => {
  const NORMALIZE_P = path.resolve(__dirname, 'normalize.ts');
  const ROUTE_P = path.resolve(
    __dirname,
    '..',
    '..',
    'app',
    'api',
    'webhooks',
    'fulfillment-dispatch',
    'route.ts',
  );
  const PRINTFUL_P = path.resolve(__dirname, 'providers', 'printful.ts');

  it('normalize.ts kennt keine defaultPlacement-Option mehr', () => {
    // Die OPTION, nicht nur ihr Wert. Solange sie existiert, ist ein Default
    // ausdrueckbar — und irgendwer drueckt ihn aus.
    const src = readFileSync(NORMALIZE_P, 'utf8').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/defaultPlacement/);
  });

  it('normalize.ts liest das Placement nicht aus Line-Item-Properties', () => {
    const src = readFileSync(NORMALIZE_P, 'utf8');
    const viaProp = /prop\([^)]*['"]placement['"]/i.test(src);
    expect(
      viaProp,
      'normalize.ts leitet das Placement wieder aus einer Line-Item-Property ab. ' +
        'Die kommt aus dem Browser — das waere browser-gesteuerte Produktionseingabe.',
    ).toBe(false);
  });

  it('das Placement wird weiterhin aus dem Mapping gesetzt', () => {
    // Gegenprobe: die zwei Waechter oben duerfen nicht dadurch gruen werden,
    // dass gar kein Placement mehr gesetzt wird.
    //
    // Auf die ZUWEISUNG geprueft, nicht auf das blosse Vorkommen von
    // `mapping.placement`. Die erste Fassung tat das und war gruen, obwohl das
    // Placement durch ein Literal ersetzt war — `mapping.placement` steht auch im
    // Null-Check darueber. Ein Waechter, der aus einem anderen Grund gruen ist als
    // dem, den sein Name behauptet, ist kein Waechter.
    expect(readFileSync(NORMALIZE_P, 'utf8')).toMatch(/placement:\s*mapping\.placement/);
  });

  it('die Dispatch-Route setzt keinen Placement-Default', () => {
    const src = readFileSync(ROUTE_P, 'utf8').replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/DEFAULT_PLACEMENT|defaultPlacement|front_large/);
  });

  it('printful.ts setzt keine Default-Technik im Order-Body', () => {
    const src = readFileSync(PRINTFUL_P, 'utf8').replace(/\/\/.*$/gm, '');
    // Ein `technique:` mit ?? oder || dahinter ist ein Rueckfallwert.
    expect(src).not.toMatch(/technique:\s*[^,\n]*(\?\?|\|\|)/);
  });

  // Die Gegenprobe zum Technik-Waechter ist bewusst KEIN Textmuster, sondern ein
  // Verhaltenstest in adapter-contract.test.ts ("Technik kommt aus dem Katalog,
  // nicht aus einem Default"). Zwei Textfassungen waren hier gruen, obwohl der
  // Katalog-Call entfernt war: erst traf das Muster die Methodendefinition, dann
  // den zweiten Aufrufer in fetchPlacementSpec. Wenn ein Waechter zweimal aus dem
  // falschen Grund gruen ist, ist die Form falsch, nicht das Muster.
});
