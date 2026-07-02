'use client';

/**
 * Chromes du dashboard — équivalents App Router des wrappers App.jsx :
 *  - DashboardChrome   = ProtectedRoute(auth) + StableLayout (EcomLayout persistant)
 *  - BoutiqueChrome    = RequireStore + KeyedBoutiqueLayout (remount au changement de boutique)
 *  - StoreProviderClient / autres réexports typés pour les layouts/pages
 *
 * La <Suspense> en tête couvre useSearchParams/useLocation (router-compat)
 * utilisés par EcomLayout et la plupart des pages (obligatoire au prerender).
 */

import React, { Suspense, type ComponentType, type ReactNode } from 'react';

import EcomLayoutJs from '@/src/ecom/components/EcomLayout.jsx';
import BoutiqueLayoutJs from '@/src/ecom/components/BoutiqueLayout.jsx';
import { StoreProvider as StoreProviderJs, useStore as useStoreJs } from '@/src/ecom/contexts/StoreContext.jsx';
import { Protected, RequireStore, PageLoader } from './guards';

const EcomLayout = EcomLayoutJs as ComponentType<{ children?: ReactNode }>;
const BoutiqueLayout = BoutiqueLayoutJs as ComponentType<{ children?: ReactNode }>;
const useStore = useStoreJs as () => Record<string, any>;

export const StoreProviderClient = StoreProviderJs as ComponentType<{ children?: ReactNode }>;

/** iso KeyedBoutiqueLayout (App.jsx) : remount complet quand activeStore change. */
function KeyedBoutiqueLayout({ children }: { children: ReactNode }) {
  const { activeStore } = useStore();
  return <BoutiqueLayout key={activeStore?._id || 'no-store'}>{children}</BoutiqueLayout>;
}

/** Layout du groupe (dash) : auth + EcomLayout, iso LayoutRoute sans rôle.
 *  Les rôles par page restent dans les wrappers (<RequireRole …>). */
export function DashboardChrome({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Protected>
        <EcomLayout>
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </EcomLayout>
      </Protected>
    </Suspense>
  );
}

/** Layout de la section boutique gérée : RequireStore + BoutiqueLayout keyé. */
export function BoutiqueChrome({ children }: { children: ReactNode }) {
  return (
    <RequireStore>
      <KeyedBoutiqueLayout>{children}</KeyedBoutiqueLayout>
    </RequireStore>
  );
}

/** Racine de la section /ecom/boutique : Protected(ecom_admin) + StoreProvider
 *  persistant entre wizard, builders et pages chrome (iso <Route element={<StoreProvider/>}>). */
export function BoutiqueRoot({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Protected requiredRole="ecom_admin">
        <StoreProviderClient>{children}</StoreProviderClient>
      </Protected>
    </Suspense>
  );
}

export { RequireStore, PageLoader };
