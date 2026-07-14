import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Wallet, CreditCard, RefreshCw, Loader2, CheckCircle, Clock,
  Sparkles, Receipt, AlertCircle, Zap,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { CREDIT_PACKS, formatDate, EmptyState } from './creativeShared.jsx';

const PRICE_PER_CREDIT = 80; // FCFA (aligné backend /buy-creative)

function paymentLabel(p) {
  if (Array.isArray(p.article) && p.article[0] && typeof p.article[0] === 'object') {
    const k = Object.keys(p.article[0])[0];
    if (k) return k;
  }
  return p.planLabel || p.plan || p.description || (p.type ? `${p.type}` : tp('Paiement'));
}
function paymentAmount(p) { return p.totalPrice ?? p.amount ?? p.amountFcfa ?? p.price ?? 0; }

function StatusBadge({ status }) {
  const s = String(status || '').toLowerCase();
  const paid = ['paid', 'success', 'completed', 'confirmed'].includes(s);
  const pending = ['pending', 'processing', 'created'].includes(s);
  const cls = paid ? 'bg-primary-50 text-primary-700' : pending ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500';
  const label = paid ? tp('Payé') : pending ? tp('En attente') : (status || tp('Échoué'));
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

const BillingStudio = ({ credits, onRecharge, onBuyPack, onCreditsChange }) => {
  const [payments, setPayments] = useState([]);
  const [loadingH, setLoadingH] = useState(true);
  const [errorH, setErrorH] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [msg, setMsg] = useState('');

  const loadHistory = useCallback(async () => {
    setLoadingH(true); setErrorH('');
    try {
      const r = await creativeApi.credits.history();
      setPayments(r.data?.payments || []);
    } catch (err) {
      setErrorH(err.response?.data?.message || tp('Historique indisponible'));
    } finally {
      setLoadingH(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const recover = async () => {
    setRecovering(true); setMsg('');
    try {
      await creativeApi.credits.recover();
      const r = await creativeApi.credits.get();
      onCreditsChange?.(r.data?.credits ?? 0);
      setMsg(tp('Solde actualisé.'));
      loadHistory();
    } catch {
      setMsg(tp('Aucun paiement en attente à récupérer.'));
    } finally {
      setRecovering(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* En-tête */}
      <div className="flex items-start gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0"><Settings size={20} className="text-gray-600" /></div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{tp('Paramètres')}</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">{tp('Crédits & facturation du Creative Center')}</p>
        </div>
      </div>

      {/* Solde */}
      <div className="rounded-3xl bg-gray-900 text-white p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"><Wallet size={26} className="text-primary-300" /></div>
            <div>
              <p className="text-[12px] text-white/50 uppercase tracking-wide font-semibold">{tp('Crédits disponibles')}</p>
              <p className="text-4xl font-bold leading-tight">{credits ?? '—'}</p>
              <p className="text-[12px] text-white/50 mt-0.5">{tp('1 crédit = 1 génération d\'affiche')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={recover} disabled={recovering}
              className="h-10 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[13px] font-medium inline-flex items-center gap-2 disabled:opacity-60">
              {recovering ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {tp('Paiements en attente')}
            </button>
            <button onClick={onRecharge}
              className="h-10 px-4 rounded-xl bg-white text-gray-900 text-[13px] font-bold inline-flex items-center gap-2 hover:bg-white/90">
              <CreditCard size={15} /> {tp('Recharger')}
            </button>
          </div>
        </div>
        {msg && <p className="relative mt-3 text-[12px] text-primary-200 inline-flex items-center gap-1.5"><CheckCircle size={13} /> {msg}</p>}
      </div>

      {/* Packs */}
      <div>
        <h3 className="text-[14px] font-bold text-gray-900 mb-1">{tp('Recharger des crédits')}</h3>
        <p className="text-[12px] text-gray-400 mb-3">{PRICE_PER_CREDIT} FCFA {tp('par crédit')} · {tp('paiement mobile money')}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {CREDIT_PACKS.map(p => (
            <div key={p.quantity} className={`relative rounded-2xl border p-4 ${p.badge ? 'border-primary-200 bg-primary-50/40' : 'border-gray-200 bg-white'}`}>
              {p.badge && <span className="absolute -top-2 left-4 text-[9px] font-bold uppercase tracking-wide bg-scalor-copper text-white px-2 py-0.5 rounded-full">{p.badge}</span>}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">{p.quantity}</span>
                <span className="text-[12px] text-gray-400">{tp('crédits')}</span>
              </div>
              <p className="text-[13px] font-semibold text-primary-600 mt-0.5">{p.price} FCFA</p>
              <button onClick={() => onBuyPack?.(p)}
                className="mt-3 w-full h-9 rounded-xl bg-gray-900 text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-gray-800">
                <Zap size={13} /> {tp('Acheter')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Facturation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-gray-400" />
            <h3 className="text-[14px] font-bold text-gray-900">{tp('Historique de facturation')}</h3>
          </div>
          <button onClick={loadHistory} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"><RefreshCw size={13} /></button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
          {loadingH && (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                  <div className="space-y-2"><div className="h-3 w-40 bg-gray-100 rounded" /><div className="h-2 w-24 bg-gray-100 rounded" /></div>
                  <div className="h-3 w-16 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          )}

          {!loadingH && errorH && (
            <div className="flex items-center gap-2 text-[13px] text-red-600 p-4"><AlertCircle size={15} /> {errorH}</div>
          )}

          {!loadingH && !errorH && payments.length === 0 && (
            <EmptyState icon={Receipt} title={tp('Aucune facture pour le moment')} description={tp('Vos achats de crédits et d\'abonnement apparaîtront ici.')} />
          )}

          {!loadingH && !errorH && payments.length > 0 && (
            <div className="divide-y divide-gray-50">
              {payments.map((p, i) => (
                <div key={p._id || i} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                      {String(p.status).toLowerCase() === 'pending' ? <Clock size={15} className="text-amber-500" /> : <Sparkles size={15} className="text-primary-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 truncate">{paymentLabel(p)}</p>
                      <p className="text-[11px] text-gray-400">{formatDate(p.createdAt || p.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[13px] font-bold text-gray-900">{paymentAmount(p)} FCFA</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">{tp('L\'historique affiche vos paiements d\'abonnement et de crédits confirmés.')}</p>
      </div>
    </div>
  );
};

export default BillingStudio;
