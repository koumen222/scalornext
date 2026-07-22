'use client';

/**
 * PlatformProviders — hiérarchie de providers de la plateforme SaaS,
 * iso EcomAppWithAuth/EcomApp (App.jsx) :
 *   AppErrorBoundary > EcomAuthProvider > CurrencyProvider > ThemeProvider > PlanGateProvider
 *   + PageViewTracker (analytics) + VersionWatcher.
 *
 * Titres : metadata Next côté serveur pour les pages publiques (lib/platform/meta.ts)
 * + PlatformPageMeta côté client à chaque navigation (iso SPA, couvre le dashboard).
 */

import React, { Suspense, useEffect, type ComponentType, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { EcomAuthProvider as EcomAuthProviderJs } from '@/src/ecom/hooks/useEcomAuth.jsx';
import { CurrencyProvider as CurrencyProviderJs } from '@/src/ecom/contexts/CurrencyContext.jsx';
import { ThemeProvider as ThemeProviderJs } from '@/src/ecom/contexts/ThemeContext.jsx';
import { PlanGateProvider as PlanGateProviderJs } from '@/src/ecom/contexts/PlanGateContext.jsx';
import VersionWatcherJs from '@/src/ecom/components/VersionWatcher.jsx';
import { usePosthogPageViews } from '@/src/ecom/hooks/usePosthogPageViews.js';
import PlatformPageMeta from './page-meta';

const EcomAuthProvider = EcomAuthProviderJs as ComponentType<{ children?: ReactNode }>;
const CurrencyProvider = CurrencyProviderJs as ComponentType<{ children?: ReactNode }>;
const ThemeProvider = ThemeProviderJs as ComponentType<{ children?: ReactNode }>;
const PlanGateProvider = PlanGateProviderJs as ComponentType<{ children?: ReactNode }>;
const VersionWatcher = VersionWatcherJs as ComponentType;

// ─── ErrorBoundary — porté tel quel d'App.jsx ───────────────────────────────

class AppErrorBoundary extends React.Component<{ children?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error('[AppErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', margin: '0 0 8px' }}>
              Une erreur est survenue
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 20px' }}>
              Rechargez la page pour continuer.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#0F6B4F',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Tracking — porté d'App.jsx (PageViewTracker) sur next/navigation ───────

function PageViewTracker() {
  const pathname = usePathname();
  usePosthogPageViews();

  useEffect(() => {
    // Lazy-import analytics — garde axios/ecommApi hors du bundle critique (iso SPA)
    import('@/src/ecom/services/analytics.js')
      .then((m) => m.trackPageView(pathname))
      .catch(() => {});

    import('@/src/utils/analytics.js')
      .then((m) => {
        const analytics = m.default;
        analytics.trackPageView(pathname, {
          title: document.title,
          referrer: document.referrer,
        });
      })
      .catch(() => {});
  }, [pathname]);

  return null;
}

// ─── Tracking affiliation (programme Scalor) — porté d'App.jsx ──────────────
// À chaque navigation : capture ?aff=&aff_link=&aff_click= (last-click, 60j)
// puis envoie une visite référée au backend si une attribution est active.
// Exclut le portail affilié et l'app interne authentifiée pour ne tracker que
// le parcours public (landing → inscription).

function AffiliateVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@/src/ecom/utils/affiliateAttribution.js');
        if (cancelled) return;
        mod.captureAffiliateAttributionFromSearch(window.location.search);
        const path = pathname || '/';
        const isAffiliatePortal = path.startsWith('/affiliate');
        const isAuthedApp = path.startsWith('/ecom/') && !!localStorage.getItem('ecomToken')
          && !['/ecom/register', '/ecom/login', '/ecom/tarifs', '/ecom/pricing', '/ecom/landing'].some((p) => path.startsWith(p));
        if (!isAffiliatePortal && !isAuthedApp) {
          mod.trackAffiliateVisit(path);
        }
      } catch { /* tracking best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  return null;
}

// ─── Composition ────────────────────────────────────────────────────────────

export default function PlatformProviders({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <EcomAuthProvider>
        <CurrencyProvider>
          <ThemeProvider>
            <PlanGateProvider>
              <div className="min-h-screen">
                {/* useSearchParams (via useLocation) → Suspense obligatoire, isolé au tracker
                    pour ne pas dégrader le HTML statique des pages SEO */}
                <Suspense fallback={null}>
                  <PageViewTracker />
                </Suspense>
                {/* Attribution + visites référées du programme d'affiliation (fenêtre 60j) */}
                <Suspense fallback={null}>
                  <AffiliateVisitTracker />
                </Suspense>
                {/* Titres/OG côté client à chaque navigation — iso PlatformPageMeta (App.jsx).
                    Valeurs identiques aux metadata Next des pages publiques. */}
                <PlatformPageMeta />
                {children}
                <VersionWatcher />
              </div>
            </PlanGateProvider>
          </ThemeProvider>
        </CurrencyProvider>
      </EcomAuthProvider>
    </AppErrorBoundary>
  );
}
