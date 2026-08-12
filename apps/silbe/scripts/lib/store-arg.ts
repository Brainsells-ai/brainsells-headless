// --store-Zwang für alle Scripts, die gegen Shopify arbeiten.
//
// WARUM: seit es mehr als einen Store gibt, war `SHOPIFY_SHOP` ein stiller
// globaler Default. Ein Script, das für den Dev-Store gedacht war, hätte
// PRODUKTION getroffen — bei den schreibenden (Webhook-Registrierung,
// Metafield-Definitionen, Brief-Werte) ohne jede Warnung und ohne Rückweg.
//
// Die Regel hier: kein --store, kein Lauf. Auch nicht bei nur einem
// konfigurierten Store — ein Default, der heute eindeutig ist, ist morgen der
// falsche, und genau dieser Übergang ist gerade passiert.
//
// Der Aufrufer nennt die SUBDOMAIN, nicht das Env-Präfix. Das Präfix wird
// gesucht: ein Tippfehler führt damit zu einer Verweigerung mit Auswahlliste,
// nie zu einem stillen Griff nach dem anderen Store.

import { storeFromEnv, type ShopifyStore } from '@/lib/shopify-admin';

/** Bekannte Env-Präfixe. Neuer Store = hier eintragen. */
const KNOWN_PREFIXES = ['SHOPIFY_', 'POOL_DEV_SHOPIFY_'] as const;

function configuredStores(): Array<{ prefix: string; shop: string }> {
  const out: Array<{ prefix: string; shop: string }> = [];
  for (const prefix of KNOWN_PREFIXES) {
    const shop = process.env[`${prefix}SHOP`];
    if (shop) out.push({ prefix, shop });
  }
  return out;
}

export interface ResolvedStore {
  store: ShopifyStore;
  /** true, wenn dieser Store als produktiv gilt. Schreibende Scripts warnen. */
  isProduction: boolean;
}

/**
 * Liest `--store=<subdomain>` aus argv und löst ihn in einen Store-Kontext auf.
 * Ohne das Flag: Abbruch mit Auswahlliste.
 */
export function requireStoreArg(argv: string[] = process.argv): ResolvedStore {
  const available = configuredStores();
  const arg = argv.find((a) => a.startsWith('--store='));
  const wanted = arg?.slice('--store='.length).trim();

  if (!wanted) {
    const list = available.map((s) => `    --store=${s.shop}   (${s.prefix}*)`).join('\n');
    throw new Error(
      'Kein Ziel-Store angegeben.\n\n' +
        '  Dieses Script arbeitet gegen Shopify und verlangt eine ausdrueckliche\n' +
        '  Store-Angabe. Es gibt bewusst keinen Default — ein Default waere der\n' +
        '  Produktions-Store.\n\n' +
        `  Verfuegbar:\n${list || '    (keiner konfiguriert)'}\n`,
    );
  }

  const hit = available.find((s) => s.shop === wanted);
  if (!hit) {
    const list = available.map((s) => `    ${s.shop}`).join('\n');
    throw new Error(
      `Unbekannter Store "${wanted}".\n\n  Konfiguriert sind:\n${list || '    (keiner)'}\n`,
    );
  }

  return {
    store: storeFromEnv(hit.prefix),
    isProduction: hit.prefix === 'SHOPIFY_',
  };
}

/**
 * Gibt das Ziel VOR dem ersten Schreibzugriff aus und verlangt bei Produktion
 * eine zusätzliche Bestätigung per Flag.
 *
 * Der Ausdruck ist bewusst laut und mehrzeilig: ein Ziel, das man ueberlesen
 * kann, ist kein Schutz.
 */
export function announceWriteTarget(resolved: ResolvedStore, argv: string[] = process.argv): void {
  const { store, isProduction } = resolved;
  console.log('');
  console.log('  ┌─────────────────────────────────────────────');
  console.log(`  │  SCHREIBT GEGEN:  ${store.shop}.myshopify.com`);
  console.log(`  │  Credentials:     ${store.envPrefix}*`);
  console.log(`  │  Einstufung:      ${isProduction ? 'PRODUKTION' : 'Nicht-Produktion'}`);
  console.log('  └─────────────────────────────────────────────');
  console.log('');

  if (isProduction && !argv.includes('--yes-production')) {
    throw new Error(
      'Abbruch: Schreibzugriff auf den PRODUKTIONS-Store.\n\n' +
        '  Wenn das beabsichtigt ist, zusaetzlich --yes-production setzen.\n',
    );
  }
}
