import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, X, Sparkles, CheckCircle, Wallet, CreditCard, Zap, Store, Package } from 'lucide-react';
import creativeApi, { CREATIVE_PROVIDERS } from '../../services/creativeApi.js';
import ecomApi from '../../services/ecommApi.js';
import { tp } from '../../i18n/platform.js';

/* ════════════════════════════════════════════════════════════════════════
   Creative Center — primitives de design partagées (ultra épuré)
   Tokens : vert marque #0F6B4F (primary-*), gris neutres, radius 2xl,
   ombres douces, beaucoup d'air.
   ════════════════════════════════════════════════════════════════════════ */

// ─── Palette d'accent par module ────────────────────────────────────────────
export const ACCENTS = {
  text:  { ring: 'ring-primary/20',    text: 'text-primary',    bg: 'bg-primary/10',    solid: 'bg-primary',    grad: 'from-primary to-primary-700' },
  image: { ring: 'ring-primary-100', text: 'text-primary', bg: 'bg-primary-50', solid: 'bg-primary', grad: 'from-primary-500 to-primary-700' },
  video: { ring: 'ring-primary/20',  text: 'text-primary', bg: 'bg-primary/10', solid: 'bg-primary', grad: 'from-primary to-primary-700' },
  launch:{ ring: 'ring-primary/20',  text: 'text-primary',  bg: 'bg-primary/10',  solid: 'bg-primary',   grad: 'from-primary to-primary-700' },
  montage:{ ring: 'ring-primary/20',   text: 'text-primary',    bg: 'bg-primary/10',    solid: 'bg-primary',     grad: 'from-primary to-primary-700' },
  translation:{ ring: 'ring-primary/20', text: 'text-primary', bg: 'bg-primary/10', solid: 'bg-primary', grad: 'from-primary to-primary-700' },
  voice: { ring: 'ring-primary-100', text: 'text-primary', bg: 'bg-primary-50', solid: 'bg-primary', grad: 'from-primary-500 to-primary-700' },
};

export const CREDIT_PACKS = [
  { quantity: 10, label: '10 crédits', price: 800 },
  { quantity: 20, label: '20 crédits', price: 1600, badge: tp('Populaire') },
  { quantity: 50, label: '50 crédits', price: 4000, badge: tp('Meilleure offre') },
];

// ─── Tarification des fonctionnalités (fallback local, aligné backend) ──────
// Source de vérité : GET /billing/creative-pricing (config/creativePricing.js
// côté backend). Ces valeurs ne servent que si l'API est injoignable.
export const FEATURE_COSTS = {
  text:        { credits: 0, label: tp('Texte marketing'),           unit: tp('par génération') },
  image:       { credits: 1, label: tp('Affiche publicitaire'),      unit: tp('par format généré') },
  voice:       { credits: 0, label: tp('Voix off'),                  unit: tp('par audio généré') },
  video:       { credits: 3, label: tp('Vidéo IA (scène)'),          unit: tp('par scène générée') },
  montage:     { credits: 2, label: tp('Montage vidéo'),             unit: tp('par montage rendu') },
  clone:       { credits: 2, label: tp('Clone de page produit'),     unit: tp('par page clonée') },
  lipsync:     { credits: 4, label: tp('Avatar parlant (lip sync)'), unit: tp('par vidéo avatar') },
  translation: { credits: 4, label: tp('Traduction vidéo'),          unit: tp('par vidéo doublée') },
};

// Cache module : la grille ne change pas pendant la session → 1 seul fetch.
let _pricingCache = null;
let _pricingPromise = null;

/** Grille tarifaire — API backend avec fallback local. */
export function useCreativePricing() {
  const [pricing, setPricing] = useState(_pricingCache || { pricePerCreditFcfa: 80, features: FEATURE_COSTS });
  useEffect(() => {
    if (_pricingCache) return;
    if (!_pricingPromise) {
      _pricingPromise = creativeApi.credits.pricing()
        .then((r) => {
          if (r.data?.success && r.data.features) {
            _pricingCache = { pricePerCreditFcfa: r.data.pricePerCreditFcfa ?? 80, features: { ...FEATURE_COSTS, ...r.data.features } };
          }
          return _pricingCache;
        })
        .catch(() => null);
    }
    let alive = true;
    _pricingPromise.then((p) => { if (alive && p) setPricing(p); });
    return () => { alive = false; };
  }, []);
  return pricing;
}

/** Coût en crédits d'une fonctionnalité (fallback local si API indispo). */
export function featureCost(key) {
  return (_pricingCache?.features?.[key]?.credits ?? FEATURE_COSTS[key]?.credits) ?? 0;
}

/** Détecte l'erreur 402 INSUFFICIENT_CREDITS du backend → { required, available } | null. */
export function getInsufficientCredits(err) {
  const d = err?.response?.data;
  if (err?.response?.status === 402 || d?.error === 'INSUFFICIENT_CREDITS') {
    return { required: d?.creditsRequired ?? 0, available: d?.creditsAvailable ?? 0, message: d?.message };
  }
  return null;
}

