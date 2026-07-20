'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingUp, Users, Crown, Zap, Moon, Sparkles, Search,
  Phone, Mail, MessageCircle, CheckCircle2, ArrowRight, Target,
  Flag, TrendingDown, ShoppingBag, Globe,
} from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { analyticsApi } from '../services/analytics.js';
import SuperAdminShell from '../components/SuperAdminShell.jsx';
import { tp } from '../i18n/platform.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DAILY_TARGET = 100;
const CONTACTED_KEY = 'growth_contacted_v1';

function fmtMoney(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('fr-FR');
}

function daysAgo(d) {
  if (!d) return null;
  return Math.floor((new Date() - new Date(d)) / 86400000);
}

function lastSeenLabel(d) {
  const n = daysAgo(d);
  if (n == null) return tp('Jamais connecté');
  if (n <= 0) return tp("Aujourd'hui");
  if (n === 1) return tp('Hier');
  if (n < 30) return `Il y a ${n} j`;
  const m = Math.floor(n / 30);
  return `Il y a ${m} mois`;
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// Aggregate the boutique park from /analytics/users-activity (GMV, orders, activation)
function computePark(payload) {
  const users = payload?.boutiqueActivity || [];
  const stores = users.flatMap((u) => (u.stores || []));
  if (!stores.length) return null;
  const week7 = 7 * 24 * 3600 * 1000;
  const gmv = stores.reduce((s, b) => s + (b.totalRevenue || 0), 0);
  const orders = stores.reduce((s, b) => s + (b.totalOrders || 0), 0);
  const withOrders = stores.filter((s) => (s.totalOrders || 0) > 0).length;
  const recentlyActive = stores.filter((s) => s.lastOrderAt && Date.now() - new Date(s.lastOrderAt).getTime() < week7).length;
  return {
    boutiques: stores.length,
    active: stores.filter((s) => s.isActive).length,
    gmv, orders, withOrders,
    noOrders: stores.length - withOrders,
    recentlyActive,
  };
}

function waLink(phone, msg) {
  if (!phone) return null;
  const digits = String(phone).replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

const PLAN_META = {
  free:    { label: 'Gratuit', cls: 'bg-slate-100 text-slate-600' },
  starter: { label: 'Scalor',  cls: 'bg-primary-50 text-primary' },
  pro:     { label: 'Scalor + IA', cls: 'bg-indigo-50 text-indigo-600' },
  ultra:   { label: 'IA Pro',  cls: 'bg-amber-50 text-amber-600' },
};

function PlanBadge({ plan }) {
  const meta = PLAN_META[plan] || PLAN_META.free;
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = 'emerald', onClick, active }) {
  const styles = {
    emerald: { icon: 'bg-emerald-50 text-emerald-600', val: 'text-emerald-700', ring: 'ring-emerald-200' },
    blue:    { icon: 'bg-blue-50 text-blue-600',       val: 'text-blue-700',    ring: 'ring-blue-200' },
    slate:   { icon: 'bg-slate-100 text-slate-500',    val: 'text-slate-700',   ring: 'ring-slate-300' },
    amber:   { icon: 'bg-amber-50 text-amber-600',     val: 'text-amber-700',   ring: 'ring-amber-200' },
  }[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-card rounded-2xl border border-slate-100 p-4 shadow-sm shadow-slate-100/70 transition-all ${onClick ? 'hover:border-slate-200 cursor-pointer' : 'cursor-default'} ${active ? `ring-2 ${styles.ring}` : ''}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${styles.icon}`}><Icon className="w-4 h-4" /></span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-semibold ${styles.val}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </button>
  );
}

// ─── Série A eligibility scorecard ──────────────────────────────────────────

function MetricRow({ label, value, note, status }) {
  const dot = { ok: 'bg-emerald-500', partial: 'bg-amber-400', missing: 'bg-slate-300' }[status];
  const valCls = { ok: 'text-emerald-700', partial: 'text-amber-600', missing: 'text-slate-400' }[status];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className="text-sm text-slate-600 flex-1 min-w-0 truncate">{label}</span>
      <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${valCls}`}>{value}</span>
    </div>
  );
}

