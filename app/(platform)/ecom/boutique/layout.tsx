'use client';

/**
 * Racine /ecom/boutique — iso <Route element={<StoreProvider/>}> d'App.jsx :
 * Protected(ecom_admin) + StoreProvider persistant (wizard ↔ builders ↔ chrome).
 */
import type { ReactNode } from 'react';
import { BoutiqueRoot } from '@/lib/dashboard/chrome';

export default function BoutiqueRootLayout({ children }: { children: ReactNode }) {
  return <BoutiqueRoot>{children}</BoutiqueRoot>;
}
