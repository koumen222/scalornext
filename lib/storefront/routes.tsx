/**
 * Fabriques des routes storefront — partagées par les deux arbres :
 * app/sites/[subdomain]/ (hostMode, cible interne du middleware) et
 * app/store/[subdomain]/ (path mode).
 * Chaque fichier de route est un wrapper de quelques lignes autour de ces fabriques.
 */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import StorefrontShell from './shell';
import { getStorePayload, getProductPagePayload } from './api';
import { storeMetadata, productMetadata } from './meta';
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

export async function SiteProductPage({ params }: { params: ProductParams }) {
  const { subdomain, slug } = await params;
  const payload = await getProductPagePayload(subdomain, slug);
  return (
    <StorefrontSSRProvider
      value={payload ? { ...payload, products: payload.products || [] } : null}
    >
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
