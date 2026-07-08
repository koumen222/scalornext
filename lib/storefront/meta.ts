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

/** Retire balises HTML et entités courantes — les descriptions produit sont du HTML riche. */
function stripHtml(value: unknown): string {
  if (!value) return '';
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/** Base publique de la boutique : domaine custom sinon sous-domaine scalor.net. */
export function storePublicBase(store: Record<string, any> | null | undefined): string | null {
  const custom = normalizeText(store?.customDomain).toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (custom) return `https://${custom}`;
  const sub = normalizeText(store?.subdomain).toLowerCase();
  return sub ? `https://${sub}.scalor.net` : null;
}

const OG_LOCALES: Record<string, string> = { fr: 'fr_FR', en: 'en_US', es: 'es_ES' };

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
  canonical?: string | null;
  locale?: string;
  other?: Record<string, string>;
}

function toMetadata({ title, description, image, siteName, type = 'website', icon, canonical, locale, other }: MetaInput): Metadata {
  return {
    title,
    description,
    icons: icon ? { icon: [{ url: icon }] } : undefined,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      siteName,
      type,
      locale,
      url: canonical || undefined,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
    other,
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
  const base = storePublicBase(store);
  const locale = OG_LOCALES[normalizeText((store as Record<string, any>)?.language).slice(0, 2).toLowerCase()];

  if (pageType === 'products') {
    return toMetadata({
      title: `Produits — ${name}`,
      description: truncateText(`Découvrez tous les produits disponibles chez ${name}.`),
      image,
      siteName: name,
      icon: logo || '/icon.png',
      canonical: base ? `${base}/products` : null,
      locale,
    });
  }

  if (pageType === 'checkout') {
    return toMetadata({
      title: `Finaliser la commande — ${name}`,
      description: truncateText(`Finalisez votre commande sur la boutique ${name}.`),
      image,
      siteName: name,
      icon: logo || '/icon.png',
      locale,
    });
  }

  return toMetadata({
    title: name,
    description: truncateText(stripHtml(description), 180) || description,
    image,
    siteName: name,
    icon: logo || '/icon.png',
    canonical: base ? `${base}/` : null,
    locale,
  });
}

export function productMetadata(payload: ProductPagePayload): Metadata {
  const product = payload?.product;
  const store = payload?.store;
  if (!product) return storeMetadata(payload, 'home');
  const { name: storeName, description: storeDescription, logo, banner } = storeFields(store);

  const productImage: string = product.images?.[0]?.url || product.image || '';
  const title =
    normalizeText(stripHtml(product.seoTitle)) || `${normalizeText(product.name)} — ${storeName}`;
  const description = truncateText(
    normalizeText(stripHtml(product.seoDescription || product.description)) ||
      storeDescription ||
      `Découvrez ${product.name} chez ${storeName}.`,
    180
  );

  // Canonical : consolide les alias /product/, /produit/, /products/ et le mode
  // path (/store/{sub}/…) sur l'URL du sitemap boutique.
  const base = storePublicBase(store);
  const canonical = base && product.slug ? `${base}/products/${encodeURIComponent(product.slug)}` : null;
  const lang = normalizeText(product.pageLanguage || store?.language).slice(0, 2).toLowerCase();

  // Prix pour les cartes produit WhatsApp/Facebook (og product tags)
  const price = Number(product.price);
  const priceMeta = Number.isFinite(price) && price > 0
    ? {
        'product:price:amount': String(price),
        'product:price:currency': normalizeText(product.currency || store?.currency) || 'XAF',
        'product:availability': Number.isFinite(Number(product.stock)) && Number(product.stock) <= 0 ? 'out of stock' : 'in stock',
      }
    : undefined;

  return toMetadata({
    title,
    description,
    image: productImage || logo || banner || DEFAULT_PLATFORM_IMAGE,
    siteName: storeName,
    // og:type "product" n'est pas supporté par l'API Metadata de Next → "website"
    // (impact SEO négligeable, noté dans MIGRATION_LOG.md)
    type: 'website',
    icon: logo || '/icon.png',
    canonical,
    locale: OG_LOCALES[lang],
    other: priceMeta,
  });
}
