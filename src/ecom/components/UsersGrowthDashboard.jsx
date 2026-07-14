import React, { useState, useEffect } from 'react';
import {
  TrendingUp, UserPlus, Activity, Clock, Timer, CalendarDays,
  ChevronDown, ChevronUp, UserX, Loader2, BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, AreaChart, Bar, Line, Area,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';

/**
 * UsersGrowthDashboard — dashboard croissance des utilisateurs (super admin).
 * KPIs inscriptions (jour / 7j / 30j + deltas), actifs (DAU/WAU/MAU),
 * temps moyen par session et par utilisateur, courbes journalières
 * (inscriptions + cumul, actifs) et top utilisateurs par temps passé.
 * Source : GET /super-admin/users-growth?days=7|30|90
 */

const PERIODS = [
  { value: 7, label: '7 j' },
  { value: 30, label: '30 j' },
  { value: 90, label: '90 j' },
];

const fmtMin = (min) => {
  const m = Math.max(0, Math.round(min || 0));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};

const fmtDay = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const Delta = ({ current, previous, label }) => {
  const diff = (current || 0) - (previous || 0);
  const up = diff > 0, down = diff < 0;
  return (
    <p className={`text-[11px] font-bold mt-0.5 ${up ? 'text-emerald-600' : down ? 'text-red-500' : 'text-slate-400'}`}>
      {up ? '▲' : down ? '▼' : '—'} {diff > 0 ? `+${diff}` : diff} <span className="font-medium text-slate-400">{label}</span>
    </p>
  );
};

const KpiCard = ({ icon: Icon, accent, accentLight, label, value, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-lg transition-all">
    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: accentLight }}>
      <Icon className="w-4 h-4" style={{ color: accent }} />
    </div>
    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-2xl font-extrabold text-slate-900">{value}</p>
    {children}
  </div>
);

const ChartCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
    <p className="text-sm font-black text-slate-700">{title}</p>
    {subtitle && <p className="text-[11px] text-slate-400 mb-2">{subtitle}</p>}
    <div className="h-[240px] mt-2">{children}</div>
  </div>
);

