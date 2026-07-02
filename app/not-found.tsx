'use client';

/**
 * Catch-all iso SPA : toute route plateforme inconnue → /ecom/login
 * (cf. <Route path="*" element={<Navigate to="/ecom/login" replace />} /> dans App.jsx).
 * Les routes inconnues des boutiques sont gérées par le catch-all de app/sites|store.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ecom/login');
  }, [router]);

  return null;
}
