'use client';

/**
 * Espace dédié /ecom/creatives — chrome propre au Creative Center.
 * Contrairement aux pages du groupe (dash), il NE monte PAS l'EcomLayout
 * (sidebar principale) : le Creative Center a sa propre navigation latérale
 * (voir src/ecom/pages/CreativeCenter.jsx) et occupe tout l'espace, comme
 * l'espace Boutique. Auth + rôle ecom_admin garantis ici.
 */
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { Protected, PageLoader } from '@/lib/dashboard/guards';

export default function CreativeSpaceLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Protected requiredRole="ecom_admin">
        <Suspense fallback={<PageLoader />}>{children}</Suspense>
      </Protected>
    </Suspense>
  );
}