/** Petit badge « N crédits » à poser sur un bouton Générer (gratuit → rien). */
export function CostChip({ cost, className = '' }) {
  if (!cost) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 ${className}`}>
      <Zap size={9} /> {cost}
    </span>
  );
}

/** Bandeau de blocage « crédits insuffisants » avec CTA recharge. */
export function InsufficientCreditsNotice({ required, credits, onRecharge, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <Wallet size={15} className="text-amber-600 shrink-0" />
        <p className="text-[12.5px] text-amber-800 min-w-0">
          {tp('Crédits insuffisants')} — {required} {tp('requis')}, {credits ?? 0} {tp('disponible(s)')}.
        </p>
      </div>
      <button type="button" onClick={onRecharge}
        className="h-8 px-3 rounded-lg bg-gray-900 text-white text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-gray-800 shrink-0">
        <Zap size={12} /> {tp('Recharger')}
      </button>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function triggerBlobDownload(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

export async function downloadFile(url, filename) {
  const safeName = (filename || 'creative').replace(/\s+/g, '-').toLowerCase();

  // 1) Fetch direct (même origine ou CDN avec CORS ouvert)
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerBlobDownload(await res.blob(), safeName);
    return;
  } catch {
    console.warn('[download] fetch direct bloqué (CORS CDN) — bascule sur le proxy backend');
  }

  // 2) Proxy backend : streame le fichier en Content-Disposition: attachment
  //    (l'API a le CORS ouvert pour l'app → blob téléchargeable à coup sûr)
  const base = String(ecomApi?.defaults?.baseURL || '/api/ecom').replace(/\/+$/, '');
  const proxyUrl = `${base}/builder-ai/download?src=${encodeURIComponent(url)}&name=${encodeURIComponent(safeName)}`;
  try {
    const res = await fetch(proxyUrl, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    triggerBlobDownload(await res.blob(), safeName);
    return;
  } catch (err) {
    console.warn(`[download] proxy indisponible (${err?.message || err}) — backend pas à jour/redémarré ? ${proxyUrl}`);
  }

  // 3) Dernier recours : ouvrir le média dans un onglet
  window.open(url, '_blank');
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

// ─── Hook crédits ───────────────────────────────────────────────────────────
export function useCreativeCredits() {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const r = await creativeApi.credits.get();
      setCredits(r.data?.credits ?? 0);
    } catch {
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return { credits, setCredits, refresh, loading };
}

// ─── Badge provider ─────────────────────────────────────────────────────────
export function ProviderBadge({ kind = 'text', size = 'sm' }) {
  const provider = CREATIVE_PROVIDERS[kind] || CREATIVE_PROVIDERS.text;
  const a = ACCENTS[kind] || ACCENTS.text;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${a.bg} ${a.text} ${pad}`}>
      <Zap size={size === 'sm' ? 9 : 11} className="opacity-80" />
      {provider.label}
    </span>
  );
}

