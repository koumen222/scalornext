import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from '@/lib/router-compat';
import { useMoney } from '../hooks/useMoney.js';
import ecomApi from '../services/ecommApi.js';
import { getContextualError } from '../utils/errorMessages';
import { tp } from '../i18n/platform.js';
import { AlertTriangle, Boxes, CircleDollarSign, Plus, Search, SlidersHorizontal, TrendingUp } from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const T = 'transition-colors duration-150';

const STATUS_CONFIG = {
  test:   { label: 'Test',   bg: 'bg-amber-100',  text: 'text-amber-700',   dot: 'bg-amber-400'   },
  scale:  { label: 'Scale',  bg: 'bg-orange-100', text: 'text-orange-700',  dot: 'bg-orange-500'  },
  scal:   { label: 'Scale',  bg: 'bg-orange-100', text: 'text-orange-700',  dot: 'bg-orange-500'  },
  stable: { label: 'Stable', bg: 'bg-primary-50', text: 'text-scalor-green', dot: 'bg-scalor-green' },
  winner: { label: 'Winner', bg: 'bg-violet-100', text: 'text-violet-700',  dot: 'bg-violet-500'  },
  pause:  { label: 'Pause',  bg: 'bg-slate-100',  text: 'text-slate-600',   dot: 'bg-slate-400'   },
  stop:   { label: 'Stop',   bg: 'bg-red-100',    text: 'text-red-700',     dot: 'bg-red-400'     },
};

const STATUS_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'test',   label: 'Test' },
  { value: 'scale',  label: 'Scale' },
  { value: 'stable', label: 'Stable' },
  { value: 'winner', label: 'Winner' },
  { value: 'pause',  label: 'Pause' },
  { value: 'stop',   label: 'Stop' },
];

const calcBenefit = (p) => {
  if (p.sellingPrice == null || p.productCost == null || Number(p.productCost) <= 0) return null;
  return p.sellingPrice - (p.productCost ?? 0) - (p.deliveryCost ?? 0) - (p.avgAdsCost ?? 0);
};

const hasIncompleteCosts = (p) => p.sellingPrice == null || p.productCost == null || Number(p.productCost) <= 0;
const normalizedName = (name = '') => name.trim().toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ');

const calcMarginPct = (p) => {
  const b = calcBenefit(p);
  if (b === null || !p.sellingPrice) return null;
  return Math.round((b / p.sellingPrice) * 100);
};

