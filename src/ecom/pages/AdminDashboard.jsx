import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { useEcomAuth } from '../hooks/useEcomAuth';
import { useMoney } from '../hooks/useMoney.js';
import ecomApi from '../services/ecommApi.js';
import { useStore } from '../contexts/StoreContext.jsx';
import { ArrowRight, CheckCircle2, Store, Rocket, Package, ShoppingCart, BarChart3, Target, Check, X } from 'lucide-react';
import { usePlatformT, tp } from '../i18n/platform.js';

const ChartContent = React.memo(({ data, selectedMetric, fmt }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
        {tp('Aucune donnée disponible')}
      </div>
    );
  }
  const W = 800, H = 220, padL = 55, padR = 10, padT = 10, padB = 10;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...data.map(d => d[selectedMetric] || 0), 0.01);
  let yMax;
  if (selectedMetric === 'deliveryRate') { yMax = 1; }
  else if (maxVal <= 10) { yMax = Math.ceil(maxVal); }
  else if (maxVal <= 100) { yMax = Math.ceil(maxVal / 10) * 10; }
  else { yMax = Math.ceil(maxVal / 1000) * 1000; }
  const xStep = data.length > 1 ? chartW / (data.length - 1) : chartW;
  const toX = (i) => padL + i * xStep;
  const toY = (val) => padT + chartH - (val / yMax) * chartH;
  const buildPath = () => data.map((d, i) => {
    const x = toX(i); const y = toY(Math.max(d[selectedMetric] || 0, 0));
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const buildArea = () => {
    const line = buildPath();
    return `${line} L${toX(data.length - 1).toFixed(1)},${toY(0).toFixed(1)} L${toX(0).toFixed(1)},${toY(0).toFixed(1)} Z`;
  };
  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  const formatShort = (v) => {
    if (selectedMetric === 'deliveryRate') return `${(v * 100).toFixed(0)}%`;
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return v.toFixed(0);
  };
  const labelInterval = Math.max(1, Math.floor(data.length / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0F6B4F" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#0F6B4F" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line x1={padL} y1={toY(tick)} x2={W - padR} y2={toY(tick)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={padL - 6} y={toY(tick) + 4} textAnchor="end" fill="#9ca3af" fontSize="10">{formatShort(tick)}</text>
        </g>
      ))}
      <path d={buildArea()} fill="url(#areaGrad)" />
      <path d={buildPath()} fill="none" stroke="#0F6B4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        if (i % labelInterval !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={toX(i)} y={H} textAnchor="middle" fill="#9ca3af" fontSize="9">
            {new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </text>
        );
      })}
      {data.map((d, i) => {
        let tv;
        if (selectedMetric === 'deliveryRate') tv = `${(d[selectedMetric] * 100).toFixed(1)}%`;
        else if (selectedMetric === 'orders') tv = d[selectedMetric] || 0;
        else tv = fmt(d[selectedMetric] || 0);
        return (
          <circle key={i} cx={toX(i)} cy={toY(Math.max(d[selectedMetric] || 0, 0))} r="3" fill="#0F6B4F" stroke="#fff" strokeWidth="1.5">
            <title>{new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — {tv}</title>
          </circle>
        );
      })}
    </svg>
  );
});
ChartContent.displayName = 'ChartContent';

