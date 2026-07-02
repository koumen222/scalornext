/**
 * generateMetadata storefront — règles reprises à l'identique de
 * Backend/routes/publicStorefront.js (buildMeta) : titres, descriptions,
 * images OG par type de page (home / products / product / checkout).
 */

import type { Metadata } from 'next';
import type { StorePayload, ProductPagePayload } from './api';

export type StorePageType = 'home' | 'products' | 'checkout' | 'legal';

const DEFAULT_PLATFORM_TITLE = 'Scalor — The Operating System for African Ecommerce';
const DEFAULT_PLATFORM_DESCRIPTION =
  'Scalor — Growth. Structure. Intelligence. The Operating System for African Ecommerce.';
const DEFAULT_PLATFORM_IMAGE = 'https://scalor.net/icon.png';

function normalizeText(value: unknown): string {
  if (!value) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function truncateText(value: unknown, max = 180): string {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function storeFields(store: Record<string, any> | null | undefined) {
  const name = normalizeText(store?.name || store?.storeName) || 'Boutique';
  const description = truncateText(
    normalizeText(store?.description || store?.storeDescription) ||
      `Découvrez la boutique ${name} en ligne.`,
    180
  );
  const logo: string = store?.logo || store?.storeLogo || '';
  const banner: string = store?.banner || store?.storeBanner || '';
  const image = logo || banner || DEFAULT_PLATFORM_IMAGE;
  return { name, description, logo, banner, image };
}

interface MetaInput {
  title: string;
  description: string;
  image?: string;
  siteName: string;
  type?: 'website';
  icon?: string;
}

function toMetadata({ title, description, image, siteName, type = 'website', icon }: MetaInput): Metadata {
  return {
    title,
    description,
    icons: icon ? { icon: [{ url: icon }] } : undefined,
    openGraph: {
      title,
      description,
      siteName,
      type,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export function platformFallbackMetadata(): Metadata {
  return toMetadata({
    title: DEFAULT_PLATFORM_TITLE,
    description: DEFAULT_PLATFORM_DESCRIPTION,
    image: DEFAULT_PLATFORM_IMAGE,
    siteName: 'Scalor',
  });
}

export function storeMetadata(payload: StorePayload, pageType: StorePageType = 'home'): Metadata {
  const store = payload?.store || payload;
  if (!store) return platformFallbackMetadata();
  const { name, description, logo, image } = storeFields(store);

  if (pageType === 'products') {
    return toMetadata({
      title: `Produits — ${name}`,
      description: truncateText(`Découvrez tous les produits disponibles chez ${name}.`),
      image,
      siteName: name,
      icon: logo || '/icon.png',
    });
  }

  if (pageType === 'checkout') {
    return toMetadata({
      title: `Finaliser la commande — ${name}`,
      description: truncateText(`Finalisez votre commande sur la boutique ${name}.`),
      image,
      siteName: name,
      icon: logo || '/icon.png',
    });
  }

  return toMetadata({
    title: name,
    description,
    image,
    siteName: name,
    icon: logo || '/icon.png',
  });
}

export function productMetadata(payload: ProductPagePayload): Metadata {
  const product = payload?.product;
  const store = payload?.store;
  if (!product) return storeMetadata(payload, 'home');
  const { name: storeName, description: storeDescription, logo, banner } = storeFields(store);

  const productImage: string = product.images?.[0]?.url || product.image || '';
  const title =
    normalizeText(product.seoTitle) || `${normalizeText(product.name)} — ${storeName}`;
  const description = truncateText(
    normalizeText(product.seoDescription || product.description) ||
      storeDescription ||
      `Découvrez ${product.name} chez ${storeName}.`,
    180
  );

  return toMetadata({
    title,
    description,
    image: productImage || logo || banner || DEFAULT_PLATFORM_IMAGE,
    siteName: storeName,
    // og:type "product" n'est pas supporté par l'API Metadata de Next → "website"
    // (impact SEO négligeable, noté dans MIGRATION_LOG.md)
    type: 'website',
    icon: logo || '/icon.png',
  });
}
