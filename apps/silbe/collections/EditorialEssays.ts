import type { CollectionConfig } from 'payload';
import {
  lexicalEditor,
  ParagraphFeature,
  ItalicFeature,
  LinkFeature,
  HeadingFeature,
  BlockquoteFeature,
  UnorderedListFeature,
  OrderedListFeature,
  HorizontalRuleFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical';

// EditorialEssays — work-edition essays referenced from the Shopify
// product metafield `silbe.editorial_essay_handle`. One essay can serve
// multiple SKUs (Hero + Goldrahmen variants of the same edition).
//
// Architecture decisions (locked Phase-3 day-2, 2026-05-12):
//
// 1. Slug-based primary key (NOT 1:1 to Shopify productHandle). One
//    essay → many products via silbe.editorial_essay_handle.
//
// 2. Lexical features explicitly constrained — italic + link inline,
//    h3/h4 + blockquote + lists + hr blocks. No bold, no inline-code,
//    no underline, no tables. SILBE editorial-restraint surface.
//
// 3. pullQuote as top-level Group field, not a Lexical custom block.
//    One pull-quote per essay, renderer controls position. Prevents
//    Aleks from placing multiple pull-quotes per essay.
//
// 4. No author/voice field on this collection. Voice is product-level
//    (Shopify metafield → manifest VOICE_BY_HANDLE → CanonicalVoice).
//    Phase-5 VoiceBios collection (separate, joined by voice slug)
//    will own editable author bio content. EditorialEssays is purely
//    work-content.

export const EditorialEssays: CollectionConfig = {
  slug: 'editorial-essays',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    description:
      'Editorial essays per work-edition. Joined to products via silbe.editorial_essay_handle metafield. One essay can serve multiple SKUs.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description:
          'Internal title für Admin-UI. NICHT auf PDP gerendert — die PDP nutzt product.metafields.work_title aus Shopify.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'Slug für 1:N-Beziehung — ein Essay kann mehrere SKUs serven (z.B. Hero + Goldrahmen-Variante derselben Edition). Matches silbe.editorial_essay_handle Metafield am Shopify-Product. kebab-case. Beispiel: rilke-habe-geduld.',
      },
    },
    {
      name: 'intro',
      type: 'textarea',
      required: false,
      admin: {
        description:
          'Lead-Paragraph (1–2 Sätze). Wird im PDP Quote-Hero gerendert als Crimson italic 18px, max-width 640px.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      required: false,
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          ItalicFeature(),
          LinkFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h3', 'h4'] }),
          BlockquoteFeature(),
          UnorderedListFeature(),
          OrderedListFeature(),
          HorizontalRuleFeature(),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
      admin: {
        description:
          'Body, 200–400 Wörter. Crimson Pro 17px. Inline marks: italic für Fließtext-Emphasis (sehr sparsam), link für Source-Referenzen. Werktitel IMMER via ›...‹-Guillemets im Text (NICHT italic!). Blocks: h3/h4, blockquote, lists, hr.',
      },
    },
    {
      name: 'pullQuote',
      type: 'group',
      admin: {
        description:
          'Optional. Wird vom PDP-Renderer mittig im Body positioniert. Leer lassen wenn die Edition keinen Pull-Quote braucht.',
      },
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: false,
          admin: {
            description:
              'Quote-Text mit deutschen Anführungszeichen „..." — vom Renderer in Cormorant Italic 28px gesetzt.',
          },
        },
        {
          name: 'source',
          type: 'text',
          required: false,
          admin: {
            description:
              'Optional Source-Caption — innerhalb des Quotes (z.B. „Brief 4, 16.07.1903" oder „Aphorismus Nr. 73"). Author-Attribution NICHT hier — die kommt aus PDP-Voice-Context.',
          },
        },
      ],
    },
  ],
  timestamps: true,
};
