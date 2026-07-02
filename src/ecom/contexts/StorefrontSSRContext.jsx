'use client';

/**
 * StorefrontSSRContext — remplaçant Next.js de window.__SCALOR_INITIAL__.
 * L'ancien backend injectait un script avec les données initiales de la boutique ;
 * ici, les Server Components fetchent l'API Express (ISR 60s) et fournissent le
 * même payload via ce contexte. useStoreData / useStoreProduct le consomment en
 * bootstrap, puis gardent leur comportement SPA (refetch en arrière-plan, sockets).
 * Forme du payload : celle de l'API publique — { store, sections, products,
 * pixels, footer, legalPages } ou { product, store, pixels, footer }.
 */
import { createContext, useContext } from 'react';

const StorefrontSSRContext = createContext(null);

export function StorefrontSSRProvider({ value, children }) {
  return (
    <StorefrontSSRContext.Provider value={value || null}>
      {children}
    </StorefrontSSRContext.Provider>
  );
}

export function useStorefrontSSR() {
  return useContext(StorefrontSSRContext);
}
