import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { affiliateSelfApi, affiliateSelfTrackingUrl } from '../services/affiliateSelfApi.js';
import { tp } from '../i18n/platform.js';

// ─── Affiliation Scalor — intégrée au compte (pas de compte affilié séparé) ──
// Le profil affilié est auto-provisionné au premier chargement de la page.

const fmt = (n) => (n || 0).toLocaleString('fr-FR');

// Palette validée (CVD-safe) : bleu / ambre / teal
const SERIES_COLORS = { visits: '#2563EB', clicks: '#D97706', signups: '#0D9488', commissions: '#0D9488' };

const statusColors = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-primary-100 text-primary-800',
  paid: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
};
const statusLabels = { pending: 'En attente', approved: 'Approuvée', paid: 'Payée', rejected: 'Rejetée' };
const payoutStatusLabels = { pending: 'En traitement', paid: 'Payé', rejected: 'Rejeté' };
const METHOD_LABELS = { mtn_momo: 'MTN MoMo', orange_money: 'Orange Money', bank: 'Virement', other: 'Autre' };

const chartTooltipStyle = { fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };

const KpiCard = ({ label, value, accent = 'text-foreground', sub = null }) => (
  <div className="bg-card border border-border rounded-xl p-4">
    <p className={`text-2xl font-bold ${accent}`}>{fmt(value)}</p>
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-0.5">{label}</p>
    {sub && <p className="text-[11px] text-muted-foreground/70 mt-1">{sub}</p>}
  </div>
);

