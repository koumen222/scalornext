'use client';

// Rétro-compat : /ecom/creatives/gallery ouvre le Creative Center sur la Galerie.
import Page from '@/src/ecom/pages/CreativeCenter.jsx';

export default function CreativesGalleryPage() {
  return <Page initialTab="galerie" />;
}
