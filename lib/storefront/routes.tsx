/**
 * Fabriques des routes storefront — partagées par les deux arbres :
 * app/sites/[subdomain]/ (hostMode, cible interne du middleware) et
 * app/store/[subdomain]/ (path mode).
 * Chaque fichier de route est un wrapper de quelques lignes autour de ces fabriques.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect, notFound } from 'next/navigation';
import StorefrontShell from './shell';
import { getStorePayload, getProductPagePayload, getProductPagePayloadWithStatus } from './api';
import { storeMetadata, productMetadata, storePublicBase } from './meta';
import {
  PublicStorefront,
  StoreAllProducts,
  StoreLegalPage,
  StoreProductPage,
  StoreCheckout,
  StorefrontSSRProvider,
} from './clients';

type SiteParams = Promise<{ subdomain: string }>;
type ProductParams = Promise<{ subdomain: string; slug: string }>;

// ─── Layout ──────────────────────────────────────────────────────────────────

export function makeSiteLayout(hostMode: boolean) {
  return async function SiteLayout({
    children,
    params,
  }: {
    children: ReactNode;
    params: SiteParams;
  }) {
    const { subdomain } = await params;
    return (
      <StorefrontShell subdomain={subdomain} hostMode={hostMode}>
        {children}
      </StorefrontShell>
    );
  };
}

export async function layoutGenerateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const { subdomain } = await params;
  return storeMetadata(await getStorePayload(subdomain), 'home');
}

// ─── Pages ───────────────────────────────────────────────────────────────────

export function SiteHomePage() {
  return <PublicStorefront />;
}

export function SiteProductsPage() {
  return <StoreAllProducts />;
}

export async function productsGenerateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const { subdomain } = await params;
  return storeMetadata(await getStorePayload(subdomain), 'products');
}

/** JSON-LD schema.org/Product — rich results Google (prix, dispo, marque). */
function buildProductJsonLd(payload: Record<string, any> | null): string | null {
  const product = payload?.product;
  const store = payload?.store;
  if (!product?.name) return null;

  const images = [
    ...(Array.isArray(product.images) ? product.images.map((img: any) => img?.url) : []),
  ].filter(Boolean).slice(0, 6);

  const plainDescription = String(product.seoDescription || product.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);

  const base = storePublicBase(store);
  const url = base && product.slug ? `${base}/products/${encodeURIComponent(product.slug)}` : undefined;
  const price = Number(product.price);
  const stock = Number(product.stock);

  const data: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: String(product.name).slice(0, 200),
    ...(plainDescription ? { description: plainDescription } : {}),
    ...(images.length ? { image: images } : {}),
    ...(product._id ? { sku: String(product._id) } : {}),
    ...(store?.name ? { brand: { '@type': 'Brand', name: String(store.name).slice(0, 120) } } : {}),
    ...(Number.isFinite(price) && price > 0
      ? {
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: String(product.currency || store?.currency || 'XAF').slice(0, 8),
            availability: Number.isFinite(stock) && stock <= 0
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
            ...(url ? { url } : {}),
          },
        }
      : {}),
  };

  try {
    // `<` échappé pour éviter toute fermeture prématurée du <script>
    return JSON.stringify(data).replace(/</g, '\\u003c');
  } catch {
    return null;
  }
}

export async function SiteProductPage({ params }: { params: ProductParams }) {
  const { subdomain, slug } = await params;
  const { data: payload, status } = await getProductPagePayloadWithStatus(subdomain, slug);

  // Produit/boutique inexistant confirmé par l'API → vrai 404 (pas de soft-404).
  // status 0 (API injoignable) → on laisse le client refetcher comme avant.
  if (status === 404) notFound();

  const jsonLd = buildProductJsonLd(payload);
  // Preload du visuel principal (LCP) + preconnect vers l'origine des images
  const heroImage: string =
    payload?.product?._pageData?.heroImage || payload?.product?.images?.[0]?.url || '';
  let imageOrigin = '';
  try { imageOrigin = heroImage ? new URL(heroImage).origin : ''; } catch { /* URL relative */ }

  return (
    <StorefrontSSRProvider
      value={payload ? { ...payload, products: payload.products || [] } : null}
    >
      {imageOrigin ? <link rel="preconnect" href={imageOrigin} crossOrigin="anonymous" /> : null}
      {heroImage ? <link rel="preload" as="image" href={heroImage} fetchPriority="high" /> : null}
      {jsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      ) : null}
      <StoreProductPage />
    </StorefrontSSRProvider>
  );
}

export async function productGenerateMetadata({ params }: { params: ProductParams }): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const payload = await getProductPagePayload(subdomain, slug);
  if (payload?.product) return productMetadata(payload);
  return storeMetadata(await getStorePayload(subdomain), 'home');
}

export function SiteLegalPage() {
  return <StoreLegalPage />;
}

export function SiteCheckoutPage() {
  return <StoreCheckout />;
}

export async function checkoutGenerateMetadata({ params }: { params: SiteParams }): Promise<Metadata> {
  const { subdomain } = await params;
  return storeMetadata(await getStorePayload(subdomain), 'checkout');
}

// ─── Catch-all (iso SPA : route inconnue de boutique → accueil boutique) ────

export function makeSiteCatchAll(hostMode: boolean) {
  return async function SiteCatchAll({ params }: { params: SiteParams }) {
    const { subdomain } = await params;
    redirect(hostMode ? '/' : `/store/${subdomain}`);
  };
}