const tooltipStyle = {
  borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const UsersGrowthDashboard = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('saUsersGrowthCollapsed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const res = await ecomApi.get('/super-admin/users-growth', { params: { days } });
        if (!cancelled) setData(res.data?.data || null);
      } catch {
        if (!cancelled) setError(tp('Impossible de charger les statistiques de croissance'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [days]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('saUsersGrowthCollapsed', c ? '0' : '1'); } catch { /* noop */ }
      return !c;
    });
  };

  const s = data?.signups || {};
  const act = data?.activity || {};
  const eng = data?.engagement || {};
  const totals = data?.totals || {};
  const churn = data?.churn || {};
  const series = (data?.series || []).map((r) => ({ ...r, day: fmtDay(r.date) }));
  const topUsers = data?.topUsers || [];

  return (
    <div className="bg-slate-50/60 rounded-2xl border border-slate-200 p-4 sm:p-5">
      {/* Header : titre + période + repli */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-600" />
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{tp('Croissance des marchands')}</h3>
          <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-full px-2 py-0.5">{tp('admins uniquement')}</span>
          {loading && <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white border-2 border-slate-200 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-[10px] transition-all ${days === p.value ? 'bg-primary-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="p-2 rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:text-slate-800 transition-all"
            title={collapsed ? tp('Afficher le dashboard') : tp('Masquer le dashboard')}
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {error && !collapsed && (
        <p className="text-xs font-semibold text-red-500 mt-3">{error}</p>
      )}

      {!collapsed && data && (
        <div className="space-y-4 mt-4">
          {/* KPIs inscriptions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={UserPlus} accent="#059669" accentLight="#d1fae5" label={tp("Inscrits aujourd'hui")} value={s.today ?? 0}>
              <Delta current={s.today} previous={s.yesterday} label={tp('vs hier')} />
            </KpiCard>
            <KpiCard icon={TrendingUp} accent="#2563eb" accentLight="#dbeafe" label={tp('Inscrits 7 jours')} value={s.last7 ?? 0}>
              <Delta current={s.last7} previous={s.prev7} label={tp('vs 7 j préc.')} />
            </KpiCard>
            <KpiCard icon={CalendarDays} accent="#7c3aed" accentLight="#ede9fe" label={tp('Inscrits 30 jours')} value={s.last30 ?? 0}>
              <Delta current={s.last30} previous={s.prev30} label={tp('vs 30 j préc.')} />
            </KpiCard>
            <KpiCard icon={UserX} accent="#f59e0b" accentLight="#fef3c7" label={tp('Jamais actifs')} value={totals.neverConnected ?? 0}>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">{tp('Activation (login ou session)')} : {totals.connectedRate ?? 0}%</p>
            </KpiCard>
          </div>

          {/* KPIs activité & temps passé */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Activity} accent="#059669" accentLight="#d1fae5" label={tp("Actifs aujourd'hui")} value={act.dau ?? 0}>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">{tp('Utilisateurs distincts (sessions)')}</p>
            </KpiCard>
            <KpiCard icon={Activity} accent="#2563eb" accentLight="#dbeafe" label={tp('Actifs 7 j / 30 j')} value={`${act.wau ?? 0} / ${act.mau ?? 0}`}>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">WAU / MAU</p>
            </KpiCard>
            <KpiCard
              icon={UserX}
              accent={Number(churn.rate30 ?? 0) > 40 ? '#dc2626' : '#f97316'}
              accentLight={Number(churn.rate30 ?? 0) > 40 ? '#fee2e2' : '#ffedd5'}
              label={tp('Churn marchands 30 j')}
              value={`${churn.rate30 ?? 0}%`}
            >
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {churn.churned30 ?? 0} / {churn.eligible30 ?? 0} {tp('actifs il y a 30-60 j non revenus')} · {tp('rétention')} {churn.retention30 ?? 100}%
              </p>
            </KpiCard>
            <KpiCard icon={Timer} accent="#7c3aed" accentLight="#ede9fe" label={tp('Temps moyen / session')} value={fmtMin(eng.avgSessionMin)}>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                {fmtMin(eng.avgTimePerUserMin)} / {tp('utilisateur')} · {eng.avgSessionsPerUser ?? 0} {tp('sessions/utilisateur')}
              </p>
            </KpiCard>
          </div>

          {/* Courbes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ChartCard title={tp('Inscriptions par jour')} subtitle={tp('Barres : nouveaux inscrits · Courbe : total cumulé')}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series} margin={{ top: 5, right: 0, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#c4b5fd' }} tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `${tp('Jour')} ${l}`} />
                  <Bar yAxisId="left" dataKey="signups" name={tp('Inscriptions')} fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" name={tp('Total cumulé')} stroke="#7c3aed" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title={tp('Utilisateurs actifs par jour')} subtitle={tp('Utilisateurs distincts avec au moins une session')}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 5, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ugActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => `${tp('Jour')} ${l}`} />
                  <Area type="monotone" dataKey="active" name={tp('Actifs')} stroke="#2563eb" strokeWidth={2} fill="url(#ugActive)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Top utilisateurs par temps passé */}
          {topUsers.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
              <p className="text-sm font-black text-slate-700">{tp('Temps passé par utilisateur')}</p>
              <p className="text-[11px] text-slate-400 mb-3">{tp('Top')} {topUsers.length} {tp('sur les')} {data.days} {tp('derniers jours (sessions analytics)')}</p>
              <table className="w-full text-left min-w-[560px]">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="py-2 pr-3">{tp('Utilisateur')}</th>
                    <th className="py-2 px-3 text-right">{tp('Sessions')}</th>
                    <th className="py-2 px-3 text-right">{tp('Temps total')}</th>
                    <th className="py-2 px-3 text-right">{tp('Moy. / session')}</th>
                    <th className="py-2 pl-3 text-right">{tp('Dernière activité')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 pr-3">
                        <p className="text-[13px] font-bold text-slate-800 truncate max-w-[220px]">{u.name || '—'}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[220px]">{u.email}</p>
                      </td>
                      <td className="py-2.5 px-3 text-right text-[13px] font-bold text-slate-700">{u.sessions}</td>
                      <td className="py-2.5 px-3 text-right text-[13px] font-extrabold text-slate-900">{fmtMin(u.totalMin)}</td>
                      <td className="py-2.5 px-3 text-right text-[13px] font-medium text-slate-600">{fmtMin(u.avgSessionMin)}</td>
                      <td className="py-2.5 pl-3 text-right text-[12px] text-slate-400">
                        {u.lastActivityAt ? new Date(u.lastActivityAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersGrowthDashboard;
