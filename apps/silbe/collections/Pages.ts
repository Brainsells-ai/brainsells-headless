import type { CollectionConfig } from 'payload';

// Minimal Pages collection — Phase 1.5b foundation. Phase 2 will extend it
// with rich-text body via lexical, OG image overrides, slug-locking, and
// hooks for revalidatePath. For now: title + slug + body (plain text) is
// enough to seed `editorial-letter-homepage` as a placeholder Aleks can edit
// from the admin panel.
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
  },
  access: {
    read: () => true, // public-readable via REST/GraphQL; auth needed for writes.
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'URL-Handle, kebab-case. Beispiel: editorial-letter-homepage',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Phase-2 ersetzt durch Lexical Rich-Text. Aktuell Plain-Text.',
      },
    },
  ],
  timestamps: true,
};
