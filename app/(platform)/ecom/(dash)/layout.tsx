'use client';

/**
 * Layout du groupe (dash) — toutes les pages "LayoutRoute" de la SPA :
 * auth requise + EcomLayout persistant entre navigations (iso StableLayout).
 * Les rôles par route sont vérifiés dans chaque wrapper de page (RequireRole).
 */
import type { ReactNode } from 'react';
import { DashboardChrome } from '@/lib/dashboard/chrome';

export default function DashLayout({ children }: { children: ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>;
}
