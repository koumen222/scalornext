'use client';

/**
 * Guards du dashboard — ports 1:1 de App.jsx :
 *  - PageLoader          (loader plein écran)
 *  - Protected           (ProtectedRoute : auth + rôle + accès Rita)
 *  - RequireRole         (variante sans chrome, pour les pages sous un layout déjà authentifié)
 *  - RequireStore        (accès /ecom/boutique : au moins une boutique active, sinon wizard)
 *  - DashboardRedirect   (/ecom/dashboard → dashboard du rôle)
 *
 * Différence assumée vs SPA (auth localStorage) : la décision se prend dans un
 * useEffect (pas de localStorage au premier rendu → HTML serveur = loader, pas
 * de mismatch d'hydratation). Un très bref loader remplace le <Navigate> immédiat.
 */

import React, { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

import { useEcomAuth as useEcomAuthJs } from '@/src/ecom/hooks/useEcomAuth.jsx';
import { useStore as useStoreJs, isStoreEnabled } from '@/src/ecom/contexts/StoreContext.jsx';

const useEcomAuth = useEcomAuthJs as () => Record<string, any>;
const useStore = useStoreJs as () => Record<string, any>;

export type Role =
  | 'super_admin'
  | 'ecom_admin'
  | 'ecom_closeuse'
  | 'ecom_compta'
  | 'service_client'
  | 'livreur'
  | 'ecom_livreur';

export const ROLE_DASHBOARD_MAP: Record<string, string> = {
  super_admin: '/ecom/super-admin',
  ecom_admin: '/ecom/dashboard/admin',
  ecom_closeuse: '/ecom/dashboard/closeuse',
  ecom_compta: '/ecom/dashboard/compta',
  service_client: '/ecom/service-client',
  livreur: '/ecom/livreur',
  ecom_livreur: '/ecom/livreur',
};

// iso hasRitaAgentAccess (App.jsx)
function hasRitaAgentAccess(user: Record<string, any> | null): boolean {
  if (!user) return false;
  if (user.role === 'super_admin') return true;
  if (user.role !== 'ecom_admin') return false;
  return user.canAccessRitaAgent !== false;
}

function readLocalUser(): Record<string, any> | null {
  try {
    return JSON.parse(localStorage.getItem('ecomUser') || 'null');
  } catch {
    return null;
  }
}

export const PageLoader = ({ storeMode = false }: { storeMode?: boolean }) => (
  <div style={{
    minHeight: '100vh',
    backgroundColor: storeMode ? '#FFFFFF' : '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  }}>
    <div style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: '3px solid rgba(15,107,79,0.15)',
      borderTopColor: '#0F6B4F',
      animation: '_page-spin 0.6s linear infinite',
    }} />
    <style>{`@keyframes _page-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

interface GuardProps {
  requiredRole?: Role | Role[];
  requireRitaAgentAccess?: boolean;
  children: ReactNode;
}

/** Décision d'accès iso ProtectedRoute — retourne null (ok) ou l'URL de redirection. */
function decideRedirect(
  user: Record<string, any> | null,
  isAuthenticated: boolean,
  requiredRole?: Role | Role[],
  requireRitaAgentAccess?: boolean
): string | null {
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem('ecomToken');
  const localUser = user || readLocalUser();
  const effectiveAuth = isAuthenticated || (hasToken && !!localUser);
  const effectiveUser = user || localUser;

  if (!effectiveAuth) return '/ecom/login';

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (effectiveUser?.role !== 'super_admin' && !roles.includes(effectiveUser?.role)) {
      return ROLE_DASHBOARD_MAP[effectiveUser?.role] || '/ecom/login';
    }
  }

  if (requireRitaAgentAccess && !hasRitaAgentAccess(effectiveUser)) {
    return '/ecom/whatsapp/service';
  }

  return null;
}

export function Protected({ requiredRole, requireRitaAgentAccess = false, children }: GuardProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useEcomAuth();
  // Décision SYNCHRONE au 1er rendu : si l'utilisateur est déjà connu (token + user
  // en cache) et autorisé, on rend directement le contenu — plus de splash quand on
  // est connecté (le loader ne reste que pour un vrai boot non authentifié).
  const [status, setStatus] = useState<'checking' | 'ok'>(() =>
    (typeof window !== 'undefined'
      && decideRedirect(user, isAuthenticated, requiredRole, requireRitaAgentAccess) === null)
      ? 'ok'
      : 'checking'
  );

  useEffect(() => {
    const redirect = decideRedirect(user, isAuthenticated, requiredRole, requireRitaAgentAccess);
    if (redirect) {
      router.replace(redirect);
      return;
    }
    setStatus('ok');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated, requiredRole, requireRitaAgentAccess]);

  if (status !== 'ok') return <PageLoader />;
  return <>{children}</>;
}

/** Guard de rôle léger, pour les pages sous un layout qui a déjà vérifié l'auth. */
export function RequireRole({ requiredRole, requireRitaAgentAccess = false, children }: GuardProps) {
  return (
    <Protected requiredRole={requiredRole} requireRitaAgentAccess={requireRitaAgentAccess}>
      {children}
    </Protected>
  );
}

/** iso RequireStore (App.jsx) : /ecom/boutique exige au moins une boutique activée. */
export function RequireStore({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { workspace } = useEcomAuth();
  const { stores, loading: storesLoading } = useStore();
  const workspaceId = workspace?._id || workspace?.id || null;

  const hasAccessibleStore = Array.isArray(stores) && stores.some(isStoreEnabled as (s: any) => boolean);
  const mustRedirect = !storesLoading && workspaceId && !hasAccessibleStore;

  useEffect(() => {
    if (mustRedirect) {
      const qs = searchParams?.toString();
      const from = `${pathname}${qs ? `?${qs}` : ''}`;
      try {
        sessionStorage.setItem('__rr_state:/ecom/boutique/wizard', JSON.stringify({ from }));
      } catch { /* stash best-effort (iso state React Router) */ }
      router.replace('/ecom/boutique/wizard');
    }
  }, [mustRedirect, pathname, searchParams, router]);

  if (storesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#0F6B4F' }} />
      </div>
    );
  }

  if (mustRedirect) return <PageLoader />;
  return <>{children}</>;
}

/** iso DashboardRedirect (App.jsx) : /ecom/dashboard → dashboard du rôle. */
export function DashboardRedirect() {
  const router = useRouter();
  const { user, isAuthenticated } = useEcomAuth();

  useEffect(() => {
    const hasToken = !!localStorage.getItem('ecomToken');
    const localUser = user || readLocalUser();
    const effectiveAuth = isAuthenticated || (hasToken && !!localUser);
    const effectiveUser = user || localUser;

    if (!effectiveAuth) {
      router.replace('/ecom/login');
      return;
    }
    router.replace(ROLE_DASHBOARD_MAP[effectiveUser?.role] || '/ecom/dashboard/admin');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthenticated]);

  return <PageLoader />;
}
