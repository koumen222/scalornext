'use client';

/**
 * Barrel client du storefront — marque la frontière server/client pour les
 * composants SPA repris tels quels (aucun n'a la directive "use client",
 * inutile en Vite ; on l'ajoute ici en un seul point).
 *
 * Les composants legacy sont en JS non typé : on fixe ici leur contrat TS
 * (types d'interop, sans toucher aux fichiers d'origine).
 */

import type { ComponentType, ReactNode } from 'react';

import PublicStorefrontJs, {
  StoreAllProducts as StoreAllProductsJs,
  StoreLegalPage as StoreLegalPageJs,
  StoreCollectionPage as StoreCollectionPageJs,
  StoreAboutPage as StoreAboutPageJs,
  StoreContactPage as StoreContactPageJs,
} from '@/src/ecom/pages/PublicStorefront.jsx';
import StoreProductPageJs from '@/src/ecom/pages/StoreProductPage.jsx';
import StoreCheckoutJs from '@/src/ecom/pages/StoreCheckout.jsx';
import { EcomAuthProvider as EcomAuthProviderJs } from '@/src/ecom/hooks/useEcomAuth.jsx';
import { ThemeProvider as ThemeProviderJs } from '@/src/ecom/contexts/ThemeContext.jsx';
import { SubdomainProvider as SubdomainProviderJs } from '@/src/ecom/contexts/SubdomainContext.jsx';
import { StorefrontSSRProvider as StorefrontSSRProviderJs } from '@/src/ecom/contexts/StorefrontSSRContext.jsx';
import VersionWatcherJs from '@/src/ecom/components/VersionWatcher.jsx';

export interface SubdomainValue {
  subdomain: string | null;
  isStoreDomain: boolean;
  isCustomDomain: boolean;
}

export const PublicStorefront = PublicStorefrontJs as ComponentType;
export const StoreAllProducts = StoreAllProductsJs as ComponentType;
export const StoreCollectionPage = StoreCollectionPageJs as ComponentType;
export const StoreAboutPage = StoreAboutPageJs as ComponentType;
export const StoreContactPage = StoreContactPageJs as ComponentType;
export const StoreLegalPage = StoreLegalPageJs as ComponentType;
export const StoreProductPage = StoreProductPageJs as ComponentType;
export const StoreCheckout = StoreCheckoutJs as ComponentType;

export const EcomAuthProvider = EcomAuthProviderJs as ComponentType<{ children?: ReactNode }>;

export const ThemeProvider = ThemeProviderJs as ComponentType<{
  subdomain?: string | null;
  children?: ReactNode;
}>;

export const SubdomainProvider = SubdomainProviderJs as ComponentType<{
  value: SubdomainValue;
  children?: ReactNode;
}>;

export const StorefrontSSRProvider = StorefrontSSRProviderJs as ComponentType<{
  value: Record<string, any> | null;
  children?: ReactNode;
}>;

export const VersionWatcher = VersionWatcherJs as ComponentType;