export default function EcomAffiliation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [affiliate, setAffiliate] = useState(null);
  const [summary, setSummary] = useState(null);
  const [series, setSeries] = useState([]);
  const [links, setLinks] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [balance, setBalance] = useState(0);
  const [minPayout, setMinPayout] = useState(5000);
  const [days, setDays] = useState(30);
  const [copied, setCopied] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestForm, setRequestForm] = useState({ method: 'mtn_momo', phoneNumber: '', accountName: '' });
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  const load = useCallback(async (periodDays) => {
    setLoading(true);
    setError('');
    try {
      // Le premier appel auto-provisionne le profil affilié. L'attendre évite
      // que les requêtes suivantes tentent toutes de le créer en parallèle.
      const d = await affiliateSelfApi.dashboard();
      const [s, ts, l, r, c, p] = await Promise.all([
        affiliateSelfApi.summary({ days: periodDays }),
        affiliateSelfApi.timeseries({ days: periodDays }),
        affiliateSelfApi.links(),
        affiliateSelfApi.referrals(),
        affiliateSelfApi.conversions({ page: 1, limit: 30 }),
        affiliateSelfApi.payouts()
      ]);
      setAffiliate(d.data?.data?.affiliate || null);
      setSummary(s.data?.data || null);
      setSeries(ts.data?.data?.series || []);
      setLinks(l.data?.data?.links || []);
      setReferrals(r.data?.data?.referrals || []);
      setConversions(c.data?.data?.items || []);
      const payoutData = p.data?.data || {};
      setPayouts(payoutData.payouts || []);
      setBalance(payoutData.balance || 0);
      setMinPayout(payoutData.minPayoutAmount ?? 5000);
      const saved = payoutData.savedMethod || {};
      setRequestForm((f) => ({
        method: saved.method || f.method,
        phoneNumber: saved.phoneNumber || f.phoneNumber,
        accountName: saved.accountName || f.accountName
      }));
    } catch (err) {
      setError(err.response?.data?.message || tp('Chargement impossible'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const mainLink = links.find((l) => l.isActive) || links[0] || null;
  const referralUrl = (affiliate?.referralCode || mainLink) ? affiliateSelfTrackingUrl(affiliate?.referralCode || mainLink.code) : '';

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = (url) => {
    const msg = encodeURIComponent(`Rejoins Scalor, le SaaS e-commerce africain ! Inscris-toi avec mon lien et lance ton business : ${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const hasPendingPayout = payouts.some((p) => p.status === 'pending');
  const canRequest = balance >= minPayout && !hasPendingPayout;

  const submitRequest = async (e) => {
    e.preventDefault();
    setRequesting(true);
    setRequestError('');
    setRequestSuccess('');
    try {
      const res = await affiliateSelfApi.requestPayout(requestForm);
      setRequestSuccess(res.data?.message || tp('Demande de retrait enregistrée'));
      setShowRequest(false);
      await load(days);
    } catch (err) {
      setRequestError(err.response?.data?.message || tp('Demande impossible'));
    } finally {
      setRequesting(false);
    }
  };

  const funnel = summary?.funnel || {};
  const lifetime = summary?.lifetime || {};
  const program = summary?.program || {};
  const chartData = series.map((d) => ({ ...d, label: d.date?.slice(5) }));

  if (loading && !affiliate) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: '#0F6B4F' }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">{tp('Programme d’affiliation')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {tp('Partage ton lien : {bonus} FCFA par inscription + {percent}% à vie sur chaque abonnement de tes filleuls.', {
            bonus: fmt(program.signupBonusAmount ?? 500),
            percent: program.paymentCommissionPercent ?? 50
          })}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
      )}
      {requestSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{requestSuccess}</div>
      )}

      {/* Lien de parrainage */}
      <div className="bg-gradient-to-r from-[#0F6B4F] to-[#0a5040] rounded-2xl p-5 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
          <p className="text-sm text-white/80">{tp('Ton lien de parrainage (tracké — visites, clics et conversions attribués {days} jours)', { days: program.attributionWindowDays || 60 })}</p>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-white/10 rounded-full border border-white/20 self-start">
            Code {affiliate?.referralCode || '—'}
          </span>
        </div>
        {referralUrl ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <code className="flex-1 text-sm bg-black/20 text-white rounded-xl p-3 break-all font-mono border border-white/10">{referralUrl}</code>
            <div className="flex gap-2">
              <button onClick={() => copyToClipboard(referralUrl)}
                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${copied ? 'bg-white text-[#0F6B4F]' : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'}`}>
                {copied ? tp('Copié !') : tp('Copier')}
              </button>
              <button onClick={() => shareWhatsApp(referralUrl)}
                className="px-4 py-3 rounded-xl font-semibold text-sm bg-[#25D366] hover:bg-[#20BD5A] text-white transition-all">
                WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/80">{tp('Ton lien est en cours de création — recharge la page.')}</p>
        )}
      </div>

      {/* Période */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-foreground">{tp('Performance des {days} derniers jours', { days })}</h2>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${days === d ? 'bg-[#0F6B4F] text-white' : 'text-muted-foreground hover:text-foreground'}`}>
              {d} j
            </button>
          ))}
        </div>
      </div>

      {/* KPIs + funnel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label={tp('Solde disponible (FCFA)')} value={balance} accent="text-[#0F6B4F]" sub={`${tp('Retrait dès')} ${fmt(minPayout)} F`} />
        <KpiCard label={tp('Commissions période (FCFA)')} value={funnel.periodCommissions} />
        <KpiCard label={tp('Inscriptions période')} value={funnel.signups} sub={`${fmt(funnel.clicks)} ${tp('clics')} · ${fmt(funnel.visits)} ${tp('visites')}`} />
        <KpiCard label={tp('Commissions payées (FCFA)')} value={lifetime.paidCommissions} />
      </div>

      {/* Graphique trafic & inscriptions */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">{tp('Visites, clics et inscriptions par jour')}</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="visits" name={tp('Visites')} stroke={SERIES_COLORS.visits} fill={SERIES_COLORS.visits} fillOpacity={0.08} strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="clicks" name={tp('Clics')} stroke={SERIES_COLORS.clicks} fill={SERIES_COLORS.clicks} fillOpacity={0.08} strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="signups" name={tp('Inscriptions')} stroke={SERIES_COLORS.signups} fill={SERIES_COLORS.signups} fillOpacity={0.12} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Commissions par jour */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">{tp('Commissions par jour (FCFA)')}</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v) => [`${fmt(v)} F`, tp('Commissions')]} />
              <Bar dataKey="commissions" name={tp('Commissions')} fill={SERIES_COLORS.commissions} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Retraits */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tp('Retraits')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tp('Solde disponible :')} <span className="font-bold text-[#0F6B4F]">{fmt(balance)} FCFA</span> · {tp('minimum')} {fmt(minPayout)} F
            </p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <button onClick={() => setShowRequest((v) => !v)} disabled={!canRequest}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${canRequest ? 'bg-[#0F6B4F] text-white hover:bg-[#0a5040]' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}>
              {tp('Demander un retrait')}
            </button>
            {hasPendingPayout && <p className="text-xs text-muted-foreground">{tp('Un retrait est déjà en cours de traitement.')}</p>}
            {!hasPendingPayout && balance < minPayout && <p className="text-xs text-muted-foreground">{tp('Encore {amount} FCFA avant de pouvoir retirer.', { amount: fmt(minPayout - balance) })}</p>}
          </div>
        </div>

        {showRequest && canRequest && (
          <form onSubmit={submitRequest} className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border pt-4">
            {requestError && <div className="sm:col-span-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{requestError}</div>}
            <select value={requestForm.method} onChange={(e) => setRequestForm((f) => ({ ...f, method: e.target.value }))}
              className="px-4 py-3 bg-background border border-border rounded-xl text-foreground text-sm outline-none focus:ring-2 focus:ring-primary-500">
              <option value="mtn_momo">MTN MoMo</option>
              <option value="orange_money">Orange Money</option>
              <option value="bank">{tp('Virement bancaire')}</option>
              <option value="other">{tp('Autre')}</option>
            </select>
            <input type="tel" required={['mtn_momo', 'orange_money'].includes(requestForm.method)}
              placeholder={['bank', 'other'].includes(requestForm.method) ? tp('Numéro de compte / référence') : tp('Numéro Mobile Money (ex: 6XXXXXXXX)')}
              value={requestForm.phoneNumber} onChange={(e) => setRequestForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              className="px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            <input type="text" placeholder={tp('Nom du bénéficiaire')} value={requestForm.accountName}
              onChange={(e) => setRequestForm((f) => ({ ...f, accountName: e.target.value }))}
              className="px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder-gray-400 text-sm outline-none focus:ring-2 focus:ring-primary-500" />
            <button type="submit" disabled={requesting}
              className="px-6 py-3 bg-[#0F6B4F] hover:bg-[#0a5040] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50">
              {requesting ? tp('Envoi...') : `${tp('Retirer')} ${fmt(balance)} FCFA`}
            </button>
          </form>
        )}

        {payouts.length > 0 && (
          <div className="border-t border-border pt-3 space-y-2">
            {payouts.slice(0, 5).map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('fr-FR')} · {METHOD_LABELS[p.method] || p.method}{p.phoneNumber ? ` — ${p.phoneNumber}` : ''}</span>
                <span className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{fmt(p.amount)} F</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${p.status === 'pending' ? 'bg-amber-100 text-amber-800' : p.status === 'paid' ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-800'}`}>
                    {payoutStatusLabels[p.status] || p.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filleuls */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{tp('Mes filleuls')}</h3>
          <span className="text-xs text-muted-foreground">{referrals.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Filleul')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Inscrit le')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Paiements')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Mes commissions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground">{r.name || '—'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.email}</p>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(r.signedUpAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3 text-sm text-right text-foreground">{fmt(r.payments)}</td>
                  <td className="px-5 py-3 text-sm text-right font-bold text-[#0F6B4F]">+{fmt(r.commissions)} F</td>
                </tr>
              ))}
              {referrals.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">{tp('Aucun filleul pour le moment. Partage ton lien pour commencer.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dernières commissions */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{tp('Dernières commissions')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Date')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Type')}</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Commission')}</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{tp('Statut')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conversions.map((c) => (
                <tr key={c._id}>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-5 py-3 text-sm text-foreground font-medium">
                    {c.conversionType === 'signup' ? tp('Inscription filleul') : c.conversionType === 'payment' ? `${tp('Abonnement')} (${c.commissionValue}%)` : tp('Commande')}
                  </td>
                  <td className="px-5 py-3 text-sm text-right font-bold text-[#0F6B4F]">+{fmt(c.commissionAmount)} F</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[c.status] || 'bg-muted text-muted-foreground'}`}>
                      {statusLabels[c.status] || c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {conversions.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">{tp('Aucune commission pour le moment.')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
