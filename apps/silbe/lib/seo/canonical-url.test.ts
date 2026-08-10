import { describe, it, expect, afterEach } from 'vitest';
import { canonicalUrl } from './canonical-url';
import { brandConfig } from '@/lib/brand.config';

// Block-A Leck #1 + #4: der Punkt dieser Datei ist nicht, dass canonicalUrl Pfade
// zusammensetzt — das tat sie vorher auch. Der Punkt ist, dass sie DIESELBE Quelle
// liest wie metadataBase in layout.tsx. Solange beide auf brandConfig.site.origin
// zeigen, kann der Split-Brain nicht entstehen: Sitemap auf der neuen Domain,
// canonical weiterhin auf silbe.at.

const K = 'METADATA_BASE_URL';
const before = process.env[K];
afterEach(() => {
  if (before === undefined) delete process.env[K];
  else process.env[K] = before;
});

describe('canonicalUrl — eine Quelle mit metadataBase', () => {
  it('folgt dem konfigurierten Origin', () => {
    process.env[K] = 'https://meine-brand.at';
    expect(canonicalUrl('/')).toBe('https://meine-brand.at/');
    expect(canonicalUrl('/editionen')).toBe('https://meine-brand.at/editionen');
  });

  it('emittiert NIE silbe.at, wenn eine andere Brand konfiguriert ist', () => {
    process.env[K] = 'https://meine-brand.at';
    for (const p of ['/', '/editionen', '/sitemap.xml', '/editionen/irgendein-handle']) {
      expect(canonicalUrl(p)).not.toContain('silbe.at');
    }
  });

  it('liest exakt denselben Wert wie brandConfig.site.origin', () => {
    process.env[K] = 'https://meine-brand.at';
    expect(canonicalUrl('/').startsWith(brandConfig.site.origin)).toBe(true);
  });

  it('WIRFT bei fehlendem Origin, statt still auf silbe.at zu fallen', () => {
    delete process.env[K];
    expect(() => canonicalUrl('/')).toThrow(/METADATA_BASE_URL/);
  });
});
