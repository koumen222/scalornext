/**
 * StorefrontShell — Server Component partagé par les deux arbres storefront :
 *  - app/sites/[subdomain]/   (accès par sous-domaine / domaine custom via middleware, hostMode=true)
 *  - app/store/[subdomain]/   (accès par chemin, previews iframe & dev, hostMode=false)
 *
 * Réplique la hiérarchie de providers de la SPA :
 *  - hostMode  : EcomAuthProvider > ThemeProvider(subdomain) (cf. StoreApp dans App.jsx)
 *  - path mode : EcomAuthProvider > ThemeProvider() (cf. EcomApp)
 * + SubdomainProvider (valeur SSR-safe) + StorefrontSSRProvider (payload API, ISR 60s).
 */

import type { ReactNode } from 'react';
import { getStorePayload } from './api';
import {
  EcomAuthProvider,
  ThemeProvider,
  SubdomainProvider,
  StorefrontSSRProvider,
  VersionWatcher,
} from './clients';

interface StorefrontShellProps {
  subdomain: string;
  hostMode?: boolean;
  children: ReactNode;
}

export default async function StorefrontShell({
  subdomain,
  hostMode = false,
  children,
}: StorefrontShellProps) {
  const payload = await getStorePayload(subdomain);

  const subdomainValue = hostMode
    ? { subdomain, isStoreDomain: true, isCustomDomain: false }
    : { subdomain: null, isStoreDomain: false, isCustomDomain: false };

  return (
    <EcomAuthProvider>
      <ThemeProvider subdomain={hostMode ? subdomain : null}>
        <SubdomainProvider value={subdomainValue}>
          <StorefrontSSRProvider value={payload}>
            <div className="min-h-screen">
              {children}
              <VersionWatcher />
            </div>
          </StorefrontSSRProvider>
        </SubdomainProvider>
      </ThemeProvider>
    </EcomAuthProvider>
  );
}
