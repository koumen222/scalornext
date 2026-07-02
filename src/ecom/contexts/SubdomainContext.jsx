'use client';

/**
 * SubdomainContext — valeur injectée par les layouts serveur (middleware multi-tenant).
 * Permet à useSubdomain() de retourner la même valeur au SSR et à l'hydratation
 * (la détection window.location de la SPA provoquerait un mismatch en SSR).
 */
import { createContext, useContext } from 'react';

export const SubdomainContext = createContext(null);

export function SubdomainProvider({ value, children }) {
  return (
    <SubdomainContext.Provider value={value}>
      {children}
    </SubdomainContext.Provider>
  );
}

export function useSubdomainOverride() {
  return useContext(SubdomainContext);
}
