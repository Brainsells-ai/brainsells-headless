import type { ReactElement } from 'react';

// Renders one or more schema.org nodes as an application/ld+json script.
// Server Component — no interactivity, no hooks.
//
// XSS hardening: JSON.stringify can emit a literal "</script>" if any string
// value contains it (e.g. a Shopify product description). Escaping every "<"
// to its < unicode form keeps the payload valid JSON while making it
// impossible to break out of the <script> element.

type JsonLdProps = {
  data: object | object[];
};

export function JsonLd({ data }: JsonLdProps): ReactElement {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
