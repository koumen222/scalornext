import type { Metadata } from 'next';

/** Description par défaut de la plateforme — iso setDocumentMeta (App.jsx). */
export const PLATFORM_DESCRIPTION =
  'Scalor — Growth. Structure. Intelligence. The Operating System for African Ecommerce.';

/**
 * Metadata d'une page plateforme — réplique PLATFORM_TITLE_RULES + setDocumentMeta :
 * title « X — Scalor », description par défaut, OG/Twitter alignés.
 */
export function platformMetadata(title: string): Metadata {
  return {
    title,
    description: PLATFORM_DESCRIPTION,
    openGraph: {
      title,
      description: PLATFORM_DESCRIPTION,
      siteName: 'Scalor',
      type: 'website',
      images: ['https://scalor.net/icon.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: PLATFORM_DESCRIPTION,
      images: ['https://scalor.net/icon.png'],
    },
  };
}
