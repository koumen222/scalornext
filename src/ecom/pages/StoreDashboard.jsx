import { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import {
  ArrowRight, RefreshCw, Download, Globe,
  Package, ShoppingCart, Zap, TrendingUp,
  ExternalLink, CreditCard,
  ChevronDown, ChevronLeft, ChevronRight, Calendar,
  Eye, Wallet, ShoppingBag, Percent
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ecomApi from '../services/ecommApi';
import { useEcomAuth } from '../hooks/useEcomAuth';
import { useStore } from '../contexts/StoreContext.jsx';
import { usePlatformT, tp } from '../i18n/platform.js';

const TODAY_AUTO_REFRESH_MS = 15000;

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const getQuarterStart = (date) => new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);

const isSameCalendarDay = (left, right) => {
  if (!left || !right) return false;
  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

const formatRangeLabel = (start, end) => {
  const format = (date) => date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  if (!start || !end) return '';
  return isSameCalendarDay(start, end) ? format(start) : `${format(start)} - ${format(end)}`;
};

function normalizeDashboardPayload(raw) {
  const payload = raw?.data?.data && (raw.data.data.analytics || raw.data.data.orders)
    ? raw.data.data
    : raw?.data && (raw.data.analytics || raw.data.orders)
      ? raw.data
      : raw;
  if (payload?.analytics || payload?.orders) return payload;
  return null;
}

function mapSummaryToDashboardData(summary = {}, range = null) {
  return {
    analytics: {
      overview: {
        uniqueVisitors: summary.totalVisitors || 0,
        visitsToday: summary.totalVisitors || 0,
        pageViews: summary.totalVisitors || 0,
        conversionRate: typeof summary.conversionRate === 'number'
          ? +(summary.conversionRate * 100).toFixed(1)
          : 0,
      },
      timeline: [],
      visitsPerProduct: [],
    },
    orders: {
      total: summary.totalOrders || 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: summary.todayOrders || 0,
      cancelled: 0,
      totalRevenue: summary.totalRevenue || summary.todaySales || 0,
      potentialRevenue: summary.totalRevenue || summary.todaySales || 0,
      realizedRevenue: summary.totalRevenue || summary.todaySales || 0,
      averageOrderValue: 0,
      dailyRevenue: {},
      dailyOrders: {},
      channelStats: {},
      channelPerformance: [],
    },
    topProductsBySales: [],
    topProductsByRevenue: [],
    leastProductsBySales: [],
    period: range || null,
  };
}

function hasMeaningfulDashboardData(payload) {
  const analytics = payload?.analytics?.overview || {};
  const orders = payload?.orders || {};
  const hasVisitors = Number(analytics.uniqueVisitors || 0) > 0;
  const hasPageViews = Number(analytics.pageViews || 0) > 0;
  const hasOrders = Number(orders.total || 0) > 0;
  const hasRevenue = Number(orders.totalRevenue || orders.potentialRevenue || 0) > 0;
  return hasVisitors || hasPageViews || hasOrders || hasRevenue;
}

function getDashboardCacheKey(workspaceId, storeId) {
  const storeSuffix = storeId ? `:${storeId}` : '';
  return `storeDashboard:lastMeaningful:${workspaceId || 'unknown'}${storeSuffix}`;
}

const DASHBOARD_CACHE_TTL = 30 * 60 * 1000; // 30 min

function readCachedDashboard(workspaceId, storeId) {
  try {
    const raw = localStorage.getItem(getDashboardCacheKey(workspaceId, storeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    // Evict stale entries
    if (parsed._ts && Date.now() - parsed._ts > DASHBOARD_CACHE_TTL) {
      localStorage.removeItem(getDashboardCacheKey(workspaceId, storeId));
      return null;
    }
    const { _ts, ...data } = parsed;
    return data;
  } catch {
    return null;
  }
}

function writeCachedDashboard(workspaceId, storeId, payload) {
  if (!workspaceId || !payload || !hasMeaningfulDashboardData(payload)) return;
  try {
    localStorage.setItem(getDashboardCacheKey(workspaceId, storeId), JSON.stringify({ ...payload, _ts: Date.now() }));
  } catch {
    // Ignore storage quota/security errors
  }
}

async function withNoActiveStoreHeader(requestFn) {
  if (typeof window === 'undefined') {
    return requestFn();
  }
  const previousStoreId = window.__activeStoreId__;
  window.__activeStoreId__ = null;
  try {
    return await requestFn();
  } finally {
    window.__activeStoreId__ = previousStoreId;
  }
}

const getPresetSelection = (key, referenceDate = new Date()) => {
  const todayStart = startOfDay(referenceDate);
  const now = new Date(referenceDate);
  const todayEnd = endOfDay(referenceDate);

  switch (key) {
    case 'today':
      return {
        key,
        type: 'range',
        start: todayStart,
        end: now,
        period: 'today',
        label: "Aujourd'hui",
      };
    case 'yesterday': {
      const yesterday = addDays(todayStart, -1);
      return {
        key,
        type: 'range',
        start: startOfDay(yesterday),
        end: endOfDay(yesterday),
        period: 'yesterday',
        label: 'Hier',
      };
    }
    case '7d':
      return {
        key,
        type: 'period',
        start: addDays(todayStart, -6),
        end: todayEnd,
        period: '7d',
        label: '7 derniers jours',
      };
    case '30d':
      return {
        key,
        type: 'period',
        start: addDays(todayStart, -29),
        end: todayEnd,
        period: '30d',
        label: '30 derniers jours',
      };
    case '90d':
      return {
        key,
        type: 'period',
        start: addDays(todayStart, -89),
        end: todayEnd,
        period: '90d',
        label: '90 derniers jours',
      };
    case 'quarter':
      return {
        key,
        type: 'range',
        start: startOfDay(getQuarterStart(referenceDate)),
        end: todayEnd,
        period: 'custom',
        label: 'Trimestre à ce jour',
      };
    default:
      return null;
  }
};

export default function StoreDashboard() {
  const t = usePlatformT();
  const { workspace } = useEcomAuth();
  const { activeStore } = useStore();
  const fallbackWorkspaceId = (() => {
    try {
      const raw = localStorage.getItem('ecomWorkspace');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?._id || parsed?.id || null;
    } catch {
      return null;
    }
  })();
  const resolvedWorkspaceId = workspace?._id || fallbackWorkspaceId || null;
  const [storeUrl, setStoreUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const [chartMetric, setChartMetric] = useState('visites');
  const [isChartCollapsed, setIsChartCollapsed] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState('7 derniers jours');
  const isTodayActive = period === 'today' || dateRange?.period === 'today';
  // Séries commandes/CA reconstruites depuis /store-orders pour la plage active :
  //  - horaire si plage ≤ 48 h (Aujourd'hui/Hier/24h), journalière sinon
  //  - counts : toutes commandes (iso dailyOrders de l'API)
  //  - revenue : commandes non annulées — le dailyRevenue de l'API ne compte que
  //    les LIVRÉES, d'où une courbe CA vide tant que rien n'est livré
  //  - complete=false (plage non couverte par la pagination) → repli séries API
  const [ordersSeries, setOrdersSeries] = useState(null);

  useEffect(() => {
    if (!resolvedWorkspaceId) return;
    const cached = readCachedDashboard(resolvedWorkspaceId, activeStore?._id);
    if (cached && hasMeaningfulDashboardData(cached)) {
      setDashboardData(cached);
    } else {
      // No cache for this store — clear stale data from previous store
      setDashboardData(null);
    }
  }, [resolvedWorkspaceId, activeStore?._id]);

  useEffect(() => {
    if (!resolvedWorkspaceId) return;
    // Un seul chargement au montage. Le 2e rechargement forcé (setTimeout) a été
    // retiré : il doublait toutes les requêtes ~1,2 s après. La fraîcheur "aujourd'hui"
    // reste assurée par le refresh sur focus/visibilité ci-dessous.
    loadDashboard(!dashboardData, { forceAllStores: true });
  }, [period, dateRange, resolvedWorkspaceId, activeStore?._id]);

  useEffect(() => {
    if (!isTodayActive) return undefined;

    const refreshTodayStats = () => {
      if (document.visibilityState === 'visible') loadDashboard(false);
    };

    const intervalId = window.setInterval(refreshTodayStats, TODAY_AUTO_REFRESH_MS);
    window.addEventListener('focus', refreshTodayStats);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshTodayStats);
    };
  }, [isTodayActive, resolvedWorkspaceId, activeStore?._id, dateRange]);

  // Reconstruction des séries commandes/CA via l'endpoint existant /store-orders
  // (tri createdAt desc, pagination limit 100, cap 3 pages) — aucun changement backend.
  // Le cap borne la cascade d'appels séquentiels ; le break anticipé (createdAt < start)
  // s'arrête souvent dès la 1re page. Repli séries API si incomplet.
  useEffect(() => {
    if (!resolvedWorkspaceId) {
      setOrdersSeries(null);
      return undefined;
    }
    const p = dateRange?.period || period;
    let start;
    let end;
    if (dateRange?.start && dateRange?.end) {
      start = new Date(dateRange.start);
      end = new Date(dateRange.end);
    } else {
      const preset = getPresetSelection(p === '24h' ? 'today' : p);
      if (p === '24h') {
        end = new Date();
        start = new Date(end.getTime() - 24 * 3600 * 1000);
      } else if (preset) {
        start = preset.start;
        end = preset.end;
      }
    }
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setOrdersSeries(null);
      return undefined;
    }

    const hourly = end.getTime() - start.getTime() <= 48 * 3600 * 1000;
    const pad2 = (v) => String(v).padStart(2, '0');
    let cancelled = false;

    (async () => {
      try {
        const counts = {};
        const revenue = {};
        let page = 1;
        let covered = false;

        while (!covered && page <= 3) {
          const res = await ecomApi.get('/store-orders', { params: { page, limit: 100 } });
          const payload = res?.data?.data || res?.data || {};
          const list = Array.isArray(payload.orders) ? payload.orders : [];
          if (list.length === 0) { covered = true; break; }

          for (const o of list) {
            const created = new Date(o.createdAt);
            if (Number.isNaN(created.getTime())) continue;
            if (created > end) continue;
            if (created < start) { covered = true; break; } // tri desc → le reste est plus ancien
            const key = hourly
              ? `${created.getFullYear()}-${pad2(created.getMonth() + 1)}-${pad2(created.getDate())}T${pad2(created.getHours())}`
              : `${created.getFullYear()}-${pad2(created.getMonth() + 1)}-${pad2(created.getDate())}`;
            counts[key] = (counts[key] || 0) + 1;
            if (o.status !== 'cancelled') revenue[key] = (revenue[key] || 0) + (o.total || 0);
          }

          const totalPages = payload?.pagination?.pages || 1;
          if (page >= totalPages) covered = true;
          page += 1;
        }

        if (!cancelled) setOrdersSeries({ counts, revenue, hourly, complete: covered });
      } catch {
        if (!cancelled) setOrdersSeries(null); // repli : séries API (dailyOrders/dailyRevenue)
      }
    })();

    return () => { cancelled = true; };
  }, [dateRange, period, resolvedWorkspaceId, activeStore?._id]);

  const loadDashboard = async (isInitial, options = {}) => {
    // When a specific store is active, always scope to that store.
    // Only fetch all-stores aggregated data when no store is selected.
    const hasActiveStore = !!activeStore?._id;
    const useAllStores = !hasActiveStore && options.forceAllStores !== false;
    if (!resolvedWorkspaceId) return;
    try {
      if (isInitial) setLoading(true); else setRefreshing(true);
      const params = { workspaceId: resolvedWorkspaceId };
      if (dateRange) {
        params.startDate = dateRange.start;
        params.endDate = dateRange.end;
        params.period = dateRange.period || period;
      }
      if (!params.period) params.period = period;

      const fetchDashboard = useAllStores
        ? withNoActiveStoreHeader(() => ecomApi.get('/store-analytics/dashboard', { params: { ...params, allStores: 1 } }))
        : ecomApi.get('/store-analytics/dashboard', { params });

      const [response, configRes] = await Promise.all([
        fetchDashboard,
        ecomApi.get('/store-manage/config').catch(() => null),
      ]);
      let normalized = normalizeDashboardPayload(response.data);

      // Fallback to all-stores only when no specific store is active and data is empty
      if (!hasActiveStore && (!normalized || !hasMeaningfulDashboardData(normalized))) {
        const allStoresResponse = await withNoActiveStoreHeader(() => ecomApi.get('/store-analytics/dashboard', {
          params: { ...params, allStores: 1 },
        })).catch(() => null);
        const allStoresNormalized = normalizeDashboardPayload(allStoresResponse?.data);
        if (allStoresNormalized && hasMeaningfulDashboardData(allStoresNormalized)) {
          normalized = allStoresNormalized;
        }
      }

      if (normalized && hasMeaningfulDashboardData(normalized)) {
        setDashboardData(normalized);
        writeCachedDashboard(resolvedWorkspaceId, activeStore?._id, normalized);
      } else {
        const summaryFetch = useAllStores
          ? withNoActiveStoreHeader(() => ecomApi.get('/store/analytics/summary', { params: { allStores: 1 } }))
          : ecomApi.get('/store/analytics/summary');
        let summaryResponse = await summaryFetch.catch(() => null);
        let summary = summaryResponse?.data?.data || summaryResponse?.data || {};

        const mappedSummary = mapSummaryToDashboardData(summary, response?.data?.period || null);
        if (hasMeaningfulDashboardData(mappedSummary)) {
          setDashboardData(mappedSummary);
          writeCachedDashboard(resolvedWorkspaceId, activeStore?._id, mappedSummary);
        } else {
          const cached = readCachedDashboard(resolvedWorkspaceId, activeStore?._id);
          if (cached && hasMeaningfulDashboardData(cached)) {
            setDashboardData(cached);
          } else {
            setDashboardData(mappedSummary);
          }
        }
      }

      const subdomain = configRes?.data?.data?.subdomain;
      const storeUrlFromApi = configRes?.data?.data?.storeUrl;
      if (storeUrlFromApi) setStoreUrl(storeUrlFromApi);
      else if (subdomain) setStoreUrl(`https://${subdomain}.scalor.net`);
    } catch (error) {
      console.error('Erreur dashboard:', error);
      const summaryFetch = useAllStores
        ? withNoActiveStoreHeader(() => ecomApi.get('/store/analytics/summary', { params: { allStores: 1 } }))
        : ecomApi.get('/store/analytics/summary');
      let summaryResponse = await summaryFetch.catch(() => null);
      let summary = summaryResponse?.data?.data || summaryResponse?.data || null;

      if (summary) {
        const mappedSummary = mapSummaryToDashboardData(summary, null);
        if (hasMeaningfulDashboardData(mappedSummary)) {
          setDashboardData(mappedSummary);
          writeCachedDashboard(resolvedWorkspaceId, activeStore?._id, mappedSummary);
        } else {
          const cached = readCachedDashboard(resolvedWorkspaceId, activeStore?._id);
          if (cached && hasMeaningfulDashboardData(cached)) {
            setDashboardData(cached);
          } else {
            setDashboardData(mappedSummary);
          }
        }
      } else {
        const cached = readCachedDashboard(resolvedWorkspaceId, activeStore?._id);
        if (cached && hasMeaningfulDashboardData(cached)) {
          setDashboardData(cached);
        }
      }
    } finally { setLoading(false); setRefreshing(false); }
  };

  const exportAnalytics = async () => {
    try {
      const response = await ecomApi.get('/store-analytics/export', { params: { workspaceId: workspace?._id }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { console.error('Export error:', e); }
  };

  const n = (v) => new Intl.NumberFormat('fr-FR').format(v || 0);

  const analytics = dashboardData?.analytics?.overview || {};
  const orders = dashboardData?.orders || {};
  const timeline = dashboardData?.analytics?.timeline || [];
  // Devise = celle renvoyée par l'API stats (revenus déjà convertis côté serveur),
  // sinon la devise configurée sur la boutique active. Jamais « FCFA » en dur.
  const currency = dashboardData?.storeCurrency
    || activeStore?.storeSettings?.storeCurrency
    || activeStore?.storeSettings?.currency
    || activeStore?.currency
    || workspace?.storeSettings?.storeCurrency
    || 'XAF';
  // Libellé affiché : « FCFA » pour XAF/XOF, sinon le code de la devise (GNF, EUR…).
  const currencyLabel = (currency === 'XAF' || currency === 'XOF') ? 'FCFA' : currency;
  const applyPreset = (key, label) => {
    setDateRange(null);
    setPeriod(key);
    setPeriodLabel(label);
    setDatePickerOpen(false);
  };

  const applyCustomRange = (start, end, options = {}) => {
    const normalizedStart = startOfDay(start);
    const isTodaySelection = isSameCalendarDay(end, new Date());
    const normalizedEnd = isTodaySelection ? new Date() : endOfDay(end);
    let derivedPeriod = 'custom';
    if (isSameCalendarDay(normalizedStart, normalizedEnd)) {
      if (isSameCalendarDay(normalizedStart, new Date())) derivedPeriod = 'today';
      else if (isSameCalendarDay(normalizedStart, addDays(new Date(), -1))) derivedPeriod = 'yesterday';
      else derivedPeriod = 'custom';
    }
    const nextPeriod = options.period || derivedPeriod;

    setDateRange({
      start: normalizedStart.toISOString(),
      end: normalizedEnd.toISOString(),
      period: nextPeriod,
    });
    setPeriod(nextPeriod);
    setPeriodLabel(options.label || formatRangeLabel(normalizedStart, normalizedEnd));
    setDatePickerOpen(false);
  };

  const processingCount = orders.processing || 0;

  const metrics = [
    { key: 'visites', label: t('Visiteurs'), value: n(analytics.uniqueVisitors || 0), sub: t("{n} aujourd'hui", { n: n(analytics.visitsToday || 0) }), icon: Eye },
    { key: 'revenus', label: t('Revenus'), value: `${n(orders.totalRevenue || 0)} ${currencyLabel}`, sub: t('{n} FCFA / commande', { n: n(orders.averageOrderValue || 0) }).replace('FCFA', currencyLabel), icon: Wallet },
    { key: 'commandes', label: t('Commandes'), value: n(orders.total || 0), sub: t('{n} livrées', { n: orders.delivered || 0 }), icon: ShoppingBag },
    { key: 'conversion', label: t('Conversion'), value: `${analytics.conversionRate || 0}%`, sub: t('{n} pages vues', { n: n(analytics.pageViews || 0) }), icon: Percent },
  ];

  // ── Séries du graphique ────────────────────────────────────────────────────
  const effPeriodValue = dateRange?.period || period;
  const hourlyMode = ['24h', 'today', 'yesterday'].includes(effPeriodValue);
  // Séries /store-orders utilisables si la plage a été entièrement couverte
  const ordersSeriesReady = !!ordersSeries?.complete;

  // Clé horaire backend ($dateToString, UTC) → clé heure locale, pour aligner la
  // timeline sur les buckets /store-orders (construits en heure locale)
  const utcHourKeyToLocal = (key) => {
    if (!key.includes('T')) return key;
    const d = new Date(`${key}:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return key;
    const p2 = (v) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}`;
  };

  // Série de la timeline pour un ou plusieurs types d'événements
  const timelineSeries = (eventTypes, { toLocal = false } = {}) => {
    const wanted = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const map = {};
    (timeline || []).forEach((item) => {
      const d = item?._id?.date;
      if (!d || !wanted.includes(item?._id?.eventType)) return;
      const key = toLocal ? utcHourKeyToLocal(d) : d;
      map[key] = (map[key] || 0) + (item.count || 0);
    });
    return map;
  };

  let chartData;
  if (chartMetric === 'visites') {
    chartData = timeline;
  } else if (chartMetric === 'commandes') {
    chartData = ordersSeriesReady
      ? Object.entries(ordersSeries.counts).map(([date, total]) => ({ date, total }))
      : Object.entries(orders.dailyOrders || {}).map(([date, count]) => ({ date, total: count }));
  } else if (chartMetric === 'revenus') {
    chartData = ordersSeriesReady
      ? Object.entries(ordersSeries.revenue).map(([date, total]) => ({ date, total }))
      : Object.entries(orders.dailyRevenue || {}).map(([date, amount]) => ({ date, total: amount }));
  } else {
    // Conversion par bucket = commandes / vues (pages + produits — le storefront
    // tracke surtout des product_view, page_view est marginal).
    //  - numérateur : vraies commandes (/store-orders) si dispo, sinon order_placed trackés
    //  - clés horaires re-calées en heure locale pour s'aligner sur /store-orders
    const views = timelineSeries(['page_view', 'product_view'], { toLocal: hourlyMode });
    const trackedOrders = timelineSeries('order_placed', { toLocal: hourlyMode });
    const orderCounts = ordersSeriesReady ? ordersSeries.counts : trackedOrders;
    chartData = Object.keys(views)
      .sort()
      .map((date) => ({
        date,
        total: views[date] > 0
          ? +((Math.min(orderCounts[date] || 0, views[date]) / views[date]) * 100).toFixed(1)
          : 0,
      }));
  }
  const chartMetricLabel = {
    visites: t('Visites'),
    commandes: t('Commandes'),
    revenus: t('Revenus'),
    conversion: t('Conversion'),
  };

  const actions = [
    { icon: Package, label: t('Commandes'), to: '/ecom/boutique/orders', count: orders.total || 0 },
    { icon: ShoppingCart, label: t('Nouveau produit'), to: '/ecom/boutique/products/new' },
    { icon: Zap, label: t('Thème'), to: '/ecom/boutique/theme' },
    { icon: TrendingUp, label: t('Campagne'), to: '/ecom/campaigns/new' },
  ];

  return (
    <div className="p-5 sm:p-8 lg:p-10 max-w-6xl mx-auto space-y-8">

      {loading && !dashboardData && (
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="h-1.5 w-40 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-1/2 bg-gray-300 animate-pulse" />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-[22px] font-bold tracking-tight text-foreground">{t("Vue d'ensemble")}</h1>
          <p className="text-[13px] text-muted-foreground mt-1">{t(periodLabel)}</p>
        </div>
        <div className="flex items-center gap-2">
          {(storeUrl || activeStore?.subdomain) && (
            <a href={storeUrl || `https://${activeStore.subdomain}.scalor.net`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:inline-flex text-[13px] font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-xl hover:bg-muted transition items-center gap-1.5">
              <Globe size={14} /> Boutique
            </a>
          )}
          <div className="hidden sm:block h-6 w-px bg-gray-200 mx-0.5" />
          <div className="relative flex-1 sm:flex-none">
            <button onClick={() => setDatePickerOpen(!datePickerOpen)}
              className="flex w-full sm:w-auto sm:min-w-[190px] items-center justify-between gap-2 rounded-xl border border-border/80 bg-card px-3.5 py-2.5 sm:py-2 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-gray-300 hover:bg-background transition">
              <span className="flex items-center gap-2 min-w-0">
                <Calendar size={14} className="text-primary-500 flex-shrink-0" />
                <span className="truncate">{t(periodLabel)}</span>
              </span>
              <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
            </button>
            {datePickerOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDatePickerOpen(false)} />
                <DatePickerDropdown
                  onPreset={applyPreset}
                  onCustom={applyCustomRange}
                  onClose={() => setDatePickerOpen(false)}
                  activePeriod={period}
                  activeLabel={periodLabel}
                  selectedRange={dateRange}
                />
              </>
            )}
          </div>
          <button onClick={() => loadDashboard(false, { forceAllStores: true })} disabled={refreshing} className="p-2.5 sm:p-2 text-muted-foreground hover:text-foreground rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-background hover:border-gray-300 transition">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={exportAnalytics} className="p-2.5 sm:p-2 text-muted-foreground hover:text-foreground rounded-xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:bg-background hover:border-gray-300 transition">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Alertes */}
      {processingCount > 0 && (
        <div className="flex gap-3">
          {processingCount > 0 && (
            <Link to="/ecom/boutique/orders" className="flex items-center gap-2 text-[13px] font-medium text-blue-700 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition">
              <CreditCard size={14} />
              {processingCount} paiement{processingCount > 1 ? 's' : ''}
              <ArrowRight size={12} className="ml-1 opacity-50" />
            </Link>
          )}
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m, i) => {
          const active = chartMetric === m.key;
          return (
            <button key={i} onClick={() => setChartMetric(m.key)}
              className={`group relative flex flex-col items-start rounded-2xl border bg-card px-4 sm:px-5 py-4 text-left transition-all duration-200
                ${active
                  ? 'border-primary-500/40 shadow-[0_18px_40px_-24px_rgba(15,107,79,0.55)] ring-1 ring-primary-500/30'
                  : 'border-border/70 shadow-[0_2px_4px_rgba(16,24,40,0.04)] hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_20px_40px_-26px_rgba(16,24,40,0.35)]'}`}>
              <div className="flex w-full items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active ? 'bg-primary text-white' : 'bg-primary-50 text-primary group-hover:bg-primary-100'}`}>
                  <m.icon size={17} strokeWidth={2} />
                </span>
                <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{m.label}</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-3 tabular-nums truncate w-full">{m.value}</p>
              {m.sub && <p className="text-[11px] text-muted-foreground mt-1 truncate w-full">{m.sub}</p>}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border/70 shadow-[0_2px_8px_rgba(16,24,40,0.05)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <div className="relative">
              <select
                value={chartMetric}
                onChange={(e) => setChartMetric(e.target.value)}
                className="appearance-none rounded-lg border border-border bg-card py-1.5 pl-3 pr-8 text-[13px] font-semibold text-foreground outline-none transition hover:border-gray-300 hover:bg-background focus:border-primary-400"
              >
                {Object.entries(chartMetricLabel).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
          <button
            onClick={() => setIsChartCollapsed((value) => !value)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {isChartCollapsed ? t('Afficher') : t('Masquer')}
            <ChevronDown size={14} className={`transition-transform ${isChartCollapsed ? '' : 'rotate-180'}`} />
          </button>
        </div>
        {!isChartCollapsed && (chartData && chartData.length > 0 ? (
          <AreaChart
            data={chartData}
            unit={
              chartMetric === 'visites' ? 'visites'
                : chartMetric === 'commandes' ? 'commandes'
                  : chartMetric === 'conversion' ? '%'
                    : currencyLabel
            }
            // Granularité alignée sur la source de chaque série :
            //  - visites & conversion (timeline API) : horaire pour 24h/aujourd'hui/hier
            //  - commandes/CA : granularité des séries /store-orders (horaire ≤ 48 h),
            //    sinon repli API (journalier, sauf 24h horaire)
            hourly={
              chartMetric === 'visites' || chartMetric === 'conversion'
                ? hourlyMode
                : ordersSeriesReady ? !!ordersSeries.hourly : effPeriodValue === '24h'
            }
            rangeStart={dashboardData?.period?.start}
            rangeEnd={dashboardData?.period?.end}
            respectSelectedRange={Boolean(dashboardData?.period?.start && dashboardData?.period?.end)}
          />
        ) : (
          <div className="h-40 flex items-center justify-center text-[13px] text-gray-300">
            {tp('Aucune donnée')}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {actions.map((a, i) => (
          <Link key={i} to={a.to}
            className="group flex items-center gap-3 bg-card border border-border/70 rounded-2xl px-4 py-3.5 shadow-[0_2px_4px_rgba(16,24,40,0.04)] hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_16px_30px_-22px_rgba(16,24,40,0.3)] transition-all duration-200">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary group-hover:bg-primary-100 transition-colors flex-shrink-0">
              <a.icon size={16} />
            </span>
            <span className="text-[13px] font-medium text-foreground group-hover:text-foreground transition truncate">{a.label}</span>
            {a.count !== undefined && <span className="ml-auto text-[11px] font-semibold text-muted-foreground tabular-nums">{a.count}</span>}
          </Link>
        ))}
      </div>

      {/* Produits — dynamique selon la métrique */}
      {(() => {
        const configs = {
          visites: {
            title: t('Produits les plus visités'),
            data: dashboardData?.analytics?.visitsPerProduct || [],
            valueKey: 'visits',
            valueLabel: (p) => n(p.visits),
            subLabel: (p) => `${n(p.uniqueVisitorCount)} uniques`,
          },
          commandes: {
            title: t('Produits les plus vendus'),
            data: dashboardData?.topProductsBySales || [],
            valueKey: 'sold',
            valueLabel: (p) => `${n(p.sold)} vendus`,
            subLabel: (p) => `${n(p.revenue)} ${currencyLabel}`,
          },
          revenus: {
            title: t('Produits par revenu'),
            data: dashboardData?.topProductsByRevenue || [],
            valueKey: 'revenue',
            valueLabel: (p) => `${n(p.revenue)} ${currencyLabel}`,
            subLabel: (p) => `${n(p.sold)} vendus`,
          },
          // Pas de classement produit propre à la conversion → produits les plus vendus
          conversion: {
            title: t('Produits les plus vendus'),
            data: dashboardData?.topProductsBySales || [],
            valueKey: 'sold',
            valueLabel: (p) => `${n(p.sold)} vendus`,
            subLabel: (p) => `${n(p.revenue)} ${currencyLabel}`,
          },
        };
        const cfg = configs[chartMetric];
        const items = cfg.data.slice(0, 5);
        const maxV = items[0]?.[cfg.valueKey] || 1;

        return (
          <div className="bg-card rounded-2xl border/70 shadow-[0_2px_8px_rgba(16,24,40,0.05)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <p className="text-[14px] font-semibold text-foreground">{cfg.title}</p>
              <Link to="/ecom/boutique/products" className="text-[12px] font-medium text-primary hover:text-primary transition">{tp('Voir tout')}</Link>
            </div>
            {items.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {items.map((p, i) => (
                  <div key={p._id || p.name || i} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-background/70 transition">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums flex-shrink-0 ${i === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground truncate">{p.name || t('Sans nom')}</p>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500" style={{ width: `${(p[cfg.valueKey] / maxV) * 100}%` }} />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[13px] font-semibold text-foreground tabular-nums">{cfg.valueLabel(p)}</p>
                      <p className="text-[10px] text-muted-foreground">{cfg.subLabel(p)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-[13px] text-gray-300">{tp('Aucune donnée disponible')}</div>
            )}
          </div>
        );
      })()}

    </div>
  );
}

/* ─── Area Chart ─── */

const AreaChart = ({ data, unit, hourly, rangeStart, rangeEnd, respectSelectedRange }) => {
  // Garde-fou : jamais de buckets horaires sur une plage > 48 h. Évite labels/clés
  // dupliqués ("21h" × N jours) si un état transitoire mélange période horaire
  // et plage multi-jours (ex. refresh pendant un changement de période).
  const _rs = rangeStart ? new Date(rangeStart) : null;
  const _re = rangeEnd ? new Date(rangeEnd) : null;
  const _spanValid = _rs && _re && !Number.isNaN(_rs.getTime()) && !Number.isNaN(_re.getTime());
  const effectiveHourly = hourly && (!respectSelectedRange || (_spanValid && _re - _rs <= 48 * 3600 * 1000));

  const grouped = data.reduce((acc, item) => {
    const d = item._id?.date || item.date;
    if (!d) return acc;
    if (!acc[d]) acc[d] = { date: d, total: 0 };
    acc[d].total += item.count || item.total || 0;
    return acc;
  }, {});
  const buildBucketsFromRange = () => {
    if (!rangeStart || !rangeEnd) return [];

    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const cursor = new Date(start);
    const buckets = [];

    if (effectiveHourly) {
      cursor.setMinutes(0, 0, 0);
      end.setMinutes(59, 59, 999);
      while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}T${String(cursor.getHours()).padStart(2, '0')}`;
        buckets.push({ date: key, total: grouped[key]?.total || 0 });
        cursor.setHours(cursor.getHours() + 1);
      }
      return buckets;
    }

    cursor.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    while (cursor <= end) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
      buckets.push({ date: key, total: grouped[key]?.total || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  };

  const rawPts = respectSelectedRange
    ? buildBucketsFromRange()
    : Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  if (!rawPts.length) return null;

  let pts = rawPts;
  if (!respectSelectedRange) {
    let firstNonZeroIndex = rawPts.findIndex((point) => point.total > 0);
    let lastNonZeroIndex = -1;
    for (let i = rawPts.length - 1; i >= 0; i -= 1) {
      if (rawPts[i].total > 0) {
        lastNonZeroIndex = i;
        break;
      }
    }

    if (firstNonZeroIndex === -1) firstNonZeroIndex = 0;
    if (lastNonZeroIndex === -1) lastNonZeroIndex = rawPts.length - 1;

    pts = rawPts.slice(firstNonZeroIndex, lastNonZeroIndex + 1);
  }
  if (!pts.length) return null;

  const chartPoints = pts.map((point) => ({
    ...point,
    label: effectiveHourly
      ? `${point.date.split('T')[1] || ''}h`
      : new Date(point.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
  }));
  const lineColor = '#0F6B4F';
  const formatValue = (value) => {
    if (unit === '%') return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value || 0)} %`;
    if (unit && unit !== 'visites' && unit !== 'commandes') return `${new Intl.NumberFormat('fr-FR').format(value || 0)} ${unit}`;
    return new Intl.NumberFormat('fr-FR').format(value || 0);
  };
  const formatAxisValue = (value) => new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0);
  const visibleTickIndexes = chartPoints.length <= 8
    ? chartPoints.map((_, index) => index)
    : [0, Math.floor((chartPoints.length - 1) / 3), Math.floor(((chartPoints.length - 1) * 2) / 3), chartPoints.length - 1];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-xl bg-gray-900 px-3 py-2 text-[11px] font-medium text-white shadow-lg">
        <div>{formatValue(payload[0].value)}</div>
        <div className="text-muted-foreground">{label}</div>
      </div>
    );
  };

  return (
    <div className="px-4 pb-2 pt-4">
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={chartPoints} margin={{ top: 8, right: 8, bottom: 18, left: 0 }}>
            <defs>
              <linearGradient id="dashboardAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              minTickGap={24}
              padding={{ left: 0, right: 0 }}
              ticks={visibleTickIndexes.map((index) => chartPoints[index]?.label).filter(Boolean)}
              tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={34}
              tickFormatter={formatAxisValue}
              tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 500 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={lineColor}
              strokeWidth={3}
              fill="url(#dashboardAreaFill)"
              isAnimationActive={false}
              activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2, fill: lineColor }}
              dot={false}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/* ─── Date Picker Dropdown (Shopify-style) ─── */

const DAYS = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const DatePickerDropdown = ({ onPreset, onCustom, onClose, activePeriod, activeLabel, selectedRange }) => {
  const t = usePlatformT();
  const today = new Date();
  const initialPreset = selectedRange ? null : getPresetSelection(activePeriod === 'custom' ? '7d' : activePeriod) || getPresetSelection('7d');
  const initialStart = selectedRange?.start ? new Date(selectedRange.start) : initialPreset?.start || startOfDay(today);
  const initialEnd = selectedRange?.end ? new Date(selectedRange.end) : initialPreset?.end || endOfDay(today);
  const presetFromLabel = activeLabel === "Aujourd'hui"
    ? 'today'
    : activeLabel === 'Hier'
      ? 'yesterday'
      : activeLabel === 'Trimestre à ce jour'
        ? 'quarter'
        : 'custom';

  const [rightMonth, setRightMonth] = useState(initialEnd.getMonth());
  const [rightYear, setRightYear] = useState(initialEnd.getFullYear());
  const [selStart, setSelStart] = useState(initialStart);
  const [selEnd, setSelEnd] = useState(initialEnd);
  const [activePreset, setActivePreset] = useState(selectedRange ? presetFromLabel : initialPreset?.key || '7d');

  const leftMonth = rightMonth === 0 ? 11 : rightMonth - 1;
  const leftYear = rightMonth === 0 ? rightYear - 1 : rightYear;

  const prevMonth = () => {
    if (rightMonth === 0) { setRightMonth(11); setRightYear(rightYear - 1); }
    else setRightMonth(rightMonth - 1);
  };
  const nextMonth = () => {
    if (rightMonth === 11) { setRightMonth(0); setRightYear(rightYear + 1); }
    else setRightMonth(rightMonth + 1);
  };

  const getDays = (year, month) => {
    const first = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let d = 1; d <= count; d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const isToday = (d) => d && d.toDateString() === today.toDateString();
  const isFuture = (d) => d && d > today;
  const isInRange = (d) => {
    if (!d || !selStart) return false;
    if (!selEnd) return d.toDateString() === selStart.toDateString();
    return d >= selStart && d <= selEnd;
  };
  const isStart = (d) => d && selStart && d.toDateString() === selStart.toDateString();
  const isEnd = (d) => d && selEnd && d.toDateString() === selEnd.toDateString();

  const handleDayClick = (d) => {
    if (!d || isFuture(d)) return;
    setActivePreset('custom');
    if (!selStart || (selStart && selEnd)) {
      setSelStart(d);
      setSelEnd(null);
    } else {
      let start = selStart;
      let end = d;
      if (d < selStart) {
        start = d;
        end = selStart;
      }
      setSelStart(start);
      setSelEnd(end);
      // Appliquer et fermer immédiatement
      onCustom(start, end);
    }
  };

  const fmtInput = (d) => d ? d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const presetSections = [
    {
      title: null,
      items: [
        { key: 'today', label: "Aujourd'hui" },
        { key: 'yesterday', label: 'Hier' },
      ],
    },
    {
      title: 'Derniers',
      items: [
        { key: '7d', label: '7 derniers jours' },
        { key: '30d', label: '30 derniers jours' },
        { key: '90d', label: '90 derniers jours' },
      ],
    },
    {
      title: 'Trimestres',
      items: [
        { key: 'quarter', get label() { return tp('Trimestre à ce jour'); } },
      ],
    },
    {
      title: null,
      items: [
        { key: 'custom', get label() { return tp('Période personnalisée'); } },
      ],
    },
  ];

  const handlePreset = (key) => {
    setActivePreset(key);

    if (key === 'custom') {
      return;
    }

    const selection = getPresetSelection(key, today);
    if (!selection) return;

    setSelStart(selection.start);
    setSelEnd(selection.end);
    setRightMonth(selection.end.getMonth());
    setRightYear(selection.end.getFullYear());

    // Appliquer et fermer immédiatement
    if (selection.type === 'period') {
      onPreset(selection.period, selection.label);
    } else {
      onCustom(selection.start, selection.end, { period: selection.period, label: selection.label });
    }
  };

  const handleApply = () => {
    if (activePreset && activePreset !== 'custom') {
      const selection = getPresetSelection(activePreset, today);
      if (!selection) return;

      if (selection.type === 'period') {
        onPreset(selection.period, selection.label);
      } else {
        onCustom(selection.start, selection.end, { period: selection.period, label: selection.label });
      }
      return;
    }

    if (selStart && selEnd) onCustom(selStart, selEnd);
    else if (selStart) onCustom(selStart, selStart);
  };

  const renderCalendar = (year, month) => {
    const days = getDays(year, month);
    return (
      <div>
        <p className="text-[14px] font-semibold text-foreground text-center mb-4">{t(MONTHS[month])} {year}</p>
        <div className="grid grid-cols-7 gap-y-1">
          {DAYS.map((d) => <div key={d} className="text-[11px] font-medium text-muted-foreground text-center py-1">{d}</div>)}
          {days.map((d, i) => (
            <button key={i} disabled={!d || isFuture(d)}
              onClick={() => handleDayClick(d)}
              className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-[13px] transition-all
                ${!d ? 'pointer-events-none opacity-0' : ''}
                ${d && isFuture(d) ? 'text-gray-200 cursor-not-allowed' : ''}
                ${d && !isFuture(d) && !isInRange(d) ? 'text-foreground hover:bg-muted' : ''}
                ${isInRange(d) && !isStart(d) && !isEnd(d) ? 'bg-muted text-foreground rounded-md' : ''}
                ${isStart(d) || isEnd(d) ? 'bg-gray-900 text-white font-semibold shadow-sm' : ''}
                ${isToday(d) && !isStart(d) && !isEnd(d) ? 'font-semibold text-foreground ring-1 ring-gray-300' : ''}
              `}>
              {d ? d.getDate() : ''}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-4 top-20 z-50 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[920px]">
      {/* Presets sidebar */}
      <div className="flex h-full flex-col sm:flex-row">
        <div className="border-b border-border px-3 py-3 sm:w-56 sm:border-b-0 sm:border-r sm:px-0 sm:py-4 flex-shrink-0">
          {presetSections.map((section) => (
            <div key={section.title || section.items[0].key} className="sm:mb-2">
              {section.title && <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(section.title)}</p>}
              {section.items.map((item) => (
                <button key={item.key} onClick={() => handlePreset(item.key)}
                  className={`block w-full rounded-xl px-4 py-2.5 text-left text-[14px] transition sm:rounded-none
                    ${activePreset === item.key ? 'bg-muted font-semibold text-foreground' : 'text-muted-foreground hover:bg-background'}`}>
                  {t(item.label)}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Calendar area */}
        <div className="flex-1 p-4 sm:p-5">
        {/* Date inputs */}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-h-[44px] flex-1 items-center rounded-xl border border-border bg-card px-4 text-[14px] text-foreground shadow-sm">
            {fmtInput(selStart) || <span className="text-gray-300">{t('Date de début')}</span>}
          </div>
          <ArrowRight size={16} className="hidden text-gray-300 sm:block flex-shrink-0" />
          <div className="flex min-h-[44px] flex-1 items-center rounded-xl border border-border bg-card px-4 text-[14px] text-foreground shadow-sm">
            {fmtInput(selEnd) || <span className="text-gray-300">{t('Date de fin')}</span>}
          </div>
        </div>

        {/* Dual calendar */}
        <div className="flex items-start gap-3 sm:gap-6">
          <button onClick={prevMonth} className="mt-1 rounded-lg p-1.5 hover:bg-muted transition">
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>
          <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2">
            <div>{renderCalendar(leftYear, leftMonth)}</div>
            <div>{renderCalendar(rightYear, rightMonth)}</div>
          </div>
          <button onClick={nextMonth} className="mt-1 rounded-lg p-1.5 hover:bg-muted transition">
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <button onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground hover:bg-background transition">
            {t('Annuler')}
          </button>
          <button onClick={handleApply} disabled={!selStart}
            className="rounded-xl bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800 transition disabled:opacity-30">
            {t('Appliquer')}
          </button>
        </div>
      </div>
    </div>
      </div>
  );
};
