import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { affiliateAdminApi } from '../services/affiliateAdminApi.js';
import { tp } from '../i18n/platform.js';

const fmt = (n) => (n || 0).toLocaleString('fr-FR');

const TABS = ['Aperçu', 'Affiliés', 'Conversions', 'Retraits', 'Configuration'];

// Palette funnel validée (CVD-safe) : bleu / ambre / teal
const FUNNEL_COLORS = { visits: '#2563EB', clicks: '#D97706', signups: '#0D9488' };

const PAYOUT_METHOD_LABELS = {
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
  bank: 'Virement',
  other: 'Autre'
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
};

function KpiCard({ label, value, sub, color = 'slate' }) {
  const colors = {
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700'
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-[11px] mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{fmt(p.value)}</strong></p>
      ))}
    </div>
  );
}

export default function AffiliatesAdmin() {
  const [tab, setTab] = useState('Aperçu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [config, setConfig] = useState(null);
  const [affiliates, setAffiliates] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [payoutInputs, setPayoutInputs] = useState({});
  const [form, setForm] = useState({ name: '', email: '', password: '', commissionType: 'fixed', commissionValue: 500 });
  const [sortBy, setSortBy] = useState('conversions');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [ov, cfg, aff, conv, po] = await Promise.all([
        affiliateAdminApi.getOverview(),
        affiliateAdminApi.getConfig(),
        affiliateAdminApi.getAffiliates(),
        affiliateAdminApi.getConversions({ page: 1, limit: 100 }),
        affiliateAdminApi.getPayouts({ page: 1, limit: 100 })
      ]);
      setOverview(ov.data?.data || null);
      setConfig(cfg.data?.data || null);
      setAffiliates(aff.data?.data || []);
      setConversions(conv.data?.data?.items || []);
      setPayouts(po.data?.data?.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveConfig = async () => {
    try {
      await affiliateAdminApi.updateConfig({
        baseCommissionType: config.baseCommissionType,
        baseCommissionValue: Number(config.baseCommissionValue || 0),
        defaultLandingUrl: config.defaultLandingUrl,
        signupBonusAmount: Number(config.signupBonusAmount ?? 500),
        paymentCommissionPercent: Number(config.paymentCommissionPercent ?? 50),
        attributionWindowDays: Number(config.attributionWindowDays ?? 60),
        minPayoutAmount: Number(config.minPayoutAmount ?? 5000)
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Sauvegarde configuration impossible');
    }
  };

  const updatePayout = async (id, status) => {
    try {
      const inputs = payoutInputs[id] || {};
      await affiliateAdminApi.updatePayout(id, {
        status,
        paymentReference: inputs.paymentReference || '',
        adminNote: inputs.adminNote || ''
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour retrait impossible');
    }
  };

  const createAffiliate = async (e) => {
    e.preventDefault();
    try {
      await affiliateAdminApi.createAffiliate(form);
      setForm({ name: '', email: '', password: '', commissionType: 'fixed', commissionValue: 500 });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Création affilié impossible');
    }
  };

  const updateAffiliate = async (a, patch) => {
    try {
      await affiliateAdminApi.updateAffiliate(a.id || a._id, patch);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour affilié impossible');
    }
  };

  const updateConversionStatus = async (id, status) => {
    try {
      await affiliateAdminApi.updateConversionStatus(id, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Mise à jour conversion impossible');
    }
  };

  const sortedAffiliates = [...affiliates].sort((a, b) => {
    const sa = a.stats || {};
    const sb = b.stats || {};
    if (sortBy === 'clicks') {
      const diff = (sb.totalClicks || 0) - (sa.totalClicks || 0);
      if (diff !== 0) return diff;
      return (sb.totalConversions || 0) - (sa.totalConversions || 0);
    }
    if (sortBy === 'conversions') {
      const diff = (sb.totalConversions || 0) - (sa.totalConversions || 0);
      if (diff !== 0) return diff;
      return (sb.totalCommissions || 0) - (sa.totalCommissions || 0);
    }
    if (sortBy === 'commissions') {
      const diff = (sb.totalCommissions || 0) - (sa.totalCommissions || 0);
      if (diff !== 0) return diff;
      return (sb.totalConversions || 0) - (sa.totalConversions || 0);
    }
    return 0;
  });

  const kpis = overview?.kpis || {};
  const clicksByDay = overview?.clicksByDay || [];
  const funnelByDay = overview?.funnelByDay || clicksByDay;
  const topAffiliates = overview?.topAffiliates || [];

  // Bar chart top affiliés : clics si disponibles, sinon conversions
  const allClicksZero = topAffiliates.every((a) => (a.totalClicks || 0) === 0);
  const barMetric = allClicksZero ? 'conversions' : 'clicks';
  const clicksByAffiliate = topAffiliates
    .slice(0, 8)
    .map((a) => ({
      name: a.name?.split(' ')[0] || a.referralCode,
      [barMetric]: allClicksZero ? (a.totalConversions || 0) : (a.totalClicks || 0)
    }));

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{tp('Programme d\'affiliation')}</h1>
            <p className="text-sm text-muted-foreground">{tp('Gestion complète des affiliés, liens et commissions.')}</p>
          </div>
          <button onClick={load} className="px-3 py-1.5 text-xs rounded-lg border bg-card hover:bg-background">
            {tp('Actualiser')}
          </button>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                tab === t ? 'bg-slate-900 text-white' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-8 bg-card rounded-xl border text-center text-sm text-muted-foreground">{tp('Chargement...')}</div>
        ) : (
          <>
            {/* ───── ONGLET APERÇU ───── */}
            {tab === 'Aperçu' && (
              <div className="space-y-5">

                {/* KPIs globaux */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                  <KpiCard label="Total affiliés" value={fmt(kpis.totalAffiliates)} color="slate" />
                  <KpiCard label="Affiliés actifs" value={fmt(kpis.activeAffiliates)} color="green" />
                  <KpiCard label="Nouveaux aujourd'hui" value={fmt(kpis.newToday)} color="blue" />
                  <KpiCard label="Clics aujourd'hui" value={fmt(kpis.clicksToday)} color="purple" />
                  <KpiCard label="Clics total" value={fmt(kpis.clicksTotal)} color="slate" />
                  <KpiCard label="Visites référées" value={fmt(kpis.visitsTotal)} sub="pages vues trackées" color="blue" />
                  <KpiCard label="Conversions aujourd'hui" value={fmt(kpis.conversionsToday)} color="amber" />
                  <KpiCard label="Commissions en attente" value={fmt(kpis.conversionsPending)} sub="conversions" color="rose" />
                  <KpiCard label="Retraits en attente" value={fmt(kpis.payoutsPendingCount)} sub={`${fmt(kpis.payoutsPendingAmount)} FCFA à payer`} color="rose" />
                </div>

                {/* Graphiques */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                  {/* Funnel par jour : visites, clics, inscriptions */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-foreground mb-4">{tp('Trafic référé par jour (30 derniers jours)')}</h2>
                    {funnelByDay.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">{tp('Aucune donnée')}</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={funnelByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            tickFormatter={(v) => {
                              const parts = v.split('-');
                              return `${parts[2]}/${parts[1]}`;
                            }}
                            interval="preserveStartEnd"
                          />
                          <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="visits" name={tp('Visites')} stroke={FUNNEL_COLORS.visits} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="clicks" name={tp('Clics')} stroke={FUNNEL_COLORS.clicks} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="signups" name={tp('Inscriptions')} stroke={FUNNEL_COLORS.signups} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Top affiliés bar chart */}
                  <div className="bg-card border border-border rounded-xl p-4">
                    <h2 className="text-sm font-semibold text-foreground mb-4">
                      Top affiliés par {barMetric === 'clicks' ? 'clics' : 'conversions'}
                    </h2>
                    {clicksByAffiliate.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">{tp('Aucune donnée')}</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={clicksByAffiliate} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} />
                          <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} allowDecimals={false} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey={barMetric} name={barMetric === 'clicks' ? 'Clics' : tp('Conversions')} radius={[4, 4, 0, 0]}>
                            {clicksByAffiliate.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? '#6366f1' : i === 1 ? '#8b5cf6' : '#a78bfa'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Classement meilleurs affiliés */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-4">{tp('Classement des meilleurs affiliés')}</h2>
                  {topAffiliates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{tp('Aucun affilié actif')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-background border-b">
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium w-8">#</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium">{tp('Affilié')}</th>
                            <th className="px-3 py-2 text-right text-muted-foreground font-medium">{tp('Clics')}</th>
                            <th className="px-3 py-2 text-right text-muted-foreground font-medium">{tp('Conversions')}</th>
                            <th className="px-3 py-2 text-right text-muted-foreground font-medium">{tp('Taux')}</th>
                            <th className="px-3 py-2 text-right text-muted-foreground font-medium">{tp('Commissions')}</th>
                            <th className="px-3 py-2 text-left text-muted-foreground font-medium">{tp('Statut')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topAffiliates.map((a, i) => {
                            const rate = a.totalClicks > 0
                              ? ((a.totalConversions / a.totalClicks) * 100).toFixed(1)
                              : '—';
                            return (
                              <tr key={String(a.affiliateId)} className={`border-b ${i === 0 ? 'bg-purple-50/40' : ''}`}>
                                <td className="px-3 py-2 text-center">
                                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                                </td>
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-foreground">{a.name}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{a.referralCode}</p>
                                </td>
                                <td className="px-3 py-2 text-right font-semibold text-blue-700">{fmt(a.totalClicks)}</td>
                                <td className="px-3 py-2 text-right font-semibold text-purple-700">{fmt(a.totalConversions)}</td>
                                <td className="px-3 py-2 text-right text-muted-foreground">{rate}%</td>
                                <td className="px-3 py-2 text-right font-semibold text-green-700">{fmt(Math.round(a.totalCommissions))} FCFA</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {a.isActive ? 'Actif' : tp('Inactif')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ───── ONGLET AFFILIÉS ───── */}
            {tab === 'Affiliés' && (
              <div className="space-y-4">

                {/* Créer un affilié */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <h2 className="text-sm font-semibold text-foreground mb-3">{tp('Créer un affilié')}</h2>
                  <form onSubmit={createAffiliate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                    <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder={tp('Nom')} required className="px-3 py-2 border rounded-lg text-sm" />
                    <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" type="email" required className="px-3 py-2 border rounded-lg text-sm" />
                    <input value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder={tp('Mot de passe initial')} className="px-3 py-2 border rounded-lg text-sm" />
                    <select value={form.commissionType} onChange={(e) => setForm((p) => ({ ...p, commissionType: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm">
                      <option value="fixed">{tp('Fixe (FCFA)')}</option>
                      <option value="percentage">{tp('Pourcentage (%)')}</option>
                    </select>
                    <input value={form.commissionValue} onChange={(e) => setForm((p) => ({ ...p, commissionValue: Number(e.target.value || 0) }))} type="number" placeholder={tp('Valeur')} className="px-3 py-2 border rounded-lg text-sm" />
                    <button className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">{tp('Créer affilié')}</button>
                  </form>
                </div>

                {/* Tri + liste */}
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-foreground">Affiliés ({affiliates.length})</h2>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{tp('Trier par:')}</span>
                      {[['clicks', 'Clics'], ['conversions', 'Conversions'], ['commissions', 'Commissions']].map(([k, l]) => (
                        <button
                          key={k}
                          onClick={() => setSortBy(k)}
                          className={`px-2 py-1 rounded-md border text-xs ${sortBy === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-card text-muted-foreground hover:bg-background'}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 max-h-[700px] overflow-y-auto">
                    {sortedAffiliates.map((a, rank) => {
                      const s = a.stats || {};
                      const rate = s.conversionRate != null
                        ? Number(s.conversionRate).toFixed(1)
                        : s.totalClicks > 0 ? ((s.totalConversions / s.totalClicks) * 100).toFixed(1) : '0.0';
                      return (
                        <div key={a.id || a._id} className="p-4 border rounded-lg text-sm">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-mono w-5 text-center">
                                {rank + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-foreground">
                                  {a.name}
                                  {' '}•{' '}
                                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{a.referralCode}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{a.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${a.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {a.isActive ? 'Actif' : tp('Inactif')}
                              </span>
                              <button onClick={() => updateAffiliate(a, { isActive: !a.isActive })} className="px-2 py-1 text-xs rounded border hover:bg-background">
                                {a.isActive ? 'Désactiver' : tp('Activer')}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                            <div className="bg-blue-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-blue-700">{fmt(s.totalClicks)}</p>
                              <p className="text-[10px] text-blue-600">{tp('Clics')}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-purple-700">{fmt(s.totalConversions)}</p>
                              <p className="text-[10px] text-purple-600">{tp('Conversions')}</p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-amber-700">{fmt(s.totalSales)}</p>
                              <p className="text-[10px] text-amber-600">{tp('Ventes (FCFA)')}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-green-700">{fmt(s.totalCommissions)}</p>
                              <p className="text-[10px] text-green-600">{tp('Commissions')}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-2 text-center">
                              <p className="text-lg font-bold text-slate-700">{rate}%</p>
                              <p className="text-[10px] text-slate-500">{tp('Taux conv.')}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                            <span>{s.totalLinks || 0} lien{(s.totalLinks || 0) > 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span>Commission: {a.commissionValue} {a.commissionType === 'fixed' ? 'FCFA' : '%'}</span>
                            <span>•</span>
                            <span>Inscrit le {a.createdAt ? new Date(a.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                            {a.lastLoginAt ? (
                              <>
                                <span>•</span>
                                <span className="text-green-600">Dernière connexion: {new Date(a.lastLoginAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} à {new Date(a.lastLoginAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </>
                            ) : (
                              <>
                                <span>•</span>
                                <span className="text-muted-foreground italic">{tp('Jamais connecté')}</span>
                              </>
                            )}
                          </div>

                          {(s.pendingCommissions > 0 || s.approvedCommissions > 0 || s.paidCommissions > 0) && (
                            <div className="flex items-center gap-3 mt-1 text-[10px]">
                              {s.pendingCommissions > 0 && <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">En attente: {fmt(s.pendingCommissions)}</span>}
                              {s.approvedCommissions > 0 && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Approuvées: {fmt(s.approvedCommissions)}</span>}
                              {s.paidCommissions > 0 && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">Payées: {fmt(s.paidCommissions)}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ───── ONGLET CONVERSIONS ───── */}
            {tab === 'Conversions' && (
              <div className="bg-card border border-border rounded-xl p-4">
                <h2 className="text-sm font-semibold text-foreground mb-3">Conversions ({conversions.length})</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-background border-b">
                        <th className="px-2 py-2 text-left">{tp('Affilié')}</th>
                        <th className="px-2 py-2 text-left">{tp('Commande')}</th>
                        <th className="px-2 py-2 text-right">{tp('Montant')}</th>
                        <th className="px-2 py-2 text-right">{tp('Commission')}</th>
                        <th className="px-2 py-2 text-left">{tp('Statut')}</th>
                        <th className="px-2 py-2 text-left">{tp('Action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversions.map((c) => (
                        <tr key={c._id} className="border-b hover:bg-background">
                          <td className="px-2 py-2">{c.affiliateId?.name || c.affiliateCode}</td>
                          <td className="px-2 py-2 font-mono">{c.orderNumber || '—'}</td>
                          <td className="px-2 py-2 text-right">{fmt(c.orderAmount)}</td>
                          <td className="px-2 py-2 text-right font-semibold text-green-700">{fmt(c.commissionAmount)}</td>
                          <td className="px-2 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[c.status] || 'bg-muted text-muted-foreground'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex gap-1 flex-wrap">
                              {['pending', 'approved', 'paid', 'rejected'].map((s) => (
                                <button
                                  key={s}
                                  onClick={() => updateConversionStatus(c._id, s)}
                                  disabled={c.status === s}
                                  className={`px-2 py-0.5 border rounded text-[10px] transition-colors ${c.status === s ? 'bg-slate-900 text-white border-slate-900' : 'hover:bg-background'}`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ───── ONGLET RETRAITS ───── */}
            {tab === 'Retraits' && (
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-foreground">{tp('Demandes de retrait')} ({payouts.length})</h2>
                  <p className="text-xs text-muted-foreground">
                    {tp('En attente :')} <span className="font-bold text-rose-600">{fmt(kpis.payoutsPendingAmount)} FCFA</span> ({fmt(kpis.payoutsPendingCount)})
                  </p>
                </div>
                <div className="space-y-3">
                  {payouts.map((p) => {
                    const inputs = payoutInputs[p._id] || {};
                    const aff = p.affiliateId || {};
                    return (
                      <div key={p._id} className={`p-4 border rounded-lg text-sm ${p.status === 'pending' ? 'border-amber-300 bg-amber-50/40' : ''}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">
                              {aff.name || '—'}
                              {' '}•{' '}
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{aff.referralCode || ''}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">{aff.email || ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">{fmt(p.amount)} FCFA</p>
                            <p className="text-[11px] text-muted-foreground">
                              {PAYOUT_METHOD_LABELS[p.method] || p.method}
                              {p.phoneNumber ? ` — ${p.phoneNumber}` : ''}
                              {p.accountName ? ` (${p.accountName})` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                          <span>{tp('Demandé le')} {new Date(p.createdAt).toLocaleDateString('fr-FR')}</span>
                          <span>•</span>
                          <span>{p.conversionCount || 0} {tp('commissions verrouillées')}</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            p.status === 'pending' ? 'bg-amber-100 text-amber-700' : p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {p.status === 'pending' ? tp('En attente') : p.status === 'paid' ? tp('Payé') : tp('Rejeté')}
                          </span>
                          {p.paymentReference && <span className="font-mono">{tp('Réf :')} {p.paymentReference}</span>}
                          {p.adminNote && <span>{tp('Note :')} {p.adminNote}</span>}
                        </div>
                        {p.status === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2 mt-3">
                            <input
                              value={inputs.paymentReference || ''}
                              onChange={(e) => setPayoutInputs((prev) => ({ ...prev, [p._id]: { ...prev[p._id], paymentReference: e.target.value } }))}
                              placeholder={tp('Référence transaction (Momo/virement)')}
                              className="flex-1 px-3 py-2 border rounded-lg text-xs"
                            />
                            <input
                              value={inputs.adminNote || ''}
                              onChange={(e) => setPayoutInputs((prev) => ({ ...prev, [p._id]: { ...prev[p._id], adminNote: e.target.value } }))}
                              placeholder={tp('Note (optionnel)')}
                              className="flex-1 px-3 py-2 border rounded-lg text-xs"
                            />
                            <button
                              onClick={() => updatePayout(p._id, 'paid')}
                              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                            >
                              {tp('Marquer payé')}
                            </button>
                            <button
                              onClick={() => updatePayout(p._id, 'rejected')}
                              className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold"
                            >
                              {tp('Rejeter')}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {payouts.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">{tp('Aucune demande de retrait.')}</p>
                  )}
                </div>
              </div>
            )}

            {/* ───── ONGLET CONFIGURATION ───── */}
            {tab === 'Configuration' && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">{tp('Configuration globale')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{tp('Type de commission')}</label>
                    <select value={config?.baseCommissionType || 'fixed'} onChange={(e) => setConfig((p) => ({ ...p, baseCommissionType: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                      <option value="fixed">{tp('Montant fixe (FCFA)')}</option>
                      <option value="percentage">{tp('Pourcentage (%)')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{tp('Valeur de commission')}</label>
                    <input value={config?.baseCommissionValue ?? 500} onChange={(e) => setConfig((p) => ({ ...p, baseCommissionValue: Number(e.target.value || 0) }))} type="number" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{tp('URL destination par défaut')}</label>
                    <input value={config?.defaultLandingUrl || ''} onChange={(e) => setConfig((p) => ({ ...p, defaultLandingUrl: e.target.value }))} placeholder="https://..." className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-foreground pt-2">{tp('Programme Scalor (inscriptions & abonnements)')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{tp('Bonus inscription (FCFA)')}</label>
                    <input value={config?.signupBonusAmount ?? 500} onChange={(e) => setConfig((p) => ({ ...p, signupBonusAmount: Number(e.target.value || 0) }))} type="number" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{tp('% commission abonnements (à vie)')}</label>
                    <input value={config?.paymentCommissionPercent ?? 50} onChange={(e) => setConfig((p) => ({ ...p, paymentCommissionPercent: Number(e.target.value || 0) }))} type="number" min="0" max="100" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{tp("Fenêtre d'attribution (jours)")}</label>
                    <input value={config?.attributionWindowDays ?? 60} onChange={(e) => setConfig((p) => ({ ...p, attributionWindowDays: Number(e.target.value || 0) }))} type="number" min="1" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{tp('Retrait minimum (FCFA)')}</label>
                    <input value={config?.minPayoutAmount ?? 5000} onChange={(e) => setConfig((p) => ({ ...p, minPayoutAmount: Number(e.target.value || 0) }))} type="number" min="0" className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={saveConfig} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800">
                    {tp('Sauvegarder configuration')}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {tp('Inscription :')} {fmt(config?.signupBonusAmount ?? 500)} FCFA • {tp('Abonnements :')} {config?.paymentCommissionPercent ?? 50}% • {tp('Attribution :')} {config?.attributionWindowDays ?? 60} j
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
