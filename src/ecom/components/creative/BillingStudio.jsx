import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Wallet, CreditCard, RefreshCw, Loader2, CheckCircle, Clock,
  Sparkles, Receipt, AlertCircle, Zap, Wand2, Image as ImageIcon, Video,
  Mic, Clapperboard, Languages, Speech, Copy,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { CREDIT_PACKS, formatDate, EmptyState, useCreativePricing } from './creativeShared.jsx';

// Icône par fonctionnalité de la grille tarifaire.
const FEATURE_ICONS = {
  text: Wand2, image: ImageIcon, voice: Mic, video: Video,
  montage: Clapperboard, clone: Copy, lipsync: Speech, translation: Languages,
};
const FEATURE_ORDER = ['text', 'image', 'voice', 'video', 'montage', 'clone', 'lipsync', 'translation'];

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
  const cls = paid ? 'bg-primary-50 text-primary' : pending ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground';
  const label = paid ? tp('Payé') : pending ? tp('En attente') : (status || tp('Échoué'));
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

const BillingStudio = ({ credits, onRecharge, onBuyPack, onCreditsChange }) => {
  const [payments, setPayments] = useState([]);
  const [loadingH, setLoadingH] = useState(true);
  const [errorH, setErrorH] = useState('');
  const [recovering, setRecovering] = useState(false);
  const [msg, setMsg] = useState('');
  const pricing = useCreativePricing();
  const PRICE_PER_CREDIT = pricing.pricePerCreditFcfa; // FCFA (source backend, fallback 80)

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
        <div className="w-11 h-11 rounded-2xl bg-muted flex items-center justify-center shrink-0"><Settings size={20} className="text-muted-foreground" /></div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{tp('Paramètres')}</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">{tp('Crédits & facturation du Creative Center')}</p>
        </div>
      </div>

      {/* Solde */}
      <div className="rounded-3xl bg-gray-900 text-white p-6 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-card/10 flex items-center justify-center"><Wallet size={26} className="text-primary-300" /></div>
            <div>
              <p className="text-[12px] text-white/50 uppercase tracking-wide font-semibold">{tp('Crédits disponibles')}</p>
              <p className="text-4xl font-bold leading-tight">{credits ?? '—'}</p>
              <p className="text-[12px] text-white/50 mt-0.5">{tp('Débités à l\'usage selon la grille ci-dessous')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={recover} disabled={recovering}
              className="h-10 px-3.5 rounded-xl bg-card/10 hover:bg-card/15 text-white text-[13px] font-medium inline-flex items-center gap-2 disabled:opacity-60">
              {recovering ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {tp('Paiements en attente')}
            </button>
            <button onClick={onRecharge}
              className="h-10 px-4 rounded-xl bg-card text-foreground text-[13px] font-bold inline-flex items-center gap-2 hover:bg-card/90">
              <CreditCard size={15} /> {tp('Recharger')}
            </button>
          </div>
        </div>
        {msg && <p className="relative mt-3 text-[12px] text-primary-200 inline-flex items-center gap-1.5"><CheckCircle size={13} /> {msg}</p>}
      </div>

      {/* Packs */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-1">{tp('Recharger des crédits')}</h3>
        <p className="text-[12px] text-muted-foreground mb-3">{PRICE_PER_CREDIT} FCFA {tp('par crédit')} · {tp('paiement mobile money')}</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {CREDIT_PACKS.map(p => (
            <div key={p.quantity} className={`relative rounded-2xl border p-4 ${p.badge ? 'border-primary-200 bg-primary-50/40' : 'border-border bg-card'}`}>
              {p.badge && <span className="absolute -top-2 left-4 text-[9px] font-bold uppercase tracking-wide bg-primary text-white px-2 py-0.5 rounded-full">{p.badge}</span>}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{p.quantity}</span>
                <span className="text-[12px] text-muted-foreground">{tp('crédits')}</span>
              </div>
              <p className="text-[13px] font-semibold text-primary mt-0.5">{p.price} FCFA</p>
              <button onClick={() => onBuyPack?.(p)}
                className="mt-3 w-full h-9 rounded-xl bg-gray-900 text-white text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-gray-800">
                <Zap size={13} /> {tp('Acheter')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Grille tarifaire — coût en crédits par fonctionnalité */}
      <div>
        <h3 className="text-[14px] font-bold text-foreground mb-1">{tp('Tarifs des fonctionnalités')}</h3>
        <p className="text-[12px] text-muted-foreground mb-3">{tp('Chaque génération débite votre solde selon cette grille. Les générations échouées sont automatiquement remboursées.')}</p>
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-gray-50">
          {FEATURE_ORDER.filter((k) => pricing.features?.[k]).map((k) => {
            const f = pricing.features[k];
            const Icon = FEATURE_ICONS[k] || Sparkles;
            const free = !f.credits;
            return (
              <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate">{tp(f.label)}</p>
                    <p className="text-[11px] text-muted-foreground">{tp(f.unit || '')}</p>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${free ? 'bg-primary-50 text-primary' : 'bg-muted text-foreground'}`}>
                  {free ? tp('Gratuit') : <><Zap size={11} /> {f.credits} {f.credits > 1 ? tp('crédits') : tp('crédit')}</>}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">{tp('Soit')} {PRICE_PER_CREDIT} {tp('FCFA par crédit — ex. une vidéo IA à 3 crédits coûte')} {3 * PRICE_PER_CREDIT} FCFA.</p>
      </div>

      {/* Facturation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-muted-foreground" />
            <h3 className="text-[14px] font-bold text-foreground">{tp('Historique de facturation')}</h3>
          </div>
          <button onClick={loadHistory} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-background"><RefreshCw size={13} /></button>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {loadingH && (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 animate-pulse">
                  <div className="space-y-2"><div className="h-3 w-40 bg-muted rounded" /><div className="h-2 w-24 bg-muted rounded" /></div>
                  <div className="h-3 w-16 bg-muted rounded" />
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
                    <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0">
                      {String(p.status).toLowerCase() === 'pending' ? <Clock size={15} className="text-primary" /> : <Sparkles size={15} className="text-primary-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">{paymentLabel(p)}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(p.createdAt || p.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[13px] font-bold text-foreground">{paymentAmount(p)} FCFA</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">{tp('L\'historique affiche vos paiements d\'abonnement et de crédits confirmés.')}</p>
      </div>
    </div>
  );
};

export default BillingStudio;
