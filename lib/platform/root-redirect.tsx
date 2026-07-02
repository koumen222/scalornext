'use client';

/**
 * RootRedirect — comportement iso à App.jsx (utilisé sur / et /ecom) :
 * non authentifié → /ecom/landing ; sinon dashboard selon le rôle.
 * Auth = token localStorage, donc décision côté client uniquement.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  super_admin: '/ecom/super-admin',
  ecom_admin: '/ecom/dashboard/admin',
  ecom_closeuse: '/ecom/dashboard/closeuse',
  ecom_compta: '/ecom/dashboard/compta',
  livreur: '/ecom/livreur',
  ecom_livreur: '/ecom/livreur',
};

export default function RootRedirect() {
  const router = useRouter();

  useEffect(() => {
    let user: { role?: string } | null = null;
    try {
      user = JSON.parse(localStorage.getItem('ecomUser') || 'null');
    } catch {
      user = null;
    }
    const hasSession = !!localStorage.getItem('ecomToken') && !!user;

    if (!hasSession) {
      router.replace('/ecom/landing');
      return;
    }
    router.replace((user?.role && ROLE_DASHBOARD_MAP[user.role]) || '/ecom/dashboard');
  }, [router]);

  // Loader identique au PageLoader de la SPA
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(15,107,79,0.15)', borderTopColor: '#0F6B4F', animation: '_page-spin 0.6s linear infinite' }} />
      <style>{`@keyframes _page-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
