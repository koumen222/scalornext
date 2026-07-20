import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useLocation, useNavigate } from '@/lib/router-compat';
import { useEcomAuth } from '../hooks/useEcomAuth';
import CurrencySelector from './CurrencySelector.jsx';
import NotificationPanel from './NotificationPanel.jsx';
import { useNotifications } from '../hooks/useNotifications';
import NotificationModal from './NotificationModal.jsx';
import PushNotificationBanner from './PushNotificationBanner.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import TrialBanner from './TrialBanner.jsx';
import SubscriptionWarningBanner from './SubscriptionWarningBanner.jsx';
import { useDmUnread } from '../hooks/useDmUnread.js';
import GlobalSearch from './GlobalSearch.jsx';
import WorkspaceSwitcherMenu from './WorkspaceSwitcherMenu.jsx';
import WorkspaceSwitcher from './WorkspaceSwitcher.jsx';
import { ThemeToggle } from '@/components/theme-toggle';
import TopLoader from './TopLoader.jsx';
import SupportChatWidget from './SupportChatWidget.jsx';
import { usePlanGate } from '../contexts/PlanGateContext.jsx';
import { usePlatformT, usePlatformLang, tp } from '../i18n/platform.js';
import PlatformLanguageSelector from './PlatformLanguageSelector.jsx';
import StoreAssistantChat from './StoreAssistantChat.jsx';