const calcSuggestedPrice = (p) => {
  const base = (p.productCost ?? 0) + (p.deliveryCost ?? 0);
  if (base === 0) return null;
  return Math.ceil(Math.max(base * (base < 10000 ? 3 : 2.25), 10000) / 50) * 50;
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */

const StatusChip = ({ status }) => {
  const c = STATUS_CONFIG[status] ?? { label: status?.toUpperCase() ?? '—', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const MarginBar = ({ pct }) => {
  if (pct === null) return null;
  const clamped = Math.max(0, Math.min(100, pct));
  const color = pct >= 40 ? 'bg-scalor-green' : pct >= 20 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-xs font-semibold tabular-nums ${pct >= 40 ? 'text-scalor-green' : pct >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
        {pct}%
      </span>
    </div>
  );
};

const ProductAvatar = ({ product, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const img = product.images?.[0] || product.image || product.imageUrl;
  const initials = (product.name || '?').slice(0, 2).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-lg' : 'w-10 h-10 text-xs';

  if (img && !imgError) {
    return (
      <div className={`${sizeClass} rounded-xl overflow-hidden shrink-0 bg-gray-100`}>
        <img src={img} alt={product.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
      </div>
    );
  }

  const colors = ['bg-violet-100 text-violet-600', 'bg-blue-100 text-blue-600', 'bg-primary-50 text-scalor-green', 'bg-orange-100 text-orange-600', 'bg-pink-100 text-pink-600'];
  const colorClass = colors[(product.name?.charCodeAt(0) ?? 0) % colors.length];

  return (
    <div className={`${sizeClass} ${colorClass} rounded-xl flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
};

const SortIcon = ({ active, dir }) => {
  if (!active) return <span className="text-gray-300 ml-1 text-xs">↕</span>;
  return <span className="text-scalor-green ml-1 text-xs">{dir === 'asc' ? '↑' : '↓'}</span>;
};

const RowMenu = ({ product, onDelete }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 border border-gray-200 ${T}`}
        aria-label={tp('Actions')}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[150px]">
            <Link
              to={`/ecom/products/${product._id}/edit`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 ${T}`}
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {tp('Modifier')}
            </Link>
            <Link
              to={`/ecom/products/${product._id}`}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 ${T}`}
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {tp('Voir détails')}
            </Link>
            <div className="border-t border-gray-100" />
            <button
              onClick={() => { setOpen(false); onDelete(product._id); }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 ${T}`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {tp('Supprimer')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function ProductsList() {
  const { fmt } = useMoney();
  const [products, setProducts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatus] = useState('');
  const [activeFilter, setActive] = useState('');
  const [businessFilter, setBusinessFilter] = useState('');
  const [sort, setSort]           = useState({ key: null, dir: 'desc' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ecomApi.get('/products?limit=500');
      setProducts(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setError(getContextualError(err, 'load_products'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const applyPrice = async (id, price) => {
    try { await ecomApi.patch(`/products/${id}`, { sellingPrice: price }); load(); }
    catch (err) { setError(getContextualError(err, 'save_product')); }
  };

  const remove = async (id) => {
    if (!confirm(tp('Supprimer ce produit définitivement ?'))) return;
    try { await ecomApi.delete(`/products/${id}`); load(); }
    catch (err) { setError(getContextualError(err, 'delete_product')); }
  };

  const toggleSort = (key) => {
    setSort(prev => prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'desc' }
    );
  };

  const duplicateNames = useMemo(() => {
    const counts = products.reduce((map, product) => {
      const key = normalizedName(product.name);
      if (key) map.set(key, (map.get(key) || 0) + 1);
      return map;
    }, new Map());
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [products]);

  const filtered = useMemo(() => products.filter(product => {
    const query = search.trim().toLocaleLowerCase('fr');
    if (query && !`${product.name || ''} ${product.status || ''}`.toLocaleLowerCase('fr').includes(query)) return false;
    if (statusFilter && !([statusFilter, statusFilter === 'scale' ? 'scal' : ''].includes(product.status))) return false;
    if (activeFilter !== '' && product.isActive !== (activeFilter === 'true')) return false;
    const benefit = calcBenefit(product);
    if (businessFilter === 'profitable' && !(benefit > 0)) return false;
    if (businessFilter === 'loss' && !(benefit !== null && benefit <= 0)) return false;
    if (businessFilter === 'incomplete' && !hasIncompleteCosts(product)) return false;
    if (businessFilter === 'duplicates' && !duplicateNames.has(normalizedName(product.name))) return false;
    return true;
  }), [products, search, statusFilter, activeFilter, businessFilter, duplicateNames]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    return [...filtered].sort((a, b) => {
      let av, bv;
      if (sort.key === 'name')    { av = a.name ?? ''; bv = b.name ?? ''; }
      if (sort.key === 'price')   { av = a.sellingPrice ?? 0; bv = b.sellingPrice ?? 0; }
      if (sort.key === 'benefit') { av = calcBenefit(a) ?? -Infinity; bv = calcBenefit(b) ?? -Infinity; }
      if (sort.key === 'margin')  { av = calcMarginPct(a) ?? -Infinity; bv = calcMarginPct(b) ?? -Infinity; }
      if (typeof av === 'string') return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sort]);

  const stats = useMemo(() => {
    const evaluated = products.filter(product => calcBenefit(product) !== null);
    const profits = evaluated.filter(product => calcBenefit(product) > 0).length;
    return {
      total: products.length,
      active: products.filter(product => product.isActive).length,
      profits,
      losses: evaluated.length - profits,
      incomplete: products.filter(hasIncompleteCosts).length,
      duplicates: products.filter(product => duplicateNames.has(normalizedName(product.name))).length,
      ben: evaluated.reduce((sum, product) => sum + calcBenefit(product), 0),
      evaluated: evaluated.length,
    };
  }, [products, duplicateNames]);

  const hasFilters = search || statusFilter || activeFilter || businessFilter;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-7 h-7 rounded-full border-[3px] border-gray-200 border-t-scalor-green animate-spin" />
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50/60">

      {/* Header */}
      <div className="border-b border-slate-200/80 bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{tp('Produits')}</h1>
          <p className="mt-1 text-[12px] text-slate-500">Pilotez vos prix, vos coûts et le cycle de vie du catalogue.</p>
        </div>
        <Link
          to="/ecom/products/new"
          className={`inline-flex min-h-10 items-center gap-2 rounded-xl bg-scalor-green px-4 text-[12px] font-semibold text-white shadow-sm hover:bg-scalor-green-dark ${T}`}
        >
          <Plus className="h-4 w-4" />
          {tp('Nouveau produit')}
        </Link>
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 py-6 space-y-4 max-w-7xl w-full mx-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Catalogue', value: stats.total, detail: `${stats.active} actifs · ${stats.total - stats.active} inactifs`, icon: Boxes, tone: 'slate' },
            { label: 'Rentabilité connue', value: `${stats.profits}/${stats.evaluated}`, detail: `${stats.losses} à perte`, icon: TrendingUp, tone: 'emerald' },
            { label: 'À corriger', value: stats.incomplete, detail: 'prix ou coût manquant', icon: AlertTriangle, tone: stats.incomplete ? 'amber' : 'emerald' },
            { label: 'Bénéfice potentiel', value: fmt(stats.ben), detail: `sur ${stats.evaluated} produits évalués`, icon: CircleDollarSign, tone: 'violet' },
          ].map(card => { const Icon = card.icon; const tones = { slate: 'bg-slate-100 text-slate-600', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', violet: 'bg-violet-50 text-violet-700' }; return (
            <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
              <div className="flex items-start justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{card.label}</p><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[card.tone]}`}><Icon className="h-4 w-4" /></span></div>
              <p className="mt-2 truncate text-xl font-semibold tracking-tight text-slate-900">{card.value}</p>
              <p className="mt-1 text-[10px] text-slate-400">{card.detail}</p>
            </div>
          ); })}
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tp('Rechercher...')}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-[12px] text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </div>

          <select
            value={activeFilter}
            onChange={e => setActive(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50"
          >
            <option value="">{tp('Tous')}</option>
            <option value="true">{tp('Actifs')}</option>
            <option value="false">{tp('Inactifs')}</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setStatus(''); setActive(''); setBusinessFilter(''); }}
              className={`h-10 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 ${T}`}
            >
              {tp('Effacer filtres')}
            </button>
          )}
          <span className="ml-auto whitespace-nowrap px-1 text-[10px] font-medium text-slate-400">{sorted.length} résultat{sorted.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
            <SlidersHorizontal className="mr-1 h-3.5 w-3.5 text-slate-400" />
            {STATUS_FILTERS.map(filter => <button key={filter.value} onClick={() => setStatus(filter.value)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${statusFilter === filter.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{filter.label}</button>)}
            <span className="mx-1 h-4 w-px bg-slate-200" />
            {[{ value: 'profitable', label: 'Rentables' }, { value: 'loss', label: 'À perte' }, { value: 'incomplete', label: `À corriger ${stats.incomplete ? `(${stats.incomplete})` : ''}` }, { value: 'duplicates', label: `Doublons ${stats.duplicates ? `(${stats.duplicates})` : ''}` }].map(filter => <button key={filter.value} onClick={() => setBusinessFilter(current => current === filter.value ? '' : filter.value)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${businessFilter === filter.value ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}>{filter.label}</button>)}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <p className="text-sm font-medium text-gray-900">
              {hasFilters ? 'Aucun produit pour ces critères' : tp('Aucun produit')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {hasFilters ? 'Essayez de modifier vos filtres' : tp('Créez votre premier produit pour commencer')}
            </p>
            {!hasFilters && (
              <Link
                to="/ecom/products/new"
                className={`inline-flex items-center gap-2 mt-4 bg-scalor-green hover:bg-scalor-green-dark text-white text-sm font-medium px-4 py-2 rounded-lg ${T}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {tp('Créer un produit')}
              </Link>
            )}
          </div>
        )}

        {sorted.length > 0 && (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden bg-white">
              {sorted.map(product => {
                const benefit    = calcBenefit(product);
                const profitable = benefit !== null && benefit > 0;
                const margin     = calcMarginPct(product);
                return (
                  <div key={product._id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ProductAvatar product={product} size="sm" />
                        <div className="min-w-0">
                          <Link
                            to={`/ecom/products/${product._id}`}
                            className={`font-semibold text-gray-900 text-sm truncate block hover:text-scalor-green ${T}`}
                          >
                            {product.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <StatusChip status={product.status} />
                            {duplicateNames.has(normalizedName(product.name)) && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600">Doublon</span>}
                            {hasIncompleteCosts(product) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">Coût à compléter</span>}
                            <span className={`text-xs font-medium ${product.isActive ? 'text-scalor-green' : 'text-gray-400'}`}>
                              {product.isActive ? 'Actif' : tp('Inactif')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <RowMenu product={product} onDelete={remove} />
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>
                        <p className="text-xs text-gray-400">{tp('Prix')}</p>
                        <p className="text-sm font-semibold tabular-nums text-gray-900">
                          {product.sellingPrice != null ? fmt(product.sellingPrice) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">{tp('Bénéfice')}</p>
                        <p className={`text-sm font-semibold tabular-nums ${benefit === null ? 'text-gray-300' : profitable ? 'text-scalor-green' : 'text-red-600'}`}>
                          {benefit === null ? '—' : `${profitable ? '+' : ''}${fmt(benefit)}`}
                        </p>
                      </div>
                    </div>
                    {margin !== null && <div className="mt-2"><MarginBar pct={margin} /></div>}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.03)] sm:block">
              <table className="w-full table-fixed divide-y divide-slate-100 text-sm">
                <colgroup>
                  <col className="w-[260px]" />
                  <col className="w-[110px]" />
                  <col className="w-[100px]" />
                  <col className="w-[120px]" />
                  <col className="w-[140px]" />
                  <col className="w-[90px]" />
                  <col className="w-[60px]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort('name')} className={`inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 ${T}`}>
                        Produit <SortIcon active={sort.key === 'name'} dir={sort.dir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button onClick={() => toggleSort('price')} className={`inline-flex items-center justify-end w-full text-xs font-medium text-gray-500 hover:text-gray-700 ${T}`}>
                        Prix <SortIcon active={sort.key === 'price'} dir={sort.dir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <span className="text-xs font-medium text-gray-500">Coût total</span>
                    </th>
                    <th className="px-4 py-3 text-right">
                      <button onClick={() => toggleSort('benefit')} className={`inline-flex items-center justify-end w-full text-xs font-medium text-gray-500 hover:text-gray-700 ${T}`}>
                        Bénéfice <SortIcon active={sort.key === 'benefit'} dir={sort.dir} />
                      </button>
                    </th>
                    <th className="px-4 py-3">
                      <button onClick={() => toggleSort('margin')} className={`inline-flex items-center text-xs font-medium text-gray-500 hover:text-gray-700 ${T}`}>
                        Marge <SortIcon active={sort.key === 'margin'} dir={sort.dir} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">{tp('État')}</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((product) => {
                    const benefit    = calcBenefit(product);
                    const cost       = (product.productCost ?? 0) + (product.deliveryCost ?? 0) + (product.avgAdsCost ?? 0);
                    const profitable = benefit !== null && benefit > 0;
                    const suggest    = calcSuggestedPrice(product);
                    const margin     = calcMarginPct(product);

                    return (
                      <tr key={product._id} className={`border-b border-slate-100 bg-white hover:bg-emerald-50/20 ${T}`}>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-3">
                            <ProductAvatar product={product} size="md" />
                            <div className="min-w-0">
                              <Link
                                to={`/ecom/products/${product._id}`}
                                className={`font-medium text-gray-900 hover:text-scalor-green ${T} block truncate`}
                              >
                                {product.name}
                              </Link>
                              <div className="mt-0.5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <StatusChip status={product.status} />
                                  {duplicateNames.has(normalizedName(product.name)) && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-600">Doublon</span>}
                                  {hasIncompleteCosts(product) && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">À compléter</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          <span className="font-semibold text-gray-900 tabular-nums">
                            {product.sellingPrice != null ? fmt(product.sellingPrice) : '—'}
                          </span>
                          {suggest && !product.sellingPrice && (
                            <button
                              onClick={() => confirm(`Appliquer ${fmt(suggest)} pour "${product.name}" ?`) && applyPrice(product._id, suggest)}
                              className={`block text-xs text-scalor-green hover:text-scalor-green-dark mt-0.5 ml-auto ${T}`}
                            >
                              Suggéré: {fmt(suggest)}
                            </button>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          {hasIncompleteCosts(product) ? <span className="text-[10px] font-medium text-amber-600">Coût à renseigner</span> : <span className="tabular-nums text-slate-500">{fmt(cost)}</span>}
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          {benefit === null ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className={`font-semibold tabular-nums ${profitable ? 'text-scalor-green' : 'text-red-600'}`}>
                              {profitable ? '+' : ''}{fmt(benefit)}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top">
                          <MarginBar pct={margin} />
                        </td>

                        <td className="px-4 py-3 align-top text-center">
                          {product.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-scalor-green">
                              <span className="w-1.5 h-1.5 rounded-full bg-scalor-green" />
                              {tp('Actif')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              {tp('Inactif')}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 align-top text-right">
                          <RowMenu product={product} onDelete={remove} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 bg-white">
                {sorted.length} produit{sorted.length !== 1 ? 's' : ''}{hasFilters ? ' (filtré)' : ''}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
