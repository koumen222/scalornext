import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from '@/lib/router-compat';
import { useEcomAuth } from '../hooks/useEcomAuth';
import { useDmUnread } from '../hooks/useDmUnread';
import { useStore } from '../contexts/StoreContext.jsx';
import StoreSwitcher from './StoreSwitcher.jsx';
import { usePlatformT, usePlatformLang } from '../i18n/platform.js';
import StoreAssistantChat from './StoreAssistantChat.jsx';
import OnboardingJourney from './OnboardingJourney.jsx';
import PlatformLanguageSelector from './PlatformLanguageSelector.jsx';

// ── Boutique Sidebar Navigation ──────────────────────────────────────────────
const BOUTIQUE_NAV = [
  {
    name: 'Dashboard',
    href: '/ecom/boutique',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    exact: true,
  },
  {
    name: 'Commandes',
    href: '/ecom/boutique/orders',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    name: 'Analyses',
    href: '/ecom/boutique/analyses',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    name: 'Solde',
    href: '/ecom/boutique/wallet',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4h-4z" />
      </svg>
    ),
  },
  {
    name: 'Produits',
    href: '/ecom/boutique/products',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    children: [
      { name: 'Tous les produits', href: '/ecom/boutique/products' },
      { name: 'Collections', href: '/ecom/boutique/products/collections' },
      { name: 'Médiathèque IA', href: '/ecom/boutique/products/media' },
      { name: 'Catégories', href: '/ecom/boutique/products/categories' },
      { name: 'Stock', href: '/ecom/boutique/products/stock' },
    ],
  },
  {
    name: 'Personnalisation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    children: [
      { name: 'Theme Builder', href: '/ecom/boutique/page-builder' },
      { name: 'Mise en page', href: '/ecom/boutique/theme?tab=layout' },
      { name: 'Couleurs', href: '/ecom/boutique/theme?tab=colors' },
      { name: 'Typographie', href: '/ecom/boutique/theme?tab=typo' },
      { name: 'Boutons & Styles', href: '/ecom/boutique/theme?tab=buttons' },
      { name: 'Éléments', href: '/ecom/boutique/theme?tab=elements' },
      { name: 'Aperçu', href: '/ecom/boutique/theme?tab=preview' },
    ],
  },
  {
    name: 'Manager de formulaire',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    children: [
      { name: 'Créateur de formulaire', href: '/ecom/boutique/form-builder' },
      { name: 'Offres de quantité', href: '/ecom/boutique/form-builder/quantity-offers' },
      { name: 'Upsells & Downsells', href: '/ecom/boutique/form-builder/upsells' },
      { name: 'Intégrations et messagerie', href: '/ecom/boutique/form-builder/integrations' },
      { name: 'Analytique', href: '/ecom/boutique/form-builder/analytics' },
      { name: 'Paramètres', href: '/ecom/boutique/form-builder/settings' },
      { name: 'Forfait', href: '/ecom/boutique/form-builder/plan' },
    ],
  },
  {
    name: 'Réglages',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    children: [
      { name: 'Paiements', href: '/ecom/boutique/payments' },
      { name: 'Livraison', href: '/ecom/boutique/delivery-zones' },
      { name: 'Domaines', href: '/ecom/boutique/domains' },
      { name: 'Pixel & Tracking', href: '/ecom/boutique/pixel' },
      { name: 'Paramètres généraux', href: '/ecom/boutique/settings' },
    ],
  },
];

// ── Mobile bottom tabs (5 max) ───────────────────────────────────────────────
const MOBILE_TABS = ['Dashboard', 'Commandes', 'Produits', 'Analyses'];