const EcomLayoutComponent = ({ children }) => {
  const { user, workspace, logout } = useEcomAuth();
  const t = usePlatformT();
  const platformLang = usePlatformLang();
  const { hasPlan, requirePlan, planInfo } = usePlanGate();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const userMenuRef = useRef(null);
  const notifRef = useRef(null);
  const { unreadCount, refreshCount } = useNotifications();
  const { unreadDm, clearUnread, lastMessage, clearLastMessage } = useDmUnread();

  // ── Tutorial popup ──
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (user?.role === 'ecom_livreur') return;
    const storageKey = `ecom_tutorial_shown_${user.id}`;
    if (localStorage.getItem(storageKey)) return;
    const timer = setTimeout(() => {
      setShowTutorial(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [user?.id]);

  const closeTutorial = () => {
    setShowTutorial(false);
    const storageKey = `ecom_tutorial_shown_${user?.id}`;
    localStorage.setItem(storageKey, '1');
  };

  // ── Toast notification in-app ──
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((data) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(data);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // 1. Écouter notification:new via WebSocket (relayé par useDmUnread → window event)
  useEffect(() => {
    const handleNotification = (event) => {
      const notif = event.detail;
      if (!notif) return;
      showToast({
        title: notif.title || 'Nouvelle notification',
        body: notif.message || '',
        type: notif.type || 'info',
      });
      // refreshCount géré par useNotifications qui écoute aussi ecom:notification
    };
    window.addEventListener('ecom:notification', handleNotification);
    return () => window.removeEventListener('ecom:notification', handleNotification);
  }, [showToast]);

  // 2. Déclencher le toast quand un DM arrive via WebSocket (lastMessage du hook useDmUnread)
  useEffect(() => {
    if (!lastMessage) return;
    if (location.pathname.startsWith('/ecom/chat')) {
      clearLastMessage();
      return;
    }
    const preview = lastMessage.content.length > 60 ? lastMessage.content.slice(0, 60) + '…' : lastMessage.content;
    showToast({
      title: lastMessage.channel
        ? `#${lastMessage.channel} — ${lastMessage.senderName}`
        : `Message de ${lastMessage.senderName}`,
      body: preview,
      type: 'new_message',
    });
    refreshCount();
    clearLastMessage();
  }, [lastMessage, showToast, refreshCount, clearLastMessage, location.pathname]);

  // 3. Écouter les push notifications via Service Worker (fallback)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSWMessage = (event) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        const payload = event.data.payload || {};
        showToast({
          title: payload.title || '📣 Nouvelle notification',
          body: payload.body || '',
          type: payload.type || 'info',
        });
        refreshCount();
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [showToast, refreshCount]);

  // Utilisateur et workspace actifs
  const displayUser = user;
  const displayWorkspace = workspace;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/ecom/login');
  };

  const roleDashboardMap = {
    'super_admin': '/ecom/super-admin',
    'ecom_admin': '/ecom/dashboard/admin',
    'ecom_closeuse': '/ecom/dashboard/closeuse',
    'ecom_compta': '/ecom/dashboard/compta',
    'ecom_livreur': '/ecom/livreur',
    'service_client': '/ecom/service-client'
  };

  const dashboardPath = roleDashboardMap[displayUser?.role] || '/ecom/dashboard';

  const roleLabel = {
    'super_admin': t('Super Admin'),
    'ecom_admin': t('Admin'),
    'ecom_closeuse': t('Closeuse'),
    'ecom_compta': t('Comptabilité'),
    'ecom_livreur': t('Livreur'),
    'service_client': t('Service Client')
  };

  const roleColors = {
    'super_admin': 'bg-gradient-to-br from-primary-700 to-primary-900',
    'ecom_admin': 'bg-scalor-green',
    'ecom_closeuse': 'bg-scalor-copper',
    'ecom_compta': 'bg-primary',
    'ecom_livreur': 'bg-amber-600'
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isServiceClient = user?.role === 'service_client';
  const useAdminLayout = isSuperAdmin || isServiceClient;
  const fallbackTrialActive = !!workspace?.trialEndsAt && new Date(workspace.trialEndsAt) > new Date();
  const isTrialActive = Boolean(planInfo?.trial?.active || (!planInfo && fallbackTrialActive));
  const currentPlan = planInfo?.plan || (isTrialActive ? 'pro' : workspace?.plan || 'free');
  const planLabels = { free: t('Gratuit'), starter: 'Scalor', pro: 'Scalor + IA', ultra: 'Scalor IA Pro' };
  const planColors = {
    free: 'bg-muted text-muted-foreground',
    starter: 'bg-primary-50 text-primary',
    pro: 'bg-blue-50 text-blue-700',
    ultra: 'bg-slate-100 text-slate-800',
    trial: 'bg-amber-50 text-amber-700',
  };
  const displayedPlanLabel = isTrialActive
    ? t('Essai {plan}', { plan: planLabels[currentPlan] || 'Pro' })
    : (planLabels[currentPlan] || 'Gratuit');
  const displayedPlanColor = isTrialActive
    ? planColors.trial
    : (planColors[currentPlan] || planColors.free);

  // --- Navigation items grouped by section (mémorisés pour éviter re-création) ---
  const mainNav = useMemo(() => [
    {
      name: t('Accueil'), shortName: t('Accueil'), href: dashboardPath, primary: true,
      roles: ['ecom_admin', 'ecom_closeuse', 'ecom_compta', 'ecom_livreur'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    },
    {
      name: t('Commandes'), shortName: t('Cmd'), href: '/ecom/orders', primary: true,
      roles: ['ecom_admin', 'ecom_closeuse'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
    },
    {
      name: t('Clients'), shortName: t('Clients'), href: '/ecom/clients', primary: true,
      roles: ['ecom_admin', 'ecom_closeuse'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },
    {
      name: t('Produits'), shortName: t('Produits'), href: '/ecom/products', primary: false,
      roles: ['ecom_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },
        {
      name: t('Ma Boutique'), shortName: t('Boutique'), href: '/ecom/boutique', primary: true,
          roles: ['ecom_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
    },
    {
      name: t('Creative Center'), shortName: t('Creative'), href: '/ecom/creatives', primary: false,
      roles: ['ecom_admin'], highlight: true,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" /></svg>
    },
    {
      name: t('Commissions'), shortName: t('Commissions'), href: '/ecom/commissions', primary: true,
      roles: ['ecom_closeuse'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {
      name: t('Courses dispo'), shortName: t('Dispo'), href: '/ecom/livreur/available', primary: true,
      roles: ['ecom_livreur'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },
    {
      name: t('Mes livraisons'), shortName: t('En cours'), href: '/ecom/livreur/deliveries', primary: true,
      roles: ['ecom_livreur'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
    },
    {
      name: t('Historique'), shortName: t('Histo'), href: '/ecom/livreur/history', primary: true,
      roles: ['ecom_livreur'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {      name: t('Revenus livreur'), shortName: t('Revenus'), href: '/ecom/livreur/revenus', primary: true,
      roles: ['ecom_livreur'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {      name: t('Montant encaissé'), shortName: t('Encaissé'), href: '/ecom/livreur/earnings', primary: false,
      roles: ['ecom_livreur'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
    },
    {
      name: t('Rapports'), shortName: t('Rapports'), href: '/ecom/reports', primary: true,
      roles: ['ecom_admin', 'ecom_closeuse', 'ecom_compta'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
      name: t('Objectifs'), shortName: t('Buts'), href: '/ecom/goals', primary: false,
      roles: ['ecom_admin', 'ecom_closeuse', 'ecom_compta'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    },
    {
      name: t('Finances'), shortName: t('Finances'), href: '/ecom/transactions', primary: false,
      roles: ['ecom_admin', 'ecom_compta'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
  ], [dashboardPath, t]);

  const secondaryNav = useMemo(() => [
    {
      name: t('Gestion de stock'), shortName: t('Stock'), href: '/ecom/stock', primary: false,
      roles: ['ecom_admin', 'ecom_closeuse'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
    },
    {
      name: t('Marketing'), shortName: t('Marketing'), href: '/ecom/campaigns', primary: false,
      roles: ['ecom_admin', 'ecom_closeuse'], requiredPlan: 'starter',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
    },
    {
      name: t('Service Messagerie'), shortName: t('Messagerie'), href: '/ecom/whatsapp/service', primary: false,
      roles: ['ecom_admin', 'ecom_closeuse', 'ecom_compta'], requiredPlan: 'pro',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
    },
    // « Commercial IA » (agents WhatsApp) — lien retiré : fonctionnalité en stand-by.
    // La page/route /ecom/agent-ia existe toujours mais n'est plus accessible via le menu.

    {
      name: t('Équipe'), shortName: t('Équipe'), href: '/ecom/users', primary: false,
      roles: ['ecom_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },

    {
      name: t('API Développeur'), shortName: t('Dev API'), href: '/ecom/developer', primary: false,
      roles: ['ecom_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
    },
    {
      name: t('Formation'), shortName: t('Formation'), href: '/ecom/formation', primary: false,
      roles: ['ecom_admin', 'ecom_closeuse', 'ecom_compta'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>
    },
  ], [t]);

  const bottomNav = useMemo(() => [
    {
      name: t('Abonnement'), shortName: t('Plan'), href: '/ecom/billing', primary: false,
      roles: ['ecom_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
    },
  ], [t]);

  const superAdminNav = useMemo(() => [
    {
      name: t('Dashboard'), shortName: t('Accueil'), href: '/ecom/super-admin', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
    },
    {
      name: t('Croissance'), shortName: t('Croissance'), href: '/ecom/super-admin/growth', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    },
    {
      name: t('Service Client'), shortName: t('Service'), href: '/ecom/service-client', primary: true,
      roles: ['super_admin', 'service_client'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    {
      name: t('Tickets & bugs'), shortName: t('Tickets'), href: '/ecom/super-admin/tickets', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z" /></svg>
    },
    {
      name: t('Push Center'), shortName: t('Push'), href: '/ecom/super-admin/push', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
    },
    {
      name: t('Serveur mail'), shortName: t('Mail'), href: '/ecom/super-admin/mail-server', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16h.01M13 16h.01M9 16h.01" /></svg>
    },
    {
      name: t('Utilisateurs'), shortName: t('Users'), href: '/ecom/super-admin/users', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    {
      name: t('Espaces'), shortName: t('Espaces'), href: '/ecom/super-admin/workspaces', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    },
    {
      name: t('Analytics'), shortName: t('Analytics'), href: '/ecom/super-admin/analytics', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    },
    {
      name: t('Features'), shortName: t('Features'), href: '/ecom/super-admin/feature-analytics', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    },
    {
      name: t('Pages IA'), shortName: t('Pages IA'), href: '/ecom/super-admin/product-page-history', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
      name: t('Facturation'), shortName: t('Billing'), href: '/ecom/super-admin/billing', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {
      name: t('Gestion des plans'), shortName: t('Plans'), href: '/ecom/super-admin/plans', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
    },
    {
      name: t('Codes promo'), shortName: t('Promo'), href: '/ecom/super-admin/promo-codes', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
    },
    {
      name: t('Marketing'), shortName: t('Marketing'), href: '/ecom/marketing', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
    },
    {
      name: t('Email Analytics'), shortName: t('Email'), href: '/ecom/marketing/analytics', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v18m0 0l-4-4m4 4l4-4M4 12h16" /></svg>
    },
    {
      name: t('Affiliation'), shortName: t('Affiliés'), href: '/ecom/affiliates', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a5 5 0 00-10 0v2m10 0H7m5-8a4 4 0 100-8 4 4 0 000 8zm6 1a3 3 0 100-6 3 3 0 000 6zM6 13a3 3 0 100-6 3 3 0 000 6z" /></svg>
    },
    {
      name: t('WhatsApp'), shortName: t('WhatsApp'), href: '/ecom/super-admin/whatsapp-postulations', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
    },
    {
      name: t('Support'), shortName: t('Support'), href: '/ecom/super-admin/support', primary: true,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
    },
    {
      name: t('Logs WhatsApp'), shortName: t('WA Logs'), href: '/ecom/super-admin/whatsapp-logs', primary: false,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    },
    {
      name: t('Activité'), shortName: t('Activité'), href: '/ecom/super-admin/activity', primary: false,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    },
    {
      name: t('Paramètres'), shortName: t('Réglages'), href: '/ecom/super-admin/settings', primary: false,
      roles: ['super_admin'],
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    },
  ], [t]);

  const allNav = useMemo(() => [...mainNav, ...secondaryNav, ...bottomNav, ...superAdminNav], [mainNav, secondaryNav, bottomNav, superAdminNav]);
  const canAccessNavItem = useCallback((item) => {
    if (!item.roles.includes(user?.role)) return false;
    return true;
  }, [user?.role]);
  const filteredMain = useMemo(() => mainNav.filter(canAccessNavItem), [mainNav, canAccessNavItem]);
  // "Ma Boutique" est mis en avant à part, hors de la liste principale
  const boutiqueItem = useMemo(() => filteredMain.find(i => i.href === '/ecom/boutique'), [filteredMain]);
  const mainNavItems = useMemo(() => filteredMain.filter(i => i.href !== '/ecom/boutique'), [filteredMain]);
  const filteredSecondary = useMemo(() => secondaryNav.filter(canAccessNavItem), [secondaryNav, canAccessNavItem]);
  const filteredBottom = useMemo(() => bottomNav.filter(canAccessNavItem), [bottomNav, canAccessNavItem]);
  const filteredSuperAdmin = useMemo(() => superAdminNav.filter(canAccessNavItem), [superAdminNav, canAccessNavItem]);
  const filteredAll = useMemo(() => allNav.filter(canAccessNavItem), [allNav, canAccessNavItem]);

  const mobileMainTabs = useMemo(() => filteredAll.filter(i => i.primary).slice(0, 5), [filteredAll]);
  // Icônes mobile agrandies (w-7 h-7 au lieu de w-8 h-8)
  const mobileIcon = (item) => React.cloneElement(item.icon, { className: 'w-5 h-5' });
  const mobileIconLg = (item) => React.cloneElement(item.icon, { className: 'w-5 h-5' });
  const mobileSecondaryTabs = filteredAll.filter(i => !mobileMainTabs.includes(i));
  const showMoreTab = mobileSecondaryTabs.length > 0;

  const isActive = (href) => {
    if (href === dashboardPath) return location.pathname.includes('/dashboard') || location.pathname === dashboardPath;
    return location.pathname.startsWith(href);
  };

  const initial = displayUser?.name?.charAt(0)?.toUpperCase() || displayUser?.email?.charAt(0)?.toUpperCase() || 'U';

  const NavLink = ({ item }) => {
    const active = isActive(item.href);
    const locked = item.requiredPlan && !hasPlan(item.requiredPlan);
    const handleClick = (e) => {
      if (locked) {
        e.preventDefault();
        requirePlan(item.requiredPlan);
      }
    };
    return (
      <Link
        to={item.href}
        onClick={handleClick}
        title={item.name}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-colors duration-150 ${railCollapsed ? 'lg:justify-center lg:px-2' : ''} ${
          active
            ? 'bg-sidebar-accent text-sidebar-foreground font-semibold'
            : item.highlight
              ? 'text-primary font-semibold hover:bg-sidebar-accent'
              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`}
      >
        {/* Indicateur latéral retiré (style Minea : fond plein neutre) */}
        <span className={`hidden absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-primary transition-all duration-200 ${active ? 'h-5 opacity-100' : 'h-0 opacity-0'}`} />
        <span className={`flex-shrink-0 transition-colors ${
          active ? 'text-sidebar-foreground' : item.highlight ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        }`}>
          {React.cloneElement(item.icon, { className: 'w-[18px] h-[18px]' })}
        </span>
        <span className={`truncate flex-1 ${railCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
        {item.highlight && !active && !locked && !railCollapsed && (
          <span className="flex-shrink-0 rounded-full bg-primary-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">IA</span>
        )}
        {locked && (
          <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </Link>
    );
  };

  // DEBUG: check subscriptionWarning
  console.log('[EcomLayout] workspace?.subscriptionWarning:', JSON.stringify(workspace?.subscriptionWarning));

  return (
    <div className="ecom-app min-h-dvh bg-background flex flex-col lg:flex-row overflow-x-hidden max-w-[100vw]">
      <TopLoader />
      {/* Subscription Warning Banner — alerte rouge renouvellement */}
      {workspace?.subscriptionWarning?.active && (
        <SubscriptionWarningBanner warning={workspace.subscriptionWarning} />
      )}
      {/* Order limit banner — affiché quand le quota mensuel du plan gratuit est atteint */}
      {(() => {
        const maxOrders = planInfo?.limits?.maxOrders;
        const used = planInfo?.ordersThisMonth;
        if (!maxOrders || maxOrders === -1 || used == null || used < maxOrders) return null;
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 61,
            background: '#dc2626', color: '#fff',
            fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '9px 16px', textAlign: 'center', lineHeight: 1.4,
          }}>
            <span>🚫</span>
            <span>
              <strong>{t('Boutique bloquée')}</strong> — {t('Vous avez atteint la limite de {n} commandes / mois du plan Gratuit.', { n: maxOrders })}
              Votre boutique ne reçoit plus de commandes.
            </span>
            <a
              href="/ecom/billing"
              style={{
                marginLeft: 8, background: '#fff', color: '#dc2626',
                border: 'none', borderRadius: 6, padding: '3px 12px',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Débloquer →
            </a>
          </div>
        );
      })()}
      {/* Desktop Sidebar — white, clean, Chariow-inspired */}
      <aside className={`hidden lg:flex lg:flex-col ${railCollapsed ? 'lg:w-[72px]' : 'lg:w-[232px]'} lg:fixed lg:inset-y-0 z-30 bg-sidebar border-r border-sidebar-border transition-[width] duration-200`}>
        <div className="flex flex-col h-full">

          {/* Logo + workspace area */}
          <div className="px-4 pt-4 pb-3 border-b border-sidebar-border">
            <div className={`flex items-center gap-2 mb-3 ${railCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
              <Link to={dashboardPath} className={`flex items-center gap-2.5 ${railCollapsed ? 'lg:hidden' : ''}`}>
                <img src="/logo.png" alt="Scalor" className="h-8 object-contain" />
              </Link>
              <div className="flex items-center gap-1 flex-shrink-0">
                <ThemeToggle className={railCollapsed ? 'lg:hidden' : ''} />
                <button
                  type="button"
                  onClick={() => setRailCollapsed(v => !v)}
                  aria-label={railCollapsed ? 'Déplier le menu' : 'Replier le menu'}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors flex-shrink-0"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" strokeWidth={2} /><line x1="9" y1="4" x2="9" y2="20" strokeWidth={2} /></svg>
                </button>
              </div>
            </div>
            {/* Workspace switcher */}
            {!useAdminLayout && !railCollapsed && <WorkspaceSwitcher />}
          </div>

          {/* Main navigation */}
          <nav className="flex-1 px-3 py-3 space-y-[3px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#e5e7eb_transparent]">
            {useAdminLayout ? (
              <>
                <p className={`px-2 pt-1 pb-1.5 text-[11px] font-semibold text-muted-foreground tracking-normal ${railCollapsed ? 'lg:hidden' : ''}`}>{isSuperAdmin ? 'Administration' : tp('Service Client')}</p>
                {filteredSuperAdmin.map(item => <NavLink key={item.name} item={item} />)}
              </>
            ) : (
              <>
                {boutiqueItem && (
                  <>
                    <Link
                      to={boutiqueItem.href}
                      title={boutiqueItem.name}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors duration-150 ${railCollapsed ? 'lg:justify-center lg:px-2' : ''} ${
                        isActive(boutiqueItem.href)
                          ? 'bg-primary text-white shadow-sm shadow-primary/30'
                          : 'bg-primary/[0.06] text-primary ring-1 ring-primary/15 hover:bg-primary/[0.1]'
                      }`}
                    >
                      <span className="flex-shrink-0">{React.cloneElement(boutiqueItem.icon, { className: 'w-[18px] h-[18px]' })}</span>
                      <span className={`truncate flex-1 ${railCollapsed ? 'lg:hidden' : ''}`}>{boutiqueItem.name}</span>
                      <svg className={`w-4 h-4 opacity-60 flex-shrink-0 ${railCollapsed ? 'lg:hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                    <div className="my-2 border-t border-border" />
                  </>
                )}
                <p className={`px-2 pt-1 pb-1.5 text-[11px] font-semibold text-muted-foreground tracking-normal ${railCollapsed ? 'lg:hidden' : ''}`}>{tp('Menu')}</p>
                {mainNavItems.map(item => <NavLink key={item.name} item={item} />)}
                {filteredSecondary.length > 0 && (
                  <>
                    <div className="my-2 border-t border-border" />
                    {filteredSecondary.map(item => <NavLink key={item.name} item={item} />)}
                  </>
                )}
              </>
            )}
          </nav>

          {/* Bottom: settings + user */}
          <div className="border-t border-border">
            {filteredBottom.map(item => (
              <div key={item.name} className="px-3 py-2">
                <NavLink item={item} />
              </div>
            ))}
            {/* User card — profil à gauche, déconnexion en action dédiée */}
            <div className="px-3 pb-3">
              <div className={`flex items-center gap-1 rounded-xl border border-sidebar-border bg-muted/60 p-1.5 ${railCollapsed ? 'lg:justify-center lg:border-0 lg:bg-transparent lg:p-0' : ''}`}>
                <Link to="/ecom/profile" title={displayUser?.name || ''} className={`flex items-center gap-2.5 flex-1 min-w-0 px-1.5 py-1 rounded-lg hover:bg-card transition-colors ${railCollapsed ? 'lg:flex-none lg:px-0 lg:justify-center' : ''}`}>
                  <div className={`w-8 h-8 ${roleColors[displayUser?.role] || 'bg-gray-300'} rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm`}>
                    <span className="text-white text-xs font-bold">{initial}</span>
                  </div>
                  <div className={`min-w-0 flex-1 text-left ${railCollapsed ? 'lg:hidden' : ''}`}>
                    <p className="text-xs font-semibold text-foreground truncate">{displayUser?.name || displayUser?.email?.split('@')[0]}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{roleLabel[displayUser?.role] || displayUser?.role}</p>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  title={t('Déconnexion')}
                  className={`p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 ${railCollapsed ? 'lg:hidden' : ''}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className={`flex-1 flex flex-col min-w-0 ${railCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[232px]'}`} style={{ paddingRight: 'var(--store-assistant-dock, 0px)', transition: 'padding-right 200ms ease' }}>
        {/* ── Mobile Header: Scalor style (hidden on chat) ── */}
        <header className={`lg:hidden fixed top-0 left-0 right-0 z-20 bg-card border-b border-border pt-safe ${location.pathname.startsWith('/ecom/chat') ? 'hidden' : ''}`}>
          <div className="flex items-center justify-between min-h-[56px] px-3 sm:px-4">
            {/* Logo left */}
            <Link to={dashboardPath} className="flex min-h-[44px] min-w-[44px] items-center gap-2">
              <img src="/logo.png" alt="Scalor" className="h-7 object-contain" />
            </Link>

            {/* Icons right */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <GlobalSearch isSuperAdmin={useAdminLayout} isMobile={true} />
              
              {/* Notifications */}
              <div ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
                  className="relative flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground active:bg-gray-200"
                  aria-label={tp('Ouvrir les notifications')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {unreadCount > 0 && <span className="absolute top-0 right-0 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-primary text-white text-[10px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* ── Desktop Header ── Chariow-inspired: page title left, search center, actions right */}
        <header className={`hidden lg:flex border-b h-14 items-center px-5 fixed top-0 ${railCollapsed ? 'left-[72px]' : 'left-[232px]'} z-20 bg-card border-border gap-4`} style={{ right: 'var(--store-assistant-dock, 0px)', transition: 'right 200ms ease' }}>
          {/* Left: page title */}
          <div className="flex items-center gap-2 min-w-[160px]">
            <h1 className="text-[15px] font-semibold text-foreground truncate">{getPageTitle(location.pathname, t)}</h1>
          </div>

          {/* Center: search bar */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm">
              <GlobalSearch isSuperAdmin={useAdminLayout} />
            </div>
          </div>

          {/* Right: action icons + user */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!useAdminLayout && (() => {
              return (
                <div className="hidden md:flex items-center gap-1.5 mr-1">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${displayedPlanColor}`}>
                    {displayedPlanLabel}
                  </span>
                  {currentPlan !== 'ultra' && (
                    <button
                      onClick={() => navigate('/ecom/billing')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      {isTrialActive ? t('Plans') : t('Upgrade')}
                    </button>
                  )}
                </div>
              );
            })()}
            <CurrencySelector compact={true} />
            <PlatformLanguageSelector compact />

            {/* Chat */}
            <Link
              to="/ecom/chat"
              onClick={clearUnread}
              className={`relative p-2 rounded-lg transition-colors ${
                location.pathname.startsWith('/ecom/chat')
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title={tp('Messages')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              {unreadDm > 0 && !location.pathname.startsWith('/ecom/chat') && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{unreadDm > 99 ? '99+' : unreadDm}</span>
              )}
            </Link>

            {/* Notifications */}
            <div ref={notifRef}>
              <button
                onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }}
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadCount > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>
            </div>

            {/* User avatar + dropdown */}
            <div className="relative ml-1" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-muted transition-colors"
              >
                {displayUser?.avatar ? (
                  <img src={displayUser.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className={`w-7 h-7 ${roleColors[displayUser?.role] || 'bg-primary'} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">{initial}</span>
                  </div>
                )}
                <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-56 rounded-xl shadow-xl border overflow-hidden z-50 bg-card border-border">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">{displayUser?.name || displayUser?.email?.split('@')[0]}</p>
                    <p className="text-xs text-muted-foreground">{displayUser?.email}</p>
                    {isSuperAdmin && <span className="inline-block text-[10px] font-bold text-primary uppercase tracking-wider mt-1">{t('Super Admin')}</span>}
                    {isServiceClient && <span className="inline-block text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-1">{t('Service Client')}</span>}
                  </div>
                  {!useAdminLayout && <WorkspaceSwitcherMenu isSuperAdmin={isSuperAdmin} onWorkspaceSwitch={() => setUserMenuOpen(false)} />}
                  <div className="py-1">
                    <Link to="/ecom/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {t('Mon profil')}
                    </Link>
                    <Link to="/ecom/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-background">
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                      {t('Paramètres')}
                    </Link>
                  </div>
                  <div className="border-t py-1 border-border">
                      <button onClick={() => { setUserMenuOpen(false); handleLogout(); }} className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        {t('Déconnexion')}
                      </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Push notification banner */}
        <PushNotificationBanner />

        {/* ── Toast notification in-app ── */}
        {toast && (
          <div
            className="fixed top-4 left-4 right-4 lg:left-auto lg:right-6 lg:w-96 z-[100] animate-[slideDown_0.3s_ease-out]"
            style={{ animation: 'slideDown 0.3s ease-out' }}
          >
            <button
              onClick={() => { setToast(null); setNotifOpen(true); }}
              className="w-full flex items-start gap-3 p-4 bg-card rounded-2xl shadow-2xl border border-border hover:shadow-xl transition-shadow"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground truncate">{toast.title}</p>
                {toast.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{toast.body}</p>}
                <p className="text-[11px] text-primary font-medium mt-1">{tp('Voir les notifications →')}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setToast(null); }}
                className="flex-shrink-0 p-1 text-muted-foreground hover:text-muted-foreground rounded-full"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </button>
          </div>
        )}

        {/* Page content - pb-safe-nav = pb-20 + home indicator sur iOS */}
        <main className={`flex-1 min-w-0 overflow-y-auto overflow-x-hidden pb-safe-nav lg:pb-0 ${
          workspace?.trialEndsAt ? 'pt-32 lg:pt-28' : 'pt-safe-header lg:pt-14'
        }`}>
          <React.Fragment key={platformLang}>{children}</React.Fragment>
        </main>
      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* WhatsApp Support popup */}
      {showTutorial && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeTutorial} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#25D366]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-card/20 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-bold text-base leading-tight">{tp('Rejoignez le support')}</h2>
                  <p className="text-white/80 text-xs">{tp('Communauté Scalor sur WhatsApp')}</p>
                </div>
              </div>
              <button onClick={closeTutorial} className="w-8 h-8 flex items-center justify-center rounded-full bg-card/20 hover:bg-card/30 transition-colors">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Body */}
            <div className="px-6 py-6 text-center">
              <div className="w-20 h-20 bg-[#25D366]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">{tp('Rejoignez notre groupe support')}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Obtenez de l'aide, des conseils et restez à jour avec les dernières fonctionnalités Scalor. Notre équipe est disponible pour vous accompagner.
              </p>
              <div className="space-y-3 text-left mb-6">
                {[
                  {
                    icon: (
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
                      </svg>
                    ),
                    text: t('Support rapide de notre équipe'),
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    ),
                    text: t('Astuces pour booster vos ventes'),
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    ),
                    text: 'Nouvelles fonctionnalités en avant-première',
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-foreground">
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
              <a
                href="https://chat.whatsapp.com/IH3nEvfeEWrHiAnocwZTwz?mode=gi_t"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeTutorial}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-semibold rounded-xl transition-colors shadow-lg shadow-[#25D366]/30 text-sm"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {tp('Rejoindre le groupe WhatsApp')}
              </a>
            </div>
            {/* Footer */}
            <div className="px-6 pb-4 text-center">
              <button onClick={closeTutorial} className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors">
                {tp('Plus tard')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Panel - unique instance */}
      <NotificationPanel
        isOpen={notifOpen}
        onClose={() => { setNotifOpen(false); refreshCount(); }}
        onMarkAllRead={refreshCount}
        onOpenModal={() => { setNotifOpen(false); setNotifModalOpen(true); }}
      />

      {/* Notification Modal */}
      <NotificationModal
        isOpen={notifModalOpen}
        onClose={() => { setNotifModalOpen(false); refreshCount(); }}
        onMarkAllRead={refreshCount}
      />

      {/* Support Chat Widget */}
      {!useAdminLayout && <SupportChatWidget />}

      {/* Assistant IA transversal du back-office. La Boutique possède son assistant dédié. */}
      {!location.pathname.startsWith('/ecom/boutique') &&
       !location.pathname.includes('builder') &&
       !location.pathname.startsWith('/ecom/chat') && (
        <StoreAssistantChat
          mode="backoffice"
          pageTitle={getPageTitle(location.pathname, t)}
          workspaceName={workspace?.name || ''}
        />
      )}

      {/* ── Mobile Bottom Tab Bar - Scalor style (hidden on chat page) ── */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border ${location.pathname.startsWith('/ecom/chat') ? 'hidden' : ''}`}>
        <div className="flex items-stretch gap-1 px-2 bottom-nav-safe min-h-[64px]">
          {mobileMainTabs.map((item) => {
            const active = isActive(item.href);
            const locked = item.requiredPlan && !hasPlan(item.requiredPlan);
            const handleClick = (e) => {
              setMoreMenuOpen(false);
              if (locked) { e.preventDefault(); requirePlan(item.requiredPlan); }
            };
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleClick}
                className="flex min-h-[56px] min-w-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 active:scale-95 relative"
                aria-label={item.name}
              >
                {locked && (
                  <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-amber-500" />
                )}
                <span className={`transition-colors duration-200 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                  {mobileIcon(item)}
                </span>
                <span className={`max-w-full truncate text-[10px] font-medium leading-none transition-colors duration-200 ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}>{item.shortName}</span>
              </Link>
            );
          })}

          {showMoreTab && (
            <div className="relative flex-1">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="flex min-h-[56px] min-w-[44px] w-full flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200 active:scale-95"
                aria-expanded={moreMenuOpen}
                aria-label={tp('Ouvrir le menu')}
              >
                <svg className={`w-5 h-5 transition-colors duration-200 ${moreMenuOpen ? 'text-primary' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01" />
                  <circle cx="12" cy="12" r="10" strokeWidth={1.5} />
                </svg>
                <span className={`max-w-full truncate text-[10px] font-medium leading-none transition-colors duration-200 ${
                  moreMenuOpen ? 'text-foreground' : 'text-muted-foreground'
                }`}>{t('Menu')}</span>
              </button>

              {/* iOS-style action sheet */}
              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[45] ios-fade-in" onClick={() => setMoreMenuOpen(false)} />
                  <div className="fixed bottom-0 left-0 right-0 z-50 px-3 ios-slide-up" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}>
                    <div className="bg-card/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl mb-2 max-h-[70vh] flex flex-col">
                      <div className="px-5 pt-3 pb-2 flex-shrink-0">
                        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Plus d\'options')}</p>
                          <button onClick={() => setMoreMenuOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-muted active:bg-gray-200 transition-colors">
                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="overflow-y-auto flex-1">
                        <div className="divide-y divide-gray-100">
                          {mobileSecondaryTabs.map((item) => {
                            const active = isActive(item.href);
                            const locked = item.requiredPlan && !hasPlan(item.requiredPlan);
                            const handleClick = (e) => {
                              setMoreMenuOpen(false);
                              if (locked) { e.preventDefault(); requirePlan(item.requiredPlan); }
                            };
                            return (
                              <Link
                                key={item.name}
                                to={item.href}
                                onClick={handleClick}
                                className={`flex items-center gap-4 px-5 py-4 text-[16px] font-medium active:bg-muted transition-colors ${active ? 'text-scalor-green' : 'text-foreground'
                                  }`}
                              >
                                <span className={`flex-shrink-0 ${active ? 'text-scalor-green' : 'text-muted-foreground'}`}>{mobileIconLg(item)}</span>
                                <span className="flex-1 truncate">{item.name}</span>
                                {locked && (
                                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                  </svg>
                                )}
                                {active && !locked && <span className="w-2.5 h-2.5 bg-scalor-green rounded-full flex-shrink-0" />}
                              </Link>
                            );
                          })}
                        </div>
                        <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                          <span className="text-[15px] font-medium text-foreground">{t('Langue')}</span>
                          <PlatformLanguageSelector compact />
                        </div>
                        <div className="border-t border-border">
                          <Link to="/ecom/profile" onClick={() => setMoreMenuOpen(false)} className="flex items-center gap-4 px-5 py-4 text-[16px] font-medium text-foreground active:bg-muted">
                            <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            {t('Mon profil')}
                          </Link>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => { setMoreMenuOpen(false); handleLogout(); }}
                      className="w-full bg-card/95 backdrop-blur-xl rounded-2xl py-4 text-[17px] font-semibold text-red-500 active:bg-muted shadow-2xl transition-colors"
                    >
                      {t('Déconnexion')}
                    </button>

                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

const getPageTitle = (pathname, t = (x) => x) => {
  if (pathname.includes('/boutique')) return t('Ma Boutique');
  if (pathname.includes('/profile')) return t('Mon profil');
  if (pathname.includes('/centre-controle')) return t('Centre de contrôle');
  if (pathname.includes('/dashboard')) return t('Scalor');
  if (pathname.includes('/store/products/new')) return t('Nouveau produit boutique');
  if (pathname.includes('/store/products') && pathname.includes('/edit')) return t('Modifier le produit boutique');
  if (pathname.includes('/store/products')) return t('Produits boutique');
  if (pathname.includes('/store/orders')) return t('Commandes boutique');
  if (pathname.includes('/store/setup')) return t('Configuration boutique');
  if (pathname.includes('/store')) return t('Boutique');
  if (pathname.includes('/products/new')) return t('Nouveau produit');
  if (pathname.includes('/products') && pathname.includes('/edit')) return t('Modifier le produit');
  if (pathname.match(/\/products\/[a-f0-9]+$/)) return t('Détail du produit');
  if (pathname.includes('/products')) return t('Produits');
  if (pathname.includes('/reports/product/')) return t('Stats produit');
  if (pathname.includes('/reports/new')) return t('Nouveau rapport');
  if (pathname.includes('/reports') && pathname.includes('/edit')) return t('Modifier le rapport');
  if (pathname.includes('/reports/')) return t('Détail du rapport');
  if (pathname.includes('/reports')) return t('Rapports');
  if (pathname.includes('/stock/orders/new')) return t('Nouvelle commande');
  if (pathname.includes('/stock/orders') && pathname.includes('/edit')) return t('Modifier commande');

  if (pathname.includes('/transactions/new')) return t('Nouvelle transaction');
  if (pathname.includes('/transactions') && pathname.includes('/edit')) return t('Modifier transaction');
  if (pathname.match(/\/transactions\/[a-f0-9]+$/)) return t('Détail transaction');
  if (pathname.includes('/transactions')) return t('Finances');
  if (pathname.includes('/decisions/new')) return t('Nouvelle décision');
  if (pathname.includes('/decisions')) return t('Décisions');
  if (pathname.includes('/import')) return t('Import Commandes');
  if (pathname.match(/\/orders\/[a-f0-9]{24}/)) return t('Détail commande');
  if (pathname.includes('/orders')) return t('Commandes');
  if (pathname.includes('/clients/new')) return t('Nouveau client');
  if (pathname.includes('/clients') && pathname.includes('/edit')) return t('Modifier client');
  if (pathname.includes('/clients')) return t('Clients');
  if (pathname.includes('/agent-ia')) return t('Commercial IA');
  if (pathname.includes('/whatsapp/agent-config')) return t('Configurer Commercial IA');
  if (pathname.includes('/whatsapp/conversations')) return t('Conversations Rita');
  if (pathname.includes('/whatsapp/service')) return t('Service Messagerie');
  if (pathname.includes('/whatsapp/connexion')) return t('Service Messagerie');

  if (pathname.includes('/campaigns')) return t('Marketing');
  if (pathname.includes('/super-admin/mail-server')) return t('Serveur mail');
  if (pathname.includes('/super-admin/billing')) return t('Suivi Facturation');
  if (pathname.includes('/super-admin/plans')) return t('Gestion des plans');
  if (pathname.includes('/super-admin/promo-codes')) return t('Codes promo');
  if (pathname.includes('/super-admin/product-page-history')) return t('Historique pages produit');
  if (pathname.includes('/super-admin/users')) return t('Gestion des utilisateurs');
  if (pathname.includes('/super-admin/workspaces')) return t('Gestion des espaces');
  if (pathname.includes('/super-admin/activity')) return t('Activité');
  if (pathname.includes('/super-admin/settings')) return t('Paramètres');
  if (pathname.includes('/super-admin/whatsapp')) return t('Postulations WhatsApp');
  if (pathname.includes('/super-admin')) return t('Super Administration');
  if (pathname.includes('/users')) return t('Gestion Équipe');
  if (pathname.includes('/assignments')) return t('Attributions');
  if (pathname.includes('/commissions')) return t('Commissions');
  if (pathname.includes('/settings')) return t('Paramètres');
  if (pathname.includes('/chat')) return t('Chat Équipe');
  if (pathname.includes('/product-research')) return t('Recherche Produits');
  if (pathname.includes('/product-finder')) return t('Product Finder');
  if (pathname.includes('/stats')) return t('Statistiques');
  if (pathname.includes('/goals')) return t('Objectifs Hebdomadaires');
  if (pathname.includes('/marketing')) return t('Marketing');
  if (pathname.includes('/affiliates')) return t('Programme Affiliation');
  return t('Scalor');
};

// Mémoriser le layout pour éviter les re-renders inutiles
const EcomLayout = memo(EcomLayoutComponent);

export default EcomLayout;