function SeriesAEligibility({ data, park, currency }) {
  const mrr = data?.mrr;
  const counts = data?.counts || {};
  const activePaid = mrr?.activePaidWorkspaces || 0;
  const expiredPaid = (mrr?.byPlan || []).reduce((s, p) => s + (p.expiredPaid || 0), 0);
  const churnPaid = (activePaid + expiredPaid) > 0 ? Math.round((expiredPaid / (activePaid + expiredPaid)) * 100) : null;
  const churnAccount = counts.total > 0 ? Math.round((counts.dormant / counts.total) * 100) : null;
  const conversion = counts.total > 0 ? Math.round((counts.paying / counts.total) * 100) : null;
  const arr = (mrr?.total || 0) * 12;
  const activationRate = park && park.boutiques > 0 ? Math.round((park.withOrders / park.boutiques) * 100) : null;
  const countryCount = (data?.gmv?.byCountry || []).length;
  const pct = (v) => (v == null ? '—' : `${v}%`);
  const churnStatus = (v) => (v == null ? 'missing' : v < 25 ? 'ok' : v < 50 ? 'partial' : 'missing');

  const metrics = [
    { label: tp('MRR réel encaissé'), value: `${fmtMoney(mrr?.total)} ${currency}`, status: 'partial' },
    { label: 'ARR (MRR × 12)', value: `${fmtMoney(arr)} ${currency}`, status: 'ok' },
    { label: tp('Workspaces payants (actifs)'), value: counts.paying ?? '—', status: (counts.paying || 0) > 0 ? 'ok' : 'missing' },
    { label: tp('Churn payant'), value: pct(churnPaid), status: churnStatus(churnPaid) },
    { label: tp('Churn compte (dormants)'), value: pct(churnAccount), status: churnStatus(churnAccount) },
    { label: tp('Conversion gratuit → payant'), value: pct(conversion), status: (conversion || 0) > 0 ? 'ok' : 'missing' },
    { label: tp('Activation (boutique avec commande)'), value: activationRate == null ? tp('À instrumenter') : `${activationRate}% (${park.withOrders}/${park.boutiques})`, status: activationRate == null ? 'missing' : 'partial' },
    { label: tp('GMV (ventes des boutiques)'), value: park ? `${fmtMoney(park.gmv)} ${currency}` : tp('À instrumenter'), status: park ? 'ok' : 'missing' },
    { label: tp('Revenu par pays'), value: countryCount > 0 ? `${countryCount} ${tp('pays')}` : tp('À instrumenter'), status: countryCount > 0 ? 'ok' : 'missing' },
  ];

  const ladder = [81, 50, 35, 25];

  return (
    <div className="rounded-2xl border border-slate-100 bg-card shadow-sm shadow-slate-100/70 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        <Flag className="w-4 h-4 text-emerald-600" />
        <h2 className="text-sm font-semibold text-slate-700">{tp('Éligibilité Série A')}</h2>
        <span className="text-xs text-slate-400 truncate">— {tp('conditions à réunir')}</span>
      </div>
      <div className="grid md:grid-cols-2 md:gap-x-6 px-5 py-2">
        {metrics.map((m) => <MetricRow key={m.label} {...m} />)}
      </div>
      {/* Churn reduction ladder */}
      <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-500">
          <TrendingDown className="w-3.5 h-3.5" /> {tp('Réduction du churn')}
          {churnAccount != null && <span className="text-slate-400">· {tp('actuel')} {churnAccount}%</span>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {ladder.map((step, i) => {
            const reached = step < 81 && churnAccount != null && churnAccount <= step;
            const cls = step === 81
              ? 'bg-rose-50 text-rose-500'
              : reached
                ? (step === 25 ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700')
                : 'bg-card text-slate-500 ring-1 ring-slate-200';
            return (
              <React.Fragment key={step}>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
                  {step === 25 ? '< ' : ''}{step}%
                </span>
                {i < ladder.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
              </React.Fragment>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
          {tp('Leviers : onboarding <24h, modèles de boutiques prêts, produits gagnants préchargés, pages IA simplifiées, tutoriels courts, relances WhatsApp auto, accompagnement 7 jours.')}
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const SuperAdminGrowth = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [park, setPark] = useState(null);
  const [segment, setSegment] = useState('dormant'); // dormant | active | paying
  const [query, setQuery] = useState('');
  const [contacted, setContacted] = useState({});

  // Load contacted markers from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTACTED_KEY);
      if (raw) setContacted(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const persistContacted = useCallback((next) => {
    setContacted(next);
    try { localStorage.setItem(CONTACTED_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const markContacted = useCallback((id) => {
    persistContacted({ ...contacted, [id]: new Date().toISOString() });
  }, [contacted, persistContacted]);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [growthRes, activityRes] = await Promise.all([
        ecomApi.get('/super-admin/growth', { params: { activeDays: 30 } }),
        analyticsApi.getUsersActivity({ limit: 1000 }).catch(() => null),
      ]);
      setData(growthRes.data?.data || null);
      setPark(computePark(activityRes?.data?.data));
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const currency = data?.currency || 'FCFA';
  const mrr = data?.mrr;
  const counts = data?.counts || { paying: 0, active: 0, dormant: 0, total: 0 };
  const rows = data?.segments?.[segment] || [];

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.name || '').toLowerCase().includes(q) ||
      (r.owner?.email || '').toLowerCase().includes(q) ||
      (r.owner?.phone || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const contactedTodayCount = useMemo(
    () => Object.values(contacted).filter(isToday).length,
    [contacted]
  );

  // Config offer / relance messages
  const relanceMsg = (r) => `Bonjour ${r.owner?.name || ''} 👋 C'est l'équipe Scalor. On a vu que votre boutique est en pause depuis un moment — on vous offre une configuration complète pour la relancer. On s'en occupe pour vous ?`.trim();
  const offerMsg = (r) => `Bonjour ${r.owner?.name || ''} 👋 L'équipe Scalor peut configurer entièrement votre boutique (offre clé en main 25 000 / 50 000 ${currency}). Ça vous intéresse ?`.trim();

  const segmentTabs = [
    { key: 'dormant', label: tp('Dormants'), icon: Moon, accent: 'slate', count: counts.dormant },
    { key: 'active',  label: tp('Actifs'),   icon: Zap,  accent: 'blue',  count: counts.active },
    { key: 'paying',  label: tp('Payants'),  icon: Crown, accent: 'emerald', count: counts.paying },
  ];

  return (
    <SuperAdminShell
      title={tp('Croissance & Relances')}
      subtitle={tp('MRR, segments et file de relance quotidienne')}
      icon={TrendingUp}
      error={error}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      maxWidth="1280px"
    >
      {loading ? (
        <div className="py-24 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Série A eligibility ── */}
          <SeriesAEligibility data={data} park={park} currency={currency} />

          {/* ── Parc boutiques (GMV) ── */}
          {park && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={TrendingUp} accent="emerald" label={tp('GMV (CA total)')}
                value={`${fmtMoney(park.gmv)} ${currency}`} sub={`${fmtMoney(Math.round(park.gmv / Math.max(park.boutiques, 1)))} / ${tp('boutique')}`} />
              <KpiCard icon={ShoppingBag} accent="blue" label={tp('Commandes')}
                value={fmtMoney(park.orders)} sub={`${park.boutiques} ${tp('boutiques')} · ${park.active} ${tp('actives')}`} />
              <KpiCard icon={Zap} accent="amber" label={tp('Actives 7j')}
                value={park.recentlyActive} sub={tp('Commande < 7 jours')} />
              <KpiCard icon={Moon} accent="slate" label={tp('Sans commandes')}
                value={park.noOrders} sub={`${Math.round((park.noOrders / Math.max(park.boutiques, 1)) * 100)}% ${tp('du parc')}`} />
            </div>
          )}

          {/* ── KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={TrendingUp} accent="emerald" label={tp('MRR mensuel')}
              value={`${fmtMoney(mrr?.total)} ${currency}`}
              sub={`ARPU ${fmtMoney(mrr?.arpu)} ${currency} · ${mrr?.activePaidWorkspaces || 0} ${tp('payants')}`} />
            <KpiCard icon={Crown} accent="emerald" label={tp('Payants')}
              value={counts.paying} sub={tp('Abonnement actif')}
              onClick={() => setSegment('paying')} active={segment === 'paying'} />
            <KpiCard icon={Zap} accent="blue" label={tp('Actifs (30j)')}
              value={counts.active} sub={tp('Connectés récemment')}
              onClick={() => setSegment('active')} active={segment === 'active'} />
            <KpiCard icon={Moon} accent="slate" label={tp('Dormants')}
              value={counts.dormant} sub={tp('À relancer')}
              onClick={() => setSegment('dormant')} active={segment === 'dormant'} />
          </div>

          {/* ── Revenu par pays ── */}
          {(data?.gmv?.byCountry?.length > 0) && (
            <div className="bg-card rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/70 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" />{tp('Revenu par pays')}</h2>
                <span className="text-xs text-slate-400">GMV {fmtMoney(data.gmv.total)} {data.gmv.currency}</span>
              </div>
              <div className="px-5 py-3 space-y-2">
                {data.gmv.byCountry.slice(0, 12).map((c) => {
                  const share = data.gmv.total > 0 ? Math.round((c.revenue / data.gmv.total) * 100) : 0;
                  return (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="w-28 text-sm text-slate-600 truncate flex-shrink-0">{c.country}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${share}%` }} />
                      </div>
                      <span className="w-14 text-right text-xs text-slate-400 tabular-nums flex-shrink-0">{share}%</span>
                      <span className="w-32 text-right text-sm font-medium text-slate-700 tabular-nums flex-shrink-0">{fmtMoney(c.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MRR table ── */}
          <div className="bg-card rounded-2xl border border-slate-100 shadow-sm shadow-slate-100/70 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">{tp('Tableau MRR')}</h2>
              <span className="text-xs text-slate-400">{mrr?.totalWorkspaces || 0} {tp('espaces')}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="text-left font-medium px-5 py-2">{tp('Plan')}</th>
                    <th className="text-right font-medium px-5 py-2">{tp('Prix / mois')}</th>
                    <th className="text-right font-medium px-5 py-2">{tp('Payants actifs')}</th>
                    <th className="text-right font-medium px-5 py-2">{tp('Expirés')}</th>
                    <th className="text-right font-medium px-5 py-2">MRR</th>
                  </tr>
                </thead>
                <tbody>
                  {(mrr?.byPlan || []).map((p) => (
                    <tr key={p.plan} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-2.5"><PlanBadge plan={p.plan} /> <span className="ml-1 text-slate-600">{p.label}</span></td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-500">{fmtMoney(p.monthlyPrice)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium text-slate-700">{p.activePaid}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-slate-400">{p.expiredPaid}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-semibold text-emerald-700">{fmtMoney(p.mrr)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50/60">
                    <td className="px-5 py-2.5 font-semibold text-slate-700" colSpan={3}>{tp('Total')}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-slate-400">{mrr?.byPlan?.reduce((s, p) => s + p.expiredPaid, 0)}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums font-bold text-emerald-700">{fmtMoney(mrr?.total)} {currency}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Offre configuration 25k / 50k ── */}
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 via-white to-white p-5 shadow-sm shadow-emerald-100/40">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0"><Sparkles className="w-4 h-4" /></span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-800">{tp('Offre configuration clé en main')}</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  {tp("Proposée aux espaces à relancer : notre équipe configure entièrement la boutique. Deux paliers selon le périmètre.")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card ring-1 ring-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                    <Target className="w-3.5 h-3.5" /> {tp('Essentiel')} — 25 000 {currency}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white shadow-sm shadow-emerald-200/60">
                    <Crown className="w-3.5 h-3.5" /> {tp('Complet')} — 50 000 {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Segment tabs ── */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-full bg-card ring-1 ring-slate-100 p-1">
              {segmentTabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setSegment(t.key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    segment === t.key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                  <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${segment === t.key ? 'bg-card/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tp('Rechercher nom, email, téléphone…')}
                className="w-full pl-9 pr-3 py-2 rounded-full border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-transparent"
              />
            </div>
          </div>

          {/* ── Daily relance objective (dormant only) ── */}
          {segment === 'dormant' && (
            <div className="rounded-2xl border border-slate-100 bg-card p-4 shadow-sm shadow-slate-100/70">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Target className="w-4 h-4 text-emerald-600" />
                  {tp('Objectif du jour')} — {tp('relancer')} {DAILY_TARGET} {tp('comptes')}
                </div>
                <span className="text-sm font-semibold text-emerald-700 tabular-nums">{contactedTodayCount}/{DAILY_TARGET}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (contactedTodayCount / DAILY_TARGET) * 100)}%` }} />
              </div>
            </div>
          )}

          {/* ── Segment list ── */}
          <div className="space-y-2">
            {filteredRows.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-400 bg-card rounded-2xl border border-slate-100">
                {tp('Aucun espace dans ce segment')}
              </div>
            ) : (
              filteredRows.slice(0, 300).map((r) => {
                const wasContacted = !!contacted[r.id];
                const msg = segment === 'dormant' ? relanceMsg(r) : offerMsg(r);
                const wa = waLink(r.owner?.phone, msg);
                return (
                  <div key={r.id} className={`bg-card rounded-2xl border p-3.5 flex items-center gap-3 transition ${wasContacted ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 hover:border-slate-200'}`}>
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {(r.name || r.owner?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-800 truncate">{r.name}</p>
                        <PlanBadge plan={r.plan} />
                        {wasContacted && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600"><CheckCircle2 className="w-3 h-3" />{tp('Contacté')}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{r.owner?.email || tp('Sans email')} · {lastSeenLabel(r.lastActivityAt)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp"
                          className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {r.owner?.phone && (
                        <a href={`tel:${r.owner.phone}`} title={tp('Appeler')}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {r.owner?.email && (
                        <a href={`mailto:${r.owner.email}`} title={tp('Email')}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => markContacted(r.id)}
                        disabled={wasContacted}
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          wasContacted ? 'bg-emerald-100 text-emerald-600 cursor-default' : 'bg-slate-900 text-white hover:bg-slate-700'
                        }`}
                      >
                        {wasContacted ? tp('Fait') : <>{tp('Marquer')}<ArrowRight className="w-3 h-3" /></>}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {filteredRows.length > 300 && (
              <p className="text-center text-xs text-slate-400 py-2">
                {tp('Affichage limité à 300 · affinez avec la recherche')} ({filteredRows.length} {tp('au total')})
              </p>
            )}
          </div>
        </div>
      )}
    </SuperAdminShell>
  );
};

export default SuperAdminGrowth;