// Next.js (App Router) : le layout reçoit `children` au lieu de rendre <Outlet/>.
// (children ?? <Outlet/> conservé pour compat — Outlet jette une erreur explicite si utilisé.)
const BoutiqueLayoutInner = ({ children }) => {
  const t = usePlatformT();
  const platformLang = usePlatformLang();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, workspace } = useEcomAuth();
  const { stores, activeStore, loading: storeLoading, getActiveStorefrontUrl } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [entering, setEntering] = useState(true);

  // Toast notification (nouvelle commande)
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((data) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(data);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // Activer le socket (singleton partagé) pour recevoir notification:new
  useDmUnread();

  // Écouter les événements de notification dispatché par useDmUnread
  useEffect(() => {
    const handler = (e) => {
      const notif = e.detail;
      if (!notif) return;
      showToast({ title: notif.title || '🔔 Notification', body: notif.message || '', type: notif.type || 'info' });
    };
    window.addEventListener('ecom:notification', handler);
    return () => window.removeEventListener('ecom:notification', handler);
  }, [showToast]);

  const storeUrl = useCallback((path = '/') => getActiveStorefrontUrl(path) || '#', [getActiveStorefrontUrl]);

  // Entry animation
  useEffect(() => {
    const t = setTimeout(() => setEntering(false), 400);
    return () => clearTimeout(t);
  }, []);

  const [expandedParent, setExpandedParent] = useState(null);
  const [mobileExpandedGroup, setMobileExpandedGroup] = useState(null);

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.href;
    if (item.href) return location.pathname.startsWith(item.href);
    return false;
  };

  const isParentActive = (item) => {
    if (!item.children) return false;
    return item.children.some(c => {
      const [cPath] = (c.href || '').split('?');
      return location.pathname === cPath || location.pathname.startsWith(cPath + '/');
    });
  };

  // Auto-expand parent when a child is active
  useEffect(() => {
    const parent = BOUTIQUE_NAV.find(i => i.children && isParentActive(i));
    if (parent) setExpandedParent(parent.name);
  }, [location.pathname, location.search]);

  const mobileTabs = useMemo(() => BOUTIQUE_NAV.filter(i => !i.children && MOBILE_TABS.includes(i.name)), []);
  const mobileMoreItems = useMemo(() => {
    const items = [];
    BOUTIQUE_NAV.forEach(i => {
      if (i.children) {
        // Keep as group with children
        items.push({ ...i, isGroup: true });
      } else if (!MOBILE_TABS.includes(i.name)) {
        items.push(i);
      }
    });
    return items;
  }, []);

  const storeName = activeStore?.storeSettings?.storeName || activeStore?.name || workspace?.name || 'Ma Boutique';
  const layoutAccentColor = '#0F6B4F';
  const layoutAccentSoft = '#0F6B4F20';

  // Show spinner only while stores are actively loading
  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border rounded-full animate-spin" style={{ borderTopColor: '#0F6B4F' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col lg:flex-row max-w-[100vw] overflow-x-hidden">

      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[240px] lg:fixed lg:inset-y-0 z-30 bg-sidebar border-r border-sidebar-border">
        <div className="flex flex-col h-full">

          {/* Header — Boutique branding */}
          <div className="px-4 pt-4 pb-3 border-b border-border">
            <button
              onClick={() => navigate('/ecom/dashboard/admin')}
              data-tour="back-to-scalor"
              className="w-full flex items-center justify-center gap-2 mb-3 px-3 py-2.5 rounded-xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/15 hover:border-primary/40 transition group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t('Retour à Scalor')}</span>
            </button>
            <StoreSwitcher>
              <div className="flex items-center gap-3 rounded-xl px-2 py-1.5 -mx-2 hover:bg-background transition-colors">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: layoutAccentSoft }}>
                  <svg className="w-5 h-5" style={{ color: layoutAccentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{storeName}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{t('Module Boutique')}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                </svg>
              </div>
            </StoreSwitcher>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {BOUTIQUE_NAV.map((item) => {
              // ── Parent with children ──
              if (item.children) {
                const parentActive = isParentActive(item);
                const expanded = expandedParent === item.name;
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => setExpandedParent(expanded ? null : item.name)}
                      data-tour={`nav-${item.name}`}
                      className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors duration-150 ${
                        parentActive
                          ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      }`}
                    >
                      <span className={`flex-shrink-0 ${parentActive ? 'text-sidebar-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate flex-1 text-left">{t(item.name)}</span>
                      <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''} text-muted-foreground`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {expanded && (
                      <div className="ml-5 pl-3 border-l-2 border-border mt-1 space-y-0.5">
                        {item.children.map(child => {
                          const [childPath, childQuery] = (child.href || '').split('?');
                          const childActive = location.pathname === childPath && (!childQuery || location.search === `?${childQuery}`);
                          return (
                            <Link
                              key={child.href}
                              to={child.href}
                              className={`block px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                                childActive
                                  ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                              }`}
                            >
                              {t(child.name)}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // ── Simple link ──
              const active = isActive(item);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`}
                >
                  <span className={`flex-shrink-0 ${active ? 'text-sidebar-foreground' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate flex-1">{t(item.name)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom: Preview store link */}
          <div className="border-t border-border p-3">
            <a
              href={storeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition group"
            >
              <svg className="w-5 h-5 text-muted-foreground group-hover:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span>{t('Voir ma boutique')}</span>
            </a>
          </div>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 lg:ml-[240px] transition-all duration-500 ${entering ? 'opacity-0' : 'opacity-100'}`}
        style={{ paddingRight: 'var(--store-assistant-dock, 0px)', transition: 'padding-right 200ms ease' }}
      >

        {/* Mobile header */}
        {!location.pathname.includes('/form-builder') && <header className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-card border-b border-border">
          <div className="flex items-center justify-between h-14 px-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/ecom/dashboard/admin')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary/25 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/15 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>{t('Scalor')}</span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: layoutAccentSoft }}>
                  <svg className="w-4 h-4" style={{ color: layoutAccentColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-foreground">{t('Boutique')}</span>
              </div>
            </div>
            <a
              href={storeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-muted transition"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </header>}

        {/* Desktop header */}
        {!location.pathname.includes('/form-builder') && <header className="hidden lg:flex border-b h-14 items-center px-6 fixed top-0 left-[240px] z-20 bg-card border-border" style={{ right: 'var(--store-assistant-dock, 0px)', transition: 'right 200ms ease' }}>
          <h1 className="text-[15px] font-semibold text-foreground">
            {getBoutiquePageTitle(location.pathname, t)}
          </h1>
          <div className="flex-1" />
          <PlatformLanguageSelector compact />
        </header>}

        {/* Page content */}
        <main className={`flex-1 overflow-x-hidden pb-20 lg:pb-0 ${location.pathname.includes('/form-builder') ? 'pt-0' : 'pt-14 lg:pt-14'}`}
          style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
          <React.Fragment key={`${activeStore?._id || 'no-active-store'}-${platformLang}`}>{children ?? <Outlet />}</React.Fragment>
        </main>
      </div>

      {/* Assistant IA général boutique — masqué sur les builders et le thème (IA dédiée) */}
      {!location.pathname.includes('builder') && !location.pathname.includes('/form-builder') && !location.pathname.includes('/boutique/theme') && (
        <StoreAssistantChat storeName={storeName} />
      )}

      {/* Visite guidée multi-pages (phase boutique) */}
      <OnboardingJourney />

      {/* ── Mobile Bottom Tab Bar ──────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-stretch px-2" style={{ height: '60px' }}>
          {mobileTabs.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex flex-col items-center justify-center flex-1 gap-1 transition-all duration-200 active:scale-95"
              >
                <span className={`transition-colors duration-200 ${active ? '' : 'text-muted-foreground'}`} style={active ? { color: layoutAccentColor } : {}}>
                  {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
                </span>
                <span className={`text-[10px] font-medium leading-none transition-colors duration-200 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {t(item.name)}
                </span>
              </Link>
            );
          })}

          {/* More menu */}
          <div className="relative flex-1">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-200 active:scale-95"
            >
              <svg className={`w-5 h-5 transition-colors duration-200 ${moreOpen ? 'text-[#0F6B4F]' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01" />
                <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
              </svg>
              <span className={`text-[10px] font-medium leading-none ${moreOpen ? 'text-foreground' : 'text-muted-foreground'}`}>{t('Plus')}</span>
            </button>

            {moreOpen && (
              <>
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[45]" onClick={() => setMoreOpen(false)} />
                <div className="fixed bottom-0 left-0 right-0 z-50 px-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
                  <div className="bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl mb-2">
                    <div className="px-5 pt-3 pb-2">
                      <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("Plus d'options")}</p>
                    </div>
                    <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto overscroll-contain">
                      {mobileMoreItems.map((item) => {
                        if (item.isGroup) {
                          const groupExpanded = mobileExpandedGroup === item.name;
                          const groupActive = isParentActive(item);
                          return (
                            <div key={item.name}>
                              <button
                                onClick={() => setMobileExpandedGroup(groupExpanded ? null : item.name)}
                                className={`flex items-center gap-4 px-5 py-4 w-full text-left text-[16px] font-medium active:bg-muted transition-colors ${groupActive ? '' : 'text-foreground'}`}
                                style={groupActive ? { color: layoutAccentColor } : {}}
                              >
                                <span className={`flex-shrink-0 ${groupActive ? '' : 'text-muted-foreground'}`} style={groupActive ? { color: layoutAccentColor } : {}}>
                                  {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
                                </span>
                                <span className="flex-1 truncate">{t(item.name)}</span>
                                <svg className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${groupExpanded ? 'rotate-180' : ''} text-muted-foreground`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                              {groupExpanded && (
                                <div className="bg-background/80 pb-1">
                                  {item.children.map(child => {
                                    const [childPath, childQuery] = (child.href || '').split('?');
                                    const childActive = location.pathname === childPath && (!childQuery || location.search === `?${childQuery}`);
                                    return (
                                      <Link
                                        key={child.href}
                                        to={child.href}
                                        onClick={() => setMoreOpen(false)}
                                        className={`flex items-center gap-3 pl-14 pr-5 py-3 text-[15px] font-medium active:bg-gray-200 transition-colors ${childActive ? '' : 'text-muted-foreground'}`}
                                        style={childActive ? { color: layoutAccentColor } : {}}
                                      >
                                        <span className="truncate">{t(child.name)}</span>
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        }
                        const active = isActive(item);
                        return (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={() => setMoreOpen(false)}
                            className={`flex items-center gap-4 px-5 py-4 text-[16px] font-medium active:bg-muted transition-colors ${active ? '' : 'text-foreground'}`}
                            style={active ? { color: layoutAccentColor } : {}}
                          >
                            <span className={`flex-shrink-0 ${active ? '' : 'text-muted-foreground'}`} style={active ? { color: layoutAccentColor } : {}}>
                              {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
                            </span>
                            <span className="flex-1 truncate">{t(item.name)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Toast notification nouvelle commande ───────────────────────────── */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: 'fixed', top: 72, right: 12, zIndex: 200,
            maxWidth: 320, width: 'calc(100vw - 24px)',
            backgroundColor: '#fff', border: '1px solid #E5E7EB',
            borderLeft: `4px solid ${toast.type === 'order_new' ? '#10B981' : '#6366F1'}`,
            borderRadius: 14, padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            animation: 'slide-in-toast 0.3s ease-out',
            cursor: 'pointer',
          }}
        >
          <style>{`@keyframes slide-in-toast { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
          <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#111' }}>{toast.title}</p>
          {toast.body && <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.4 }}>{toast.body}</p>}
        </div>
      )}
    </div>
  );
};

const getBoutiquePageTitle = (pathname, t = (x) => x) => {
  if (pathname === '/ecom/boutique') return t('Dashboard Boutique');
  if (pathname.includes('/boutique/analyses')) return t('Analyses de données');
  if (pathname.includes('/boutique/products/new')) return t('Nouveau produit');
  if (pathname.includes('/boutique/products') && pathname.includes('/edit')) return t('Modifier produit');
  if (pathname.includes('/boutique/products')) return t('Produits');
  if (pathname.includes('/boutique/orders')) return t('Commandes');
  if (pathname.includes('/boutique/wallet')) return t('Solde Scalor Pay');
  if (pathname.includes('/boutique/page-builder')) return t('Theme Builder');
  if (pathname.includes('/boutique/theme')) return t('Thème & Apparence');
  if (pathname.includes('/boutique/pages')) return t('Pages');
  if (pathname.includes('/boutique/pixel')) return t('Pixel & Tracking');
  if (pathname.includes('/boutique/payments')) return t('Paiements');
  if (pathname.includes('/boutique/delivery-zones')) return t('Zones de livraison');
  if (pathname.includes('/boutique/domains')) return t('Domaines');
  if (pathname.includes('/boutique/form-builder/quantity-offers')) return t('Offres de quantité');
  if (pathname.includes('/boutique/form-builder/upsells')) return t('Upsells & Downsells');
  if (pathname.includes('/boutique/form-builder/integrations')) return t('Intégrations et messagerie');
  if (pathname.includes('/boutique/form-builder/analytics')) return t('Analytique');
  if (pathname.includes('/boutique/form-builder/settings')) return t('Paramètres EasySell');
  if (pathname.includes('/boutique/form-builder/plan')) return t('Forfait');
  if (pathname.includes('/boutique/form-builder')) return t('Créateur de formulaire');
  if (pathname.includes('/boutique/product-settings')) return t('Paramètres Page Produit');
  if (pathname.includes('/boutique/theme')) return t('Thème & Design');
  if (pathname.includes('/creative-generator')) return t('Générateur de Créas');
  if (pathname.includes('/boutique/settings')) return t('Paramètres & Branding');
  return t('Boutique');
};

export default BoutiqueLayoutInner;
