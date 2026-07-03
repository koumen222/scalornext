'use client';

/**
 * Fournit la langue de la boutique à tout l'arbre storefront
 * (consommée par useStorefrontT / useMerchantTextLocalizer).
 */
import type { ReactNode } from 'react';
import { StorefrontLangContext, normalizeStoreLanguage } from '@/src/ecom/i18n/storefront.js';

export default function StorefrontLangProvider({
  lang,
  children,
}: {
  lang?: string | null;
  children: ReactNode;
}) {
  return (
    <StorefrontLangContext.Provider value={normalizeStoreLanguage(lang)}>
      {children}
    </StorefrontLangContext.Provider>
  );
}