// Composant KPI Card mémorisé pour éviter re-renders inutiles
const KPICard = React.memo(({ card, isSelected, onClick, loadingKpi, isLastInRowMobile, isLastInRowDesktop, index }) => (
  <button
    onClick={onClick}
    className={`text-left px-4 py-3 sm:px-5 sm:py-4 transition-all relative ${
      isSelected ? 'bg-card' : 'bg-card hover:bg-background'
    } ${!isLastInRowMobile ? 'border-r border-border md:border-r-0' : ''}
     ${!isLastInRowDesktop && index < 2 ? 'md:border-r md:border-border' : ''}`}
  >
    {isSelected && (
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t"></div>
    )}
    <p className={`text-xs font-medium mb-0.5 sm:mb-1 ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
      {card.title}
    </p>
    <div className="flex items-baseline gap-1.5 sm:gap-2">
      {loadingKpi ? (
        <>
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
        </>
      ) : (
        <>
          <p className="text-lg sm:text-xl font-bold tabular-nums text-foreground">{card.value}</p>
          <span className={`text-xs font-medium ${card.trendUp ? 'text-green-600' : 'text-red-500'}`}>
            {card.trend}
          </span>
        </>
      )}
    </div>
  </button>
));
KPICard.displayName = 'KPICard';

const DashboardSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header skeleton */}
      <div className="mb-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>
      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border p-4">
            <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-3" />
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="bg-card rounded-2xl border p-6 mb-6">
        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-56 bg-muted rounded-xl animate-pulse" />
      </div>
      {/* Bottom grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border p-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-12 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const t = usePlatformT();
  const { user, workspace } = useEcomAuth();
  const { fmt } = useMoney();
  const { stores, activeStore, loading: storesLoading } = useStore();
  const navigate = useNavigate();
  const workspaceId = workspace?._id || workspace?.id || null;
  const [loadingKpi, setLoadingKpi] = useState(true);   // Phase 1 : KPIs
  const [loadingSecondary, setLoadingSecondary] = useState(true); // Phase 2 : reste
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0); // Progression du chargement
  const loadingTimeoutRef = useRef(null);

  // NOTE: early return moved to main render to avoid Rules of Hooks violation
  const [stats, setStats] = useState({
    products: [],
    stockAlerts: [],
    financialStats: {},
    prevFinancialStats: {},
    dailyFinancial: [],
    decisions: [],
    orders: [],
    recentActivity: [],
    goals: []  // Sera rempli par l'API /goals
  });
  const [dashboardStats, setDashboardStats] = useState({
    conversionRate: '0',
    conversionTrend: '0',
    averageOrderValue: 0,
    avgOrderTrend: '0',
    activeClients: 0,
    activeClientsTrend: 0,
    returnRate: '0',
    returnRateTrend: '0',
    topProducts: []
  });
  const [timeRange, setTimeRange] = useState('today');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  // Guide de démarrage ("Premiers pas") — signaux all-time indépendants de la période
  const [onboarding, setOnboarding] = useState({ hasProducts: false, hasOrders: false, hasReports: false, loaded: false });
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);

  // CRITICAL: Create ref first, assign after function declaration
  const loadDashboardDataRef = useRef(null);
  // Track which store we last loaded data for — detect store switches
  const lastLoadedStoreIdRef = useRef(null);

  // Animation de progression du chargement + timeout de sécurité anti-infinite-loading
  useEffect(() => {
    if (loadingKpi || loadingSecondary) {
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 95) return prev;
          return prev + Math.random() * 15;
        });
      }, 100);

      // Timeout de sécurité : forcer la fin du loading après 12s max
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        setLoadingKpi(false);
        setLoadingSecondary(false);
        setLoadingProgress(100);
      }, 12000);

      return () => {
        clearInterval(interval);
        clearTimeout(loadingTimeoutRef.current);
      };
    } else {
      clearTimeout(loadingTimeoutRef.current);
      setLoadingProgress(100);
      const t = setTimeout(() => {
        setLoadingProgress(0);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [loadingKpi, loadingSecondary]);

  // Fonctions pour le calendrier
  const getCalendarDays = () => {
    const year = currentCalendarMonth.getFullYear();
    const month = currentCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() + 6) % 7); // Ajuster pour commencer le lundi
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const isDateToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isDateSelected = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === customStartDate || dateStr === customEndDate;
  };

  const isDateInRange = (date) => {
    if (!customStartDate || !customEndDate) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= customStartDate && dateStr <= customEndDate;
  };

  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
  };

  const handleDateClick = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    if (!customStartDate || (customStartDate && customEndDate)) {
      // Commencer une nouvelle sélection
      setCustomStartDate(dateStr);
      setCustomEndDate('');
      setIsSelectingEnd(true);
    } else if (customStartDate && !customEndDate) {
      // Sélectionner la date de fin → appliquer immédiatement
      let start = customStartDate;
      let end = dateStr;
      if (dateStr < customStartDate) {
        start = dateStr;
        end = customStartDate;
      }
      setCustomStartDate(start);
      setCustomEndDate(end);
      setIsSelectingEnd(false);
      setTimeRange('custom');
      setShowDatePicker(false);
    }
  };

  const buildDateRange = (daysCount, customStart = null, customEnd = null) => {
    let startDate, endDate;
    
    if (customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(endDate.getDate() - daysCount + 1);
    }
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    let prevStartDate, prevEndDate;
    if (daysCount === 1) {
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setHours(0, 0, 0, 0);
    } else {
      prevEndDate = new Date(startDate);
      prevEndDate.setDate(prevEndDate.getDate() - 1);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - daysCount + 1);
      prevStartDate.setHours(0, 0, 0, 0);
    }
    return {
      startStr, endStr,
      prevStartStr: prevStartDate.toISOString().split('T')[0],
      prevEndStr: prevEndDate.toISOString().split('T')[0]
    };
  };

  const loadDashboardData = async () => {
    // Track admin dashboard access
    import('../../utils/analytics.js').then(m => {
      const analytics = m.default;
      analytics.trackPageView('/ecom/dashboard/admin', {
        page_name: 'Admin Dashboard',
        category: 'admin',
        user_id: user?.id
      });
    }).catch(() => {});

    // Detect a store switch: if the active store changed since last load,
    // wipe old data and show the full loader instead of a silent refresh.
    const currentStoreId = activeStore?._id ?? null;
    const isStoreSwitch = lastLoadedStoreIdRef.current !== null
      && currentStoreId !== lastLoadedStoreIdRef.current;
    lastLoadedStoreIdRef.current = currentStoreId;

    // NE JAMAIS afficher le loader pour les KPI après le premier chargement
    // Utiliser isRefreshing pour indiquer un refresh silencieux en arrière-plan
    const isFirstLoad = isStoreSwitch
      || !stats.financialStats
      || Object.keys(stats.financialStats).length === 0;

    if (isFirstLoad) {
      // Reset stale data from the previous store immediately
      setStats({ products: [], stockAlerts: [], financialStats: {}, prevFinancialStats: {}, dailyFinancial: [], decisions: [], orders: [], recentActivity: [], goals: [] });
      setDashboardStats({ conversionRate: '0', conversionTrend: '0', averageOrderValue: 0, avgOrderTrend: '0', activeClients: 0, activeClientsTrend: 0, returnRate: '0', returnRateTrend: '0', topProducts: [] });
      setLoadingKpi(true);
      setLoadingSecondary(true);
      setLoadingProgress(5);
    } else {
      // Refresh silencieux : pas de loader, juste l'indicateur isRefreshing
      setIsRefreshing(true);
    }

    let daysCount;
    let isCustomRange = timeRange === 'custom' && customStartDate && customEndDate;

    if (isCustomRange) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      daysCount = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      daysCount =
        timeRange === 'today' ? 1 :
        timeRange === '7d' ? 7 :
        timeRange === '30d' ? 30 :
        timeRange === '90d' ? 90 :
        timeRange === '365d' ? 365 :
        parseInt(timeRange) || 14;
    }

    const { startStr, endStr, prevStartStr, prevEndStr } = buildDateRange(
      daysCount,
      isCustomRange ? customStartDate : null,
      isCustomRange ? customEndDate : null
    );

    // Lance TOUT en parallèle : les 5 requêtes secondaires (Phase 2) partent
    // maintenant et se résolvent pendant qu'on rend déjà les KPIs — fin de la
    // cascade Phase 1 → Phase 2 (temps total ≈ max au lieu de somme).
    const phase2Promise = Promise.all([
      ecomApi.get(`/reports/stats/products-ranking?startDate=${startStr}&endDate=${endStr}`).catch(() => ({ data: { data: [] } })),
      ecomApi.get('/stock-locations').catch(() => ({ data: { data: [] } })),
      ecomApi.get('/decisions/dashboard/overview').catch(() => ({ data: { data: {} } })),
      ecomApi.get(`/reports/dashboard/stats?period=${daysCount}&startDate=${startStr}&endDate=${endStr}`).catch(() => ({ data: { data: {} } })),
      ecomApi.get('/goals', { params: { periodType: 'monthly', year: new Date().getFullYear(), month: new Date().getMonth() + 1 } }).catch(() => ({ data: { data: [] } }))
    ]);

    // ── PHASE 1 : KPIs financiers + graphique (priorité max) ──────────────────
    try {
      const [financialRes, prevFinancialRes, dailyRes] = await Promise.all([
        ecomApi.get(`/reports/stats/financial?startDate=${startStr}&endDate=${endStr}`),
        ecomApi.get(`/reports/stats/financial?startDate=${prevStartStr}&endDate=${prevEndStr}`),
        ecomApi.get(`/reports/stats/financial/daily?days=${daysCount}`).catch(() => ({ data: { data: [] } }))
      ]);
      const financialData = financialRes.data?.data || {};
      const prevFinancialData = prevFinancialRes.data?.data || {};
      const dailyFinancial = (dailyRes.data?.data || []).map(d => ({
        ...d,
        orders: d.ordersDelivered || 0,
        deliveryRate: d.ordersReceived > 0 ? d.ordersDelivered / d.ordersReceived : 0
      }));

      // Track successful data load
      if (isFirstLoad) {
        import('../../utils/analytics.js').then(m => {
          const analytics = m.default;
          analytics.trackAdminAction('dashboard_data_loaded', {
            time_range: timeRange,
            revenue: financialData.totalRevenue || 0,
            orders: financialData.ordersDelivered || 0
          });
        }).catch(() => {});
      }

      setStats(prev => ({ ...prev, financialStats: financialData, prevFinancialStats: prevFinancialData, dailyFinancial }));
    } catch (e) {
      console.error('KPI load error', e);
      // Track error
      import('../../utils/analytics.js').then(m => {
        const analytics = m.default;
        analytics.trackError(e, {
          context: 'admin_dashboard_kpi_load',
          time_range: timeRange
        });
      }).catch(() => {});
    } finally {
      if (isFirstLoad) {
        setLoadingKpi(false); // page visible immédiatement après KPIs + graphique
        setLoadingProgress(70);
      }
    }

    // ── PHASE 2 : reste en arrière-plan (déjà en vol depuis le début de la fonction) ──
    try {
      const [topProductsRes, stockLocationsRes, decisionsRes, dashStatsRes, goalsRes] = await phase2Promise;

      const topProducts = (topProductsRes.data?.data || [])
        .sort((a, b) => (b.ordersDelivered || 0) - (a.ordersDelivered || 0))
        .slice(0, 5);

      const stockEntries = stockLocationsRes.data?.data || [];
      const LOW_THRESHOLD = 5;
      const lowStockProducts = stockEntries
        .map(entry => ({
          name: entry.productName || entry.name || t('Produit inconnu'),
          stock: Math.max(0, (entry.quantity || 0) - (entry.sales || 0)),
          reorderThreshold: entry.reorderThreshold || LOW_THRESHOLD,
          urgency: Math.max(0, (entry.quantity || 0) - (entry.sales || 0)) === 0 ? 'critical'
            : Math.max(0, (entry.quantity || 0) - (entry.sales || 0)) <= 2 ? 'high' : 'medium',
          _id: entry._id,
          productId: entry.productId
        }))
        .filter(e => e.stock <= e.reorderThreshold)
        .sort((a, b) => a.stock - b.stock);

      const stockAlerts = { lowStockProducts, summary: { lowStockCount: lowStockProducts.length } };

      const goalsResponse = goalsRes.data?.data || {};
      const allGoals = goalsResponse.goals || [];

      // Agréger tous les objectifs par type pour créer 3 objectifs globaux
      const aggregateGoalsByType = (goals, type) => {
        const filtered = goals.filter(g => g.type === type);
        if (filtered.length === 0) return null;
        return {
          _id: `global_${type}`,
          type: type,
          targetValue: filtered.reduce((sum, g) => sum + (g.targetValue || 0), 0),
          currentValue: filtered.reduce((sum, g) => sum + (g.currentValue || 0), 0),
          periodType: 'monthly'
        };
      };
      
      const goalsData = [
        aggregateGoalsByType(allGoals, 'revenue'),
        aggregateGoalsByType(allGoals, 'ordersDelivered'),
        aggregateGoalsByType(allGoals, 'profit')
      ].filter(g => g !== null);
      
      console.log('🎯 Goals API Response:', goalsRes.data);
      console.log('🎯 Aggregated Global Goals:', goalsData);

      const dashStats = dashStatsRes.data?.data || {};
      const newDashStats = {
        conversionRate: dashStats.conversionRate || '0',
        conversionTrend: dashStats.conversionTrend || '0',
        averageOrderValue: dashStats.averageOrderValue || 0,
        avgOrderTrend: dashStats.avgOrderTrend || '0',
        activeClients: dashStats.activeClients || 0,
        activeClientsTrend: dashStats.activeClientsTrend || 0,
        returnRate: dashStats.returnRate || '0',
        returnRateTrend: dashStats.returnRateTrend || '0',
        topProducts: dashStats.topProducts || []
      };
      setDashboardStats(newDashStats);

      setStats(prev => {
        const newStats = {
          ...prev,
          products: topProducts,
          stockAlerts,
          decisions: decisionsRes.data?.data || {},
          goals: goalsData
        };
        console.log('📊 Updated stats.goals:', newStats.goals);
        return newStats;
      });

    } catch (error) {
      console.error('Erreur chargement secondaire:', error);
    } finally {
      if (isFirstLoad) {
        setLoadingSecondary(false);
        setLoadingProgress(90);
      }
      setIsRefreshing(false);
    }
  };

  // Assign function to ref after declaration to avoid TDZ
  loadDashboardDataRef.current = loadDashboardData;

  useEffect(() => {
    // Attendre la résolution des boutiques avant le 1er fetch : sinon on charge une
    // fois avec activeStore=null (données jetées) puis une 2e fois quand il se résout.
    // L'UI affiche déjà un loader tant que storesLoading est vrai (cf. plus bas).
    if (storesLoading) return;
    loadDashboardDataRef.current();
  }, [timeRange, customStartDate, customEndDate, activeStore?._id, storesLoading]);

  // Signaux d'activation (all-time) pour le guide "Premiers pas" — 1 seule fois par boutique
  useEffect(() => {
    let cancelled = false;
    const hasData = (res) => Array.isArray(res?.data?.data) && res.data.data.length > 0;
    (async () => {
      const [p, o, r] = await Promise.all([
        ecomApi.get('/products?limit=1').catch(() => null),
        ecomApi.get('/orders?limit=1').catch(() => null),
        ecomApi.get('/reports?limit=1').catch(() => null),
      ]);
      if (cancelled) return;
      setOnboarding({ hasProducts: hasData(p), hasOrders: hasData(o), hasReports: hasData(r), loaded: true });
    })();
    return () => { cancelled = true; };
  }, [activeStore?._id]);

  // Restaurer l'état "masqué" du guide (par workspace)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setOnboardingDismissed(localStorage.getItem(`scalor_gs_dismissed_${workspaceId || 'default'}`) === '1');
    } catch { /* localStorage indisponible */ }
  }, [workspaceId]);

  const dismissOnboarding = () => {
    setOnboardingDismissed(true);
    try {
      if (typeof window !== 'undefined') localStorage.setItem(`scalor_gs_dismissed_${workspaceId || 'default'}`, '1');
    } catch { /* localStorage indisponible */ }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('Bonjour');
    if (hour < 18) return t('Bon après-midi');
    return t('Bonsoir');
  };

  const formatPercent = (value) => `${(value * 100).toFixed(1)}%`;

  const getStatusColor = (status) => {
    const colors = {
      test: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      stable: 'bg-primary-100 text-primary border-primary-200',
      winner: 'bg-primary-100 text-primary border-primary-200',
      pause: 'bg-orange-100 text-orange-700 border-orange-200',
      stop: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || 'bg-muted text-foreground border-border';
  };

  const getOrderStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      confirmed: 'bg-primary',
      shipped: 'bg-primary',
      delivered: 'bg-primary',
      cancelled: 'bg-red-500',
      returned: 'bg-orange-500',
      reported: 'bg-purple-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const calculateProductMargin = (product) => {
    const sellingPrice = product.sellingPrice || 0;
    const totalCost = (product.productCost || 0) + (product.deliveryCost || 0) + (product.avgAdsCost || 0);
    return sellingPrice - totalCost;
  };

  // KPI calculés uniquement depuis les rapports financiers
  const periodStats = React.useMemo(() => {
    const curr = stats.financialStats || {};
    const prev = stats.prevFinancialStats || {};

    const totalRevenue = curr.totalRevenue || 0;
    const totalProfit = curr.totalProfit || 0;
    const totalOrders = curr.totalOrdersDelivered || 0;
    const deliveryRate = curr.deliveryRate || 0;

    const prevRevenue = prev.totalRevenue || 0;
    const prevProfit = prev.totalProfit || 0;
    const prevOrders = prev.totalOrdersDelivered || 0;
    const prevDeliveryRate = prev.deliveryRate || 0;

    const calcPctChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    return {
      totalRevenue,
      totalProfit,
      totalOrders,
      deliveryRate,
      revenueTrend: calcPctChange(totalRevenue, prevRevenue),
      profitTrend: calcPctChange(totalProfit, prevProfit),
      ordersTrend: totalOrders - prevOrders,
      deliveryRateTrend: deliveryRate - prevDeliveryRate
    };
  }, [stats.financialStats, stats.prevFinancialStats, timeRange]);

  // Formater le trend pour l'affichage
  const formatTrend = (value, isPercent = true) => {
    const sign = value >= 0 ? '+' : '';
    if (isPercent) return `${sign}${value.toFixed(1)}%`;
    return `${sign}${Math.round(value)}`;
  };

  // Mémoriser kpiCards pour éviter re-création à chaque render
  const kpiCards = React.useMemo(() => [
    {
      id: 'revenue',
      title: t("Chiffre d'affaires"),
      value: fmt(periodStats.totalRevenue),
      trend: formatTrend(periodStats.revenueTrend),
      trendUp: periodStats.revenueTrend >= 0,
      color: 'blue'
    },
    {
      id: 'profit',
      title: t('Bénéfice net'),
      value: fmt(periodStats.totalProfit),
      trend: formatTrend(periodStats.profitTrend),
      trendUp: periodStats.profitTrend >= 0,
      color: 'emerald'
    },
    {
      id: 'deliveryRate',
      title: t('Taux de livraison'),
      value: `${periodStats.deliveryRate.toFixed(1)}%`,
      trend: formatTrend(periodStats.deliveryRateTrend, true),
      trendUp: periodStats.deliveryRateTrend >= 0,
      color: 'orange'
    },
    {
      id: 'orders',
      title: t('Commandes livrées'),
      value: periodStats.totalOrders,
      trend: formatTrend(periodStats.ordersTrend, false),
      trendUp: periodStats.ordersTrend >= 0,
      color: 'violet'
    }
  ], [periodStats, fmt, t]);

  const quickActions = [
    {
      name: t('Nouveau produit'),
      description: t('Ajouter un article à votre boutique'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary',
      link: '/ecom/products/new'
    },
    {
      name: t('Nouvelle commande'),
      description: t('Créer une commande manuelle'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary',
      link: '/ecom/orders'
    },
    {
      name: t('Ajouter stock'),
      description: t("Mettre à jour l'inventaire"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary',
      link: '/ecom/stock/orders'
    }
  ];

  const topProductsPreview = (stats.products || []).slice(0, 5);
  const maxDeliveredCount = Math.max(...topProductsPreview.map(product => product.ordersDelivered || 0), 1);
  const lowStockProducts = stats.stockAlerts?.lowStockProducts?.slice(0, 5) || [];
  const lowStockCount = stats.stockAlerts?.summary?.lowStockCount || 0;

  // Attendre le chargement de l'état boutique avant d'afficher le dashboard.
  if (storesLoading) {
    return <DashboardSkeleton />;
  }

  const hasStores = stores.length > 0;

  // ── Guide "Premiers pas" : checklist d'activation qui pousse à l'action ──
  const gsSteps = [
    { key: 'store',   done: hasStores,             icon: Store,        short: tp('Boutique'), title: tp('Créer votre boutique'),          to: '/ecom/boutique/wizard' },
    { key: 'product', done: onboarding.hasProducts, icon: Package,      short: tp('Produit'),  title: tp('Ajouter votre premier produit'), to: '/ecom/products/new' },
    { key: 'order',   done: onboarding.hasOrders,   icon: ShoppingCart, short: tp('Commande'), title: tp('Marquer une commande'),          to: '/ecom/orders' },
    { key: 'report',  done: onboarding.hasReports,  icon: BarChart3,    short: tp('Rapport'),  title: tp('Créer votre premier rapport'),   to: '/ecom/reports/new' },
    { key: 'goal',    done: (stats.goals || []).length > 0, icon: Target, short: tp('Objectif'), title: tp('Définir un objectif du mois'), to: '/ecom/goals' },
  ];
  const gsDone = gsSteps.filter(s => s.done).length;
  const gsAllDone = gsDone === gsSteps.length;
  const gsPct = Math.round((gsDone / gsSteps.length) * 100);
  const nextStepKey = gsSteps.find(s => !s.done)?.key;
  const showGuide = onboarding.loaded && !gsAllDone && !onboardingDismissed;

  // La bannière "créer une boutique" est redondante avec l'étape 1 du guide
  const showStoreSetupBanner = Boolean(workspaceId) && !hasStores && !showGuide;

  // Si pas de workspace — afficher CTA (ici pour respecter les Rules of Hooks)
  if (!user?.workspaceId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{tp('Aucun espace configuré')}</h2>
          <p className="text-muted-foreground mb-6">
            {user?.role === 'ecom_admin'
              ? 'Créez votre propre espace pour commencer à utiliser Scalor.'
              : 'Rejoignez une équipe existante pour accéder aux données partagées.'}
          </p>
          <div className="space-y-3">
            <Link to="/ecom/workspace-setup" className="block w-full py-3 px-4 bg-primary hover:bg-primary-700 text-white font-medium rounded-lg transition">
              {tp('Créer un espace')}
            </Link>
            {user?.role !== 'ecom_admin' && (
              <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                Pour rejoindre une équipe, demandez un lien d'invitation à votre administrateur
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">

      {/* Barre de progression subtile en haut */}
      {(loadingKpi || loadingSecondary) && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-40">
          <div 
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(loadingProgress, 100)}%` }}
          />
        </div>
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">

        {/* Message de bienvenue */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-foreground">
            {getGreeting()}, {user?.name?.split(' ')[0] || tp('Admin')} ! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('Voici un aperçu de votre activité aujourd\'hui.')}
          </p>
        </div>

        {/* Guide "Premiers pas" — stepper compact qui pousse à l'action */}
        {showGuide && (
          <section className="mb-4 rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-sm sm:px-4">
            {/* Ligne 1 : titre + progression + fermer */}
            <div className="flex items-center gap-2.5">
              <Rocket className="h-4 w-4 shrink-0 text-primary" />
              <h2 className="text-[13px] font-semibold text-foreground whitespace-nowrap">{tp('Lancez votre activité')} 🚀</h2>
              <div className="hidden sm:block h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${gsPct}%` }} />
              </div>
              <span className="ml-auto sm:ml-0 whitespace-nowrap text-[11px] text-muted-foreground">
                <span className="font-semibold tabular-nums text-foreground">{gsDone}/{gsSteps.length}</span>
              </span>
              <button
                onClick={dismissOnboarding}
                aria-label={tp('Masquer le guide')}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-background hover:text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Ligne 2 : pastilles d'étapes (compact, wrap) */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {gsSteps.map((step) => {
                const Icon = step.icon;
                const isNext = step.key === nextStepKey;
                return (
                  <Link
                    key={step.key}
                    to={step.to}
                    title={step.title}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all ${
                      step.done
                        ? 'border-transparent bg-background text-muted-foreground'
                        : isNext
                          ? 'border-primary-200 bg-primary-50 text-primary hover:bg-primary-100'
                          : 'border-border bg-card text-foreground hover:border-gray-300 hover:bg-background'
                    }`}
                  >
                    {step.done
                      ? <Check className="h-3.5 w-3.5 text-primary-500" />
                      : <Icon className={`h-3.5 w-3.5 ${isNext ? 'text-primary' : 'text-muted-foreground'}`} />}
                    <span className={step.done ? 'line-through' : ''}>{step.short}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {showStoreSetupBanner && (
          <section className="mb-5 rounded-lg border border-primary-100 bg-card shadow-sm">
            <div className="flex flex-col gap-4 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                  <Store className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {tp('Création du workspace validée')}
                  </div>

                  <h2 className="text-base font-semibold text-gray-950 sm:text-lg">
                    Vous n'avez pas encore de boutique
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tp('Veuillez créer une boutique pour commencer à vendre vos produits.')}
                  </p>
                </div>
              </div>

              <Link
                to="/ecom/boutique/wizard"
                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {tp('Créer une boutique')}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Période selector - Style Shopify */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-1 bg-card border border-border rounded-lg p-1">
            <svg className="w-3.5 h-3.5 text-muted-foreground ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {[
              { id: 'today', label: t("Aujourd'hui") },
              { id: '7d', label: t('7 derniers jours') },
              { id: '30d', label: t('30 derniers jours') },
              { id: '90d', label: t('90 derniers jours') },
              { id: '365d', label: t('365 derniers jours') },
            ].map(period => (
              <button
                key={period.id}
                onClick={() => { setTimeRange(period.id); setCustomStartDate(''); setCustomEndDate(''); setShowDatePicker(false); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  timeRange === period.id
                    ? 'bg-gray-800 text-white'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {isRefreshing && timeRange === period.id
                  ? <span className="inline-block w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 align-middle"></span>
                  : null}
                {period.label}
              </button>
            ))}
            <button
              onClick={() => {
                setShowDatePicker(true);
                setCurrentCalendarMonth(new Date());
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                timeRange === 'custom'
                  ? 'bg-gray-800 text-white'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {timeRange === 'custom' && customStartDate && customEndDate
                ? `${new Date(customStartDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${new Date(customEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                : t('Personnaliser')}
            </button>
          </div>
        </div>

        {/* Modal de sélection de dates avec calendrier */}
        {showDatePicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDatePicker(false)}>
            <div className="bg-card rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">{t('Sélectionner une période')}</h3>
                <button
                  onClick={() => setShowDatePicker(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-muted-foreground"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Raccourcis rapides */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { id: 'today', label: t("Aujourd'hui") },
                  { id: '7d', label: t('7 jours') },
                  { id: '30d', label: t('30 jours') },
                  { id: '90d', label: t('90 jours') },
                  { id: '365d', label: t('1 an') },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setTimeRange(p.id); setCustomStartDate(''); setCustomEndDate(''); setShowDatePicker(false); }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                      timeRange === p.id ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Calendrier personnalisé */}
              <div className="mb-6">
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        const newDate = new Date(currentCalendarMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentCalendarMonth(newDate);
                      }}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h4 className="text-sm font-semibold text-foreground">
                      {currentCalendarMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </h4>
                    <button
                      onClick={() => {
                        const newDate = new Date(currentCalendarMonth);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentCalendarMonth(newDate);
                      }}
                      className="p-2 hover:bg-muted rounded-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                    <div key={i} className="text-xs font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {getCalendarDays().map((date, index) => {
                    const isToday = isDateToday(date);
                    const isSelected = isDateSelected(date);
                    const isInRange = isDateInRange(date);
                    const isDisabled = isDateDisabled(date);
                    
                    return (
                      <button
                        key={index}
                        onClick={() => handleDateClick(date)}
                        disabled={isDisabled}
                        className={`
                          h-10 text-sm rounded-lg transition-all
                          ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-muted'}
                          ${isToday ? 'font-bold' : ''}
                          ${isSelected ? 'bg-primary text-white hover:bg-primary-700' : ''}
                          ${isInRange && !isSelected ? 'bg-primary-100 text-primary-800' : ''}
                          ${!isDisabled && !isSelected && !isInRange ? 'text-foreground' : ''}
                        `}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Résumé de la sélection */}
              {customStartDate && !customEndDate && (
                <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                  <div className="text-sm text-primary-800">
                    {tp('Sélectionnez la date de fin')}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCustomStartDate('');
                    setCustomEndDate('');
                    setShowDatePicker(false);
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-foreground hover:bg-background transition"
                >
                  {tp('Fermer')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bloc Shopify : KPI + Courbe dans un seul bloc blanc */}
        <div className="bg-card border border-border rounded-xl shadow-sm mb-6">

          {/* KPI Row - style Shopify */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x-0 md:divide-x divide-gray-200 border-b border-border">
            {kpiCards.map((card, i) => {
              const isSelected = selectedMetric === card.id;
              const isLastInRowMobile = (i + 1) % 2 === 0;
              const isLastInRowDesktop = (i + 1) % 4 === 0;
              return (
                <KPICard
                  key={card.id}
                  card={card}
                  isSelected={isSelected}
                  onClick={() => setSelectedMetric(card.id)}
                  loadingKpi={loadingKpi}
                  isLastInRowMobile={isLastInRowMobile}
                  isLastInRowDesktop={isLastInRowDesktop}
                  index={i}
                />
              );
            })}
          </div>

          {/* Séparateur */}
          <div className="border-t border-border"></div>

          {/* Courbe - pleine largeur */}
          <div className="p-4">
            {loadingKpi ? (
              <div className="h-56 bg-muted rounded-xl animate-pulse" />
            ) : (periodStats.totalRevenue === 0 && periodStats.totalOrders === 0) ? (
              /* Période vide → CTA plutôt qu'un graphique mort */
              <div className="flex h-56 flex-col items-center justify-center px-4 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">{tp('Aucune activité sur cette période')}</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {tp('Créez un rapport ou ajoutez un produit pour voir vos ventes apparaître ici.')}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link to="/ecom/reports/new" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700">
                    <BarChart3 className="h-3.5 w-3.5" /> {tp('Créer un rapport')}
                  </Link>
                  <Link to="/ecom/products/new" className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:bg-background">
                    <Package className="h-3.5 w-3.5" /> {tp('Ajouter un produit')}
                  </Link>
                </div>
              </div>
            ) : <ChartContent data={stats.dailyFinancial || []} selectedMetric={selectedMetric} fmt={fmt} />}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {quickActions.map((action, i) => (
              <Link
                key={i}
                to={action.link}
                className="group bg-card border border-border rounded-xl p-3 sm:p-4 hover:shadow-sm active:scale-[0.99] transition-all duration-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3">
                  <div className={`${action.iconBg} ${action.iconColor} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] sm:text-sm font-semibold text-foreground leading-tight">{action.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{action.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Products & Stock Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-foreground">{t('Top produits')}</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">{t('Par nombre de ventes livrées')}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="hidden sm:inline text-xs text-muted-foreground tabular-nums">
                  {tp('{n} visibles', { n: topProductsPreview.length })}
                </span>
                <Link to="/ecom/reports" className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-primary font-medium whitespace-nowrap">
                  {tp('Voir tout')} <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {loadingSecondary ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 py-4">
                    <div className="h-4 w-4 rounded bg-muted animate-pulse mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-40 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-28 bg-muted rounded animate-pulse" />
                      <div className="h-1 w-full bg-muted rounded-full animate-pulse" />
                    </div>
                  </div>
                ))
              ) : topProductsPreview.map((product, i) => {
                const deliveryRate = product.ordersReceived > 0
                  ? ((product.ordersDelivered / product.ordersReceived) * 100).toFixed(0)
                  : 0;
                const deliveredRatio = Math.max(14, Math.round(((product.ordersDelivered || 0) / maxDeliveredCount) * 100));
                return (
                  <div key={product._id || i} className="flex items-start gap-3 sm:gap-4 py-4">
                    <span className="w-4 pt-0.5 text-sm font-semibold text-gray-300 tabular-nums flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-medium text-sm sm:text-[15px] text-foreground leading-snug truncate">{product.productName || t('Produit inconnu')}</p>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm sm:text-[15px] font-semibold text-foreground whitespace-nowrap">{fmt(product.revenue || 0)}</p>
                          <p className={`text-xs font-medium tabular-nums ${(product.profit || 0) >= 0 ? 'text-primary' : 'text-red-500'}`}>
                            {(product.profit || 0) >= 0 ? '+' : ''}{fmt(product.profit || 0)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {product.ordersDelivered || 0} {tp('livrées')}
                        <span className="text-gray-300"> · </span>
                        {deliveryRate}% {tp('livraison')}
                        <span className="text-gray-300"> · </span>
                        {product.ordersReceived || 0} {tp('reçues')}
                      </p>
                      <div className="mt-2.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${deliveredRatio}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loadingSecondary && topProductsPreview.length === 0 && (
                <div className="px-6 py-10 sm:py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 17l4-4 3 3 5-6M7 7h10M7 12h6" />
                    </svg>
                  </div>
                  <p className="text-foreground font-semibold mb-1">{t('Aucune donnée de vente disponible')}</p>
                  <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">{t('Créez des rapports pour faire remonter les produits leaders.')}</p>
                  <Link to="/ecom/reports/new" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6v12m6-6H6" /></svg>
                    {tp('Créer un rapport')}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-foreground">{t('Alertes stock')}</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">{t('Produits nécessitant réapprovisionnement')}</p>
              </div>
              {lowStockCount > 0 && (
                <span className="text-xs font-medium text-red-600 tabular-nums whitespace-nowrap flex-shrink-0">
                  {tp('{n} alertes', { n: lowStockCount })}
                </span>
              )}
            </div>

            {loadingSecondary ? (
              <div className="divide-y divide-gray-100">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 py-4">
                    <div className="h-2 w-2 rounded-full bg-muted animate-pulse mt-1.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-36 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-1 w-full bg-muted rounded-full animate-pulse" />
                    </div>
                    <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : lowStockProducts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {lowStockProducts.map((alert, i) => {
                  const stockProgress = alert.reorderThreshold > 0
                    ? Math.min(100, Math.max(0, (alert.stock / alert.reorderThreshold) * 100))
                    : 0;
                  const tone = alert.urgency === 'critical'
                    ? { dot: 'bg-red-500', bar: 'bg-red-500', label: 'text-red-600', text: t('Critique') }
                    : alert.urgency === 'high'
                      ? { dot: 'bg-orange-500', bar: 'bg-orange-500', label: 'text-orange-600', text: t('Élevée') }
                      : { dot: 'bg-yellow-500', bar: 'bg-yellow-500', label: 'text-yellow-600', text: t('À surveiller') };
                  return (
                    <div key={i} className="flex items-start gap-3 sm:gap-4 py-4">
                      <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${tone.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm sm:text-[15px] font-medium text-foreground leading-snug truncate">{alert.name}</p>
                          <span className={`text-xs font-medium flex-shrink-0 ${tone.label}`}>{tone.text}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                          {t('Stock actuel')} <span className="font-semibold text-foreground">{alert.stock}</span>
                          <span className="text-gray-300"> · </span>
                          {tp('Seuil')} {alert.reorderThreshold}
                        </p>
                        <div className="mt-2.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${stockProgress}%` }} />
                        </div>
                      </div>
                      <Link to="/ecom/stock/orders/new" className="flex-shrink-0 self-center text-xs sm:text-sm font-medium text-primary hover:text-primary whitespace-nowrap">
                        {tp('Réapprovisionner')}
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-6 py-10 sm:py-12 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-background border border-border flex items-center justify-center text-primary">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-foreground font-semibold">{tp('Tous les stocks sont au vert')}</p>
                <p className="text-sm text-muted-foreground mt-1">{tp('Aucun réapprovisionnement nécessaire pour le moment.')}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <Link to="/ecom/stock" className="flex items-center justify-center text-[13px] text-muted-foreground hover:text-foreground font-medium py-1.5 transition">
                {tp('Voir le rapport de stock')}
              </Link>
            </div>
          </div>
        </div>

        {/* Objectifs */}
        <div className="mt-8 bg-card rounded-2xl border/80 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-foreground">{tp('Objectifs du mois')}</h3>
              <p className="text-[13px] text-muted-foreground mt-0.5">{tp('Suivi de vos cibles mensuelles')}</p>
            </div>
            <Link to="/ecom/goals" className="inline-flex items-center gap-1 text-[13px] text-primary hover:text-primary font-medium whitespace-nowrap flex-shrink-0">
              {tp('Gérer')} <span aria-hidden>→</span>
            </Link>
          </div>
          {loadingSecondary ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-border rounded-xl p-4">
                  <div className="flex justify-between mb-3">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : stats.goals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {stats.goals.map((goal, idx) => {
                const goalTypeLabels = {
                  revenue: tp("Chiffre d'affaires"),
                  profit: tp('Bénéfice global'),
                  ordersDelivered: tp('Nombre de livraisons'),
                  orders: tp('Commandes'),
                  delivery_rate: tp('Taux de livraison')
                };
                const current = goal.currentValue || 0;
                const target = goal.targetValue || 1;
                const progress = (current / target) * 100;
                const done = progress >= 100;
                const tone = done ? 'emerald' : progress >= 75 ? 'primary' : progress >= 50 ? 'amber' : 'orange';
                const barColor = { emerald: 'bg-emerald-500', primary: 'bg-primary', amber: 'bg-amber-500', orange: 'bg-orange-500' }[tone];
                const badgeColor = { emerald: 'bg-emerald-50 text-emerald-700', primary: 'bg-primary-50 text-primary', amber: 'bg-amber-50 text-amber-700', orange: 'bg-orange-50 text-orange-700' }[tone];
                const fmtVal = (v) => goal.type === 'delivery_rate' ? `${Number(v).toFixed(1)}%` : goal.type === 'ordersDelivered' || goal.type === 'orders' ? v : fmt(v);
                return (
                  <div key={goal._id || idx} className="rounded-2xl border border-border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-card">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{goalTypeLabels[goal.type] || goal.type}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {goal.productId?.name && (
                            <span className="inline-flex max-w-[180px] truncate px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium" title={goal.productId.name}>📦 {goal.productId.name}</span>
                          )}
                          {goal.closeuseId?.name && (
                            <span className="inline-flex px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium">👤 {goal.closeuseId.name}</span>
                          )}
                        </div>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-1 rounded-full text-[11px] font-bold tabular-nums ${badgeColor}`}>
                        {done ? tp('✓ Atteint') : `${progress.toFixed(0)}%`}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-2 mb-2">
                      <span className="text-xl font-extrabold text-foreground tracking-tight tabular-nums">{fmtVal(current)}</span>
                      <span className="text-xs text-muted-foreground font-medium">/ {fmtVal(target)}</span>
                    </div>
                    <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                      <div className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/60 px-6 py-12 text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-2xl bg-violet-100/60 rotate-6" />
                <div className="relative w-16 h-16 bg-card rounded-2xl border border-violet-100 shadow-sm flex items-center justify-center text-violet-600">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={1.8} /><circle cx="12" cy="12" r="5" strokeWidth={1.8} /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </div>
              </div>
              <p className="text-foreground font-bold mb-1">{tp('Donnez un cap à votre mois')}</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">{tp('Un objectif clair vous garde motivé et transforme vos ventes quotidiennes en progression visible.')}</p>
              <div className="mb-5 flex flex-wrap items-center justify-center gap-1.5">
                {[tp("Chiffre d'affaires"), tp('Livraisons'), tp('Bénéfice')].map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-card px-2.5 py-1 text-[11px] font-medium text-violet-700">
                    <Target className="h-3 w-3" /> {chip}
                  </span>
                ))}
              </div>
              <Link to="/ecom/goals" className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 6v12m6-6H6" /></svg>
                {tp('Définir mon premier objectif')}
              </Link>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: tp('Taux de conversion'), value: `${dashboardStats.conversionRate}%`, trend: `${parseFloat(dashboardStats.conversionTrend) >= 0 ? '+' : ''}${dashboardStats.conversionTrend}%` },
            { label: tp('Panier moyen'), value: fmt(dashboardStats.averageOrderValue), trend: `${parseFloat(dashboardStats.avgOrderTrend) >= 0 ? '+' : ''}${dashboardStats.avgOrderTrend}%` },
            { label: tp('Clients actifs'), value: dashboardStats.activeClients.toString(), trend: `${dashboardStats.activeClientsTrend >= 0 ? '+' : ''}${dashboardStats.activeClientsTrend}` },
            { label: tp('Retours'), value: `${dashboardStats.returnRate}%`, trend: `${parseFloat(dashboardStats.returnRateTrend) >= 0 ? '+' : ''}${dashboardStats.returnRateTrend}%` },
          ].map((stat, i) => (
            <div key={i} className="bg-card rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <span className="text-xs text-primary font-medium mb-0.5">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
