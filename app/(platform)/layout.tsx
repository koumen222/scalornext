import type { ReactNode } from 'react';
import PlatformProviders from '@/lib/platform/providers';

/**
 * Layout du groupe (platform) — routes SaaS (/ecom/*, /affiliate/*, /provider).
 * Monte la hiérarchie de providers de la SPA (voir lib/platform/providers.tsx).
 * Les arbres storefront (app/sites, app/store) ne passent PAS par ici.
 */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformProviders>{children}</PlatformProviders>;
}