// ─── Petites primitives réutilisables ───────────────────────────────────────
export function ChoiceChip({ active, onClick, children, icon: Icon, accent = ACCENTS.image, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-[13px] font-medium border transition-all disabled:opacity-40
        ${active
          ? `${accent.bg} ${accent.text} border-transparent ring-2 ${accent.ring}`
          : 'bg-card text-muted-foreground border-border hover:border-gray-300'}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && (
        <span className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-semibold text-foreground">{label}</span>
          {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </span>
      )}
      {children}
    </label>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mb-5 ring-1 ring-gray-100">
        {Icon && <Icon size={26} className="text-gray-300" />}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5">{title}</h3>
      {description && <p className="text-muted-foreground text-sm max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  );
}

// ─── Modal d'achat de crédits (redesign) ────────────────────────────────────
export function BuyCreditsModal({ open, onClose, onSuccess, initialPack }) {
  const [pack, setPack] = useState(initialPack || CREDIT_PACKS[1]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => () => clearInterval(pollRef.current), []);
  useEffect(() => { if (open) { setError(''); setSuccess(null); if (initialPack) setPack(initialPack); } }, [open, initialPack]);

  const startPoll = useCallback((token) => {
    pollRef.current = setInterval(async () => {
      try {
        const r = await creativeApi.credits.status(token);
        const s = r.data?.status || r.data?.payment?.status;
        if (s === 'paid') {
          clearInterval(pollRef.current);
          setSuccess(tp('Paiement confirmé ! Vos crédits ont été ajoutés.'));
          setLoading(false);
          const cr = await creativeApi.credits.get();
          onSuccess?.(cr.data?.credits ?? 0);
        } else if (s === 'failure' || s === 'no paid') {
          clearInterval(pollRef.current);
          setError(tp('Paiement échoué ou annulé.'));
          setLoading(false);
        }
      } catch { /* transitoire */ }
    }, 4000);
  }, [onSuccess]);

  const submit = async () => {
    if (!phone.trim() || phone.trim().length < 8) { setError(tp('Numéro de téléphone invalide')); return; }
    if (!name.trim() || name.trim().length < 2) { setError(tp('Nom requis')); return; }
    setLoading(true); setError(''); setSuccess(null);
    try {
      const r = await creativeApi.credits.buy({ quantity: pack.quantity, phone: phone.trim(), clientName: name.trim() });
      if (r.data?.success && r.data?.paymentUrl) {
        window.open(r.data.paymentUrl, '_blank', 'noopener,noreferrer');
        startPoll(r.data.mfToken);
      } else {
        throw new Error(r.data?.message || 'Erreur');
      }
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || err.message || tp('Erreur paiement'));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full sm:max-w-sm sm:mx-4 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="pt-3 pb-1 flex justify-center sm:hidden"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

        <div className="px-6 pt-5 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center">
              <Wallet size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">{tp('Recharger des crédits')}</h3>
              <p className="text-[12px] text-muted-foreground">{tp('Débités à l’usage selon la fonctionnalité')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        {success ? (
          <div className="px-6 pb-8 pt-2 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-50 flex items-center justify-center mb-4">
              <CheckCircle size={26} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground mb-5">{success}</p>
            <button onClick={onClose} className="w-full h-11 rounded-xl bg-primary text-white font-semibold hover:bg-primary transition-colors">
              {tp('Terminer')}
            </button>
          </div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {CREDIT_PACKS.map(p => (
                <button
                  key={p.quantity}
                  onClick={() => setPack(p)}
                  className={`relative rounded-2xl border p-3 text-center transition-all ${pack.quantity === p.quantity ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-100' : 'border-border hover:border-gray-300'}`}
                >
                  {p.badge && <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wide bg-primary text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">{p.badge}</span>}
                  <div className="text-lg font-bold text-foreground">{p.quantity}</div>
                  <div className="text-[10px] text-muted-foreground -mt-0.5">{tp('crédits')}</div>
                  <div className="text-[11px] font-semibold text-primary mt-1">{p.price} F</div>
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <input value={name} onChange={e => setName(e.target.value)} placeholder={tp('Votre nom')}
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={tp('Numéro de téléphone')} inputMode="tel"
                className="w-full h-11 px-3.5 rounded-xl bg-background border border-border text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition" />
            </div>

            {error && <p className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

            <button onClick={submit} disabled={loading}
              className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> {tp('En attente du paiement…')}</> : <><CreditCard size={16} /> {tp('Payer')} {pack.price} F</>}
            </button>
            <p className="text-center text-[11px] text-muted-foreground">{tp('Paiement mobile money sécurisé')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── En-tête de studio (2 colonnes form / résultat) ─────────────────────────
export function StudioHeader({ icon: Icon, kind, title, subtitle, right }) {
  const a = ACCENTS[kind] || ACCENTS.image;
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div className="flex items-start gap-3.5">
        <div className={`w-11 h-11 rounded-2xl ${a.bg} flex items-center justify-center shrink-0`}>
          {Icon && <Icon size={20} className={a.text} />}
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─── Helpers produit ────────────────────────────────────────────────────────
// ─── Barre de chargement (remplace les spinners circulaires) ────────────────
// Progression SIMULÉE asymptotique (avance vite puis ralentit, plafonne à
// 96 %) : agréable et honnête pour les générations sans progression réelle.
export function LoadingBar({ label = '', expectedMs = 20000, className = '' }) {
  const [p, setP] = useState(4);
  useEffect(() => {
    const step = Math.max(150, expectedMs / 60);
    const t = setInterval(() => setP((v) => v + (93 - v) * 0.06), step);
    return () => clearInterval(t);
  }, [expectedMs]);
  return (
    <div className={`w-full ${className}`}>
      {label && <p className="text-[11px] font-medium text-muted-foreground mb-1">{label}</p>}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${Math.min(96, p)}%` }} />
      </div>
    </div>
  );
}

export function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&rsquo;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Télécharge une image distante et la convertit en File (pour réutiliser le flux d'upload). */
export async function urlToFile(url, filename = 'produit.png') {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error('fetch failed');
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

// ─── Barre « importer un produit » (bouton ↔ chip produit importé) ──────────
export function ImportProductBar({ product, onImport, onClear, accent = ACCENTS.image }) {
  if (product) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 p-2.5">
        {product.imageUrl
          ? <img src={product.imageUrl} alt="" className="w-11 h-11 rounded-xl object-cover border border-border shrink-0" />
          : <div className="w-11 h-11 rounded-xl bg-card border border-border flex items-center justify-center shrink-0"><Package size={16} className="text-gray-300" /></div>}
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">{tp('Produit importé')}</p>
          <p className="text-[13px] font-semibold text-foreground truncate">{product.name}</p>
        </div>
        <button onClick={onImport} className="text-[12px] font-medium text-muted-foreground hover:text-foreground px-1.5 shrink-0">{tp('Changer')}</button>
        <button onClick={onClear} className="w-7 h-7 rounded-lg hover:bg-gray-200 flex items-center justify-center text-muted-foreground shrink-0"><X size={14} /></button>
      </div>
    );
  }
  return (
    <button type="button" onClick={onImport}
      className="w-full h-11 rounded-xl border-2 border-dashed border-border hover:border-gray-300 hover:bg-background flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors">
      <Store size={15} className={accent.text} /> {tp('Importer un produit de ma boutique')}
    </button>
  );
}
