import React, { useEffect, useState, useRef } from 'react';
import { ArrowUpDown, Plus, Trash2, Edit3, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, CheckSquare, X, Tag, Zap, AlertTriangle, GripVertical, Check, Package, Palette, Sparkles, Image as ImageIcon } from 'lucide-react';
import { storeProductsApi } from '../services/storeApi.js';
import { tp } from '../i18n/platform.js';

// ── Tab IDs ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'upsells', label: '1-Click Upsells', icon: ArrowUpDown, get desc() { return tp('Offres séquentielles avant/après achat'); } },
  { id: 'bump', label: 'Order Bump', icon: CheckSquare, get desc() { return tp('Case à cocher au checkout'); } },
  { id: 'exit', get label() { return tp('Offres supplémentaires'); }, icon: AlertTriangle, desc: 'Pop-up de sortie formulaire' },
];

// ── Shared helpers ─────────────────────────────────────────────────────────
const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)} className="flex-shrink-0">
    {on
      ? <ToggleRight className="w-9 h-9 text-green-600" strokeWidth={1.5} />
      : <ToggleLeft className="w-9 h-9 text-gray-300" strokeWidth={1.5} />}
  </button>
);

const Badge = ({ children, color = 'gray' }) => {
  const cls = {
    green: 'bg-green-50 text-green-700 border-green-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    red: 'bg-red-50 text-red-600 border-red-100',
  }[color] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${cls}`}>{children}</span>
  );
};

const EmptyState = ({ icon: Icon, title, subtitle, cta, onCta }) => (
  <div className="bg-white rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center">
    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
      <Icon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
    </div>
    <p className="text-sm font-semibold text-gray-800 mb-1">{title}</p>
    <p className="text-xs text-gray-400 mb-5">{subtitle}</p>
    {cta && (
      <button
        onClick={onCta}
        className="inline-flex items-center gap-2 h-9 px-4 bg-gray-900 text-white rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors mx-auto"
      >
        <Plus className="w-3.5 h-3.5" /> {cta}
      </button>
    )}
  </div>
);

const FormField = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
    {hint && <p className="text-[10px] text-gray-400 mb-1.5">{hint}</p>}
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input
    className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all bg-white placeholder:text-gray-400"
    {...props}
  />
);

const Textarea = ({ ...props }) => (
  <textarea
    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 transition-all bg-white placeholder:text-gray-400 resize-none"
    rows={3}
    {...props}
  />
);

const DiscountTypeSelector = ({ value, onChange }) => (
  <div className="flex gap-2">
    {[
      { id: 'percent', label: '% Remise' },
      { id: 'fixed', label: 'Montant fixe' },
      { id: 'free', label: 'Gratuit' },
    ].map(t => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={`flex-1 h-9 rounded-xl text-xs font-medium border transition-all ${
          value === t.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

const readProducts = (response) => {
  const raw = response?.data?.data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.products)) return raw.products;
  return [];
};

const getProductId = (product) => product?._id || product?.id || '';
const getProductName = (product) => product?.name || product?.title || 'Produit sans nom';

const normalizeUpsellOffer = (offer) => ({
  id: offer.id,
  targetProductId: offer.targetProductId,
  targetProductName: offer.targetProductName,
  targetProductIds: offer.targetProductIds || [],
  targetAllProducts: !!offer.targetAllProducts,
  title: offer.title,
  productName: offer.productName,
  upsellProductIds: offer.upsellProductIds || [],
  style: offer.style || {},
  originalPrice: offer.originalPrice,
  offerPrice: offer.offerPrice,
  discountType: offer.discountType,
  discountValue: offer.discountValue,
  description: offer.description,
  isActive: offer.isActive,
});

const normalizeExitOffer = (offer) => ({
  id: offer.id,
  targetProductId: offer.targetProductId,
  targetProductName: offer.targetProductName,
  targetProductIds: offer.targetProductIds || [],
  targetAllProducts: !!offer.targetAllProducts,
  title: offer.title,
  desc: offer.desc,
  discountType: offer.discountType,
  discountValue: offer.discountValue,
  couponCode: offer.couponCode,
  style: offer.style || {},
  triggerDelay: offer.triggerDelay,
  trigger: offer.trigger || 'both',
  isActive: offer.isActive,
});

const ProductMultiTargetSelector = ({ all, ids, onChange, products, loading, error }) => {
  const selectedIds = Array.isArray(ids) ? ids : [];
  const toggleAll = () => onChange({ targetAllProducts: !all, targetProductIds: [] });
  const toggleOne = (pid) => {
    const set = new Set(selectedIds);
    if (set.has(pid)) set.delete(pid); else set.add(pid);
    onChange({ targetAllProducts: false, targetProductIds: [...set] });
  };
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50 transition">
        <input type="checkbox" checked={!!all} onChange={toggleAll} className="w-4 h-4 rounded border-gray-300 text-green-600" />
        <span className="text-sm font-medium text-gray-800">{tp('Tous les produits')}</span>
      </label>
      {!all && (
        <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 p-1">
          {loading ? (
            <p className="text-xs text-gray-400 px-2 py-2">{tp('Chargement des produits...')}</p>
          ) : products.length === 0 ? (
            <p className="text-[10px] text-red-500 px-2 py-2">{error || 'Aucun produit disponible. Créez un produit avant de configurer cette offre.'}</p>
          ) : products.map(product => {
            const pid = getProductId(product);
            return (
              <label key={pid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selectedIds.includes(pid)} onChange={() => toggleOne(pid)} className="w-4 h-4 rounded border-gray-300 text-green-600" />
                <span className="text-sm text-gray-700 truncate">{getProductName(product)}</span>
              </label>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs text-green-800">
        <Package size={13} />
        <span className="font-medium">
          {all ? "S'applique à tous les produits" : selectedIds.length ? `S'applique à ${selectedIds.length} produit(s)` : 'Aucun produit sélectionné'}
        </span>
      </div>
    </div>
  );
};

// ── Sélecteur de produits VENDUS par l'offre (ajoutés à la commande) ────────
const SellProductsPicker = ({ ids, onChange, products, loading }) => {
  const selected = Array.isArray(ids) ? ids : [];
  const toggle = (pid) => {
    const set = new Set(selected);
    if (set.has(pid)) set.delete(pid); else set.add(pid);
    onChange([...set]);
  };
  return (
    <div className="space-y-1.5">
      <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 p-1">
        {loading ? (
          <p className="text-xs text-gray-400 px-2 py-2">Chargement des produits…</p>
        ) : products.length === 0 ? (
          <p className="text-[10px] text-red-500 px-2 py-2">Aucun produit disponible.</p>
        ) : products.map((product) => {
          const pid = getProductId(product);
          return (
            <label key={pid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.includes(pid)} onChange={() => toggle(pid)} className="w-4 h-4 rounded border-gray-300 text-green-600" />
              <span className="text-sm text-gray-700 truncate">{getProductName(product)}</span>
            </label>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400">{selected.length ? `${selected.length} produit(s) seront ajoutés à la commande` : 'Aucun produit — une ligne « offre » sera créée avec le prix ci-dessus.'}</p>
    </div>
  );
};

// ── Style par offre (couleurs + mise en forme) ──────────────────────────────
const OFFER_STYLE = { accentColor: '', bgColor: '', textColor: '', bold: true, size: 'md', align: 'left', image: '' };
const OFFER_SIZE_PX = { sm: 12, md: 13.5, lg: 16 };
const withStyle = (st) => ({ ...OFFER_STYLE, ...(st || {}) });

const SwatchField = ({ label, value, fallback, onChange }) => (
  <div className="flex flex-col items-center gap-1 rounded-lg border border-gray-200 p-2">
    <input type="color" value={value || fallback} onChange={(e) => onChange(e.target.value)} className="w-full h-8 rounded-md border border-gray-200 cursor-pointer p-0 bg-white" aria-label={label} />
    <span className="text-[10px] font-medium text-gray-600">{label}</span>
    {value
      ? <button type="button" onClick={() => onChange('')} className="text-[9px] text-gray-400 hover:text-gray-600 underline">réinit.</button>
      : <span className="text-[9px] text-gray-300">auto</span>}
  </div>
);

const SegControl = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
    {options.map((o) => (
      <button key={o.value} type="button" onClick={() => onChange(o.value)} className={`px-2.5 py-1 text-xs transition-colors ${value === o.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{o.label}</button>
    ))}
  </div>
);

const ImageField = ({ value, onChange }) => {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const res = await storeProductsApi.uploadImages([file]);
      const data = res?.data?.data;
      const url = Array.isArray(data) && data.length ? (data[0].url || data[0]) : '';
      if (url) onChange(url);
    } catch {
      // silencieux
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      {value ? (
        <div className="flex items-center gap-3">
          <img src={value} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0" />
          <div className="flex flex-col gap-1 items-start">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="text-xs text-gray-600 hover:text-gray-900 underline disabled:opacity-60">{busy ? 'Téléversement…' : 'Remplacer'}</button>
            <button type="button" onClick={() => onChange('')} className="text-xs text-red-500 hover:text-red-600 underline">Retirer</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="w-full h-10 rounded-lg border border-dashed border-gray-300 text-xs text-gray-500 flex items-center justify-center gap-1.5 hover:bg-gray-50 disabled:opacity-60 transition-colors">
          {busy ? 'Téléversement…' : <><ImageIcon size={14} /> Ajouter une image</>}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  );
};

const AppearanceControls = ({ value, onChange }) => {
  const st = withStyle(value);
  const upd = (patch) => onChange({ ...st, ...patch });
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-3.5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Palette size={15} className="text-gray-500" /> Design de l'offre</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-3.5 space-y-4 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Couleurs</p>
            <div className="grid grid-cols-3 gap-2">
              <SwatchField label="Bouton" value={st.accentColor} fallback="#16a34a" onChange={(v) => upd({ accentColor: v })} />
              <SwatchField label="Fond" value={st.bgColor} fallback="#ffffff" onChange={(v) => upd({ bgColor: v })} />
              <SwatchField label="Texte" value={st.textColor} fallback="#111827" onChange={(v) => upd({ textColor: v })} />
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Image</p>
            <ImageField value={st.image} onChange={(v) => upd({ image: v })} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Mise en forme</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600">Titre en gras</span>
                <Toggle on={st.bold} onChange={(v) => upd({ bold: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600">Taille du texte</span>
                <SegControl options={[{ value: 'sm', label: 'Petit' }, { value: 'md', label: 'Normal' }, { value: 'lg', label: 'Grand' }]} value={st.size} onChange={(v) => upd({ size: v })} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-600">Alignement</span>
                <SegControl options={[{ value: 'left', label: 'Gauche' }, { value: 'center', label: 'Centre' }]} value={st.align} onChange={(v) => upd({ align: v })} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Questions IA avant génération ───────────────────────────────────────────
const AI_BRIEF_DEFAULT = { angle: 'complement', discount: 'medium', goal: 'margin', tone: 'premium', highlight: '', note: '' };
const AiBriefPanel = ({ loading, onSubmit, onCancel }) => {
  const [brief, setBrief] = useState(AI_BRIEF_DEFAULT);
  const upd = (patch) => setBrief((b) => ({ ...b, ...patch }));
  const Chips = ({ label, value, onChange, options }) => (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${value === o.value ? 'border-indigo-400 bg-indigo-100 text-indigo-700 font-medium' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{o.label}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 space-y-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-indigo-800"><Sparkles size={15} /> Quelques questions pour l'IA</p>
      <Chips label="Type d'offre" value={brief.angle} onChange={(v) => upd({ angle: v })} options={[{ value: 'complement', label: 'Complément' }, { value: 'bundle', label: 'Lot / Bundle' }, { value: 'bonus', label: 'Bonus offert' }, { value: 'upgrade', label: 'Montée en gamme' }]} />
      <Chips label="Remise" value={brief.discount} onChange={(v) => upd({ discount: v })} options={[{ value: 'light', label: 'Légère' }, { value: 'medium', label: 'Moyenne' }, { value: 'strong', label: 'Forte' }]} />
      <Chips label="Objectif" value={brief.goal} onChange={(v) => upd({ goal: v })} options={[{ value: 'margin', label: 'Marge' }, { value: 'volume', label: 'Volume' }, { value: 'destock', label: 'Déstockage' }]} />
      <Chips label="Ton" value={brief.tone} onChange={(v) => upd({ tone: v })} options={[{ value: 'premium', label: 'Premium' }, { value: 'urgent', label: 'Urgent' }, { value: 'friendly', label: 'Amical' }]} />
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">À mettre en avant</p>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {['La remise', 'Le cadeau offert', 'Stock limité', 'Qualité premium', 'Un bénéfice précis'].map((h) => (
            <button key={h} type="button" onClick={() => upd({ highlight: h })} className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${brief.highlight === h ? 'border-indigo-400 bg-indigo-100 text-indigo-700 font-medium' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{h}</button>
          ))}
        </div>
        <Input value={brief.highlight} onChange={(e) => upd({ highlight: e.target.value })} placeholder="Ex: livraison offerte, résultats en 14 jours, 2 pour le prix d'1…" />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-600 mb-1.5">Précision (optionnel)</p>
        <Input value={brief.note} onChange={(e) => upd({ note: e.target.value })} placeholder="Ex: un pack de 2, un accessoire précis…" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 h-9 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium hover:bg-gray-50 transition-colors">Annuler</button>
        <button type="button" onClick={() => onSubmit(brief)} disabled={loading} className="flex-1 h-9 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-1.5 transition-colors">{loading ? 'Génération…' : <><Sparkles size={14} /> Générer l'offre</>}</button>
      </div>
    </div>
  );
};

// ── Aperçus client (rendus tels qu'affichés au checkout) ────────────────────
const moneyFCFA = (n) => (n === '' || n === null || n === undefined || isNaN(Number(n))) ? '' : `${Number(n).toLocaleString('fr-FR')} FCFA`;

const UpsellPreview = ({ form }) => {
  const st = withStyle(form.style);
  const accent = st.accentColor || '#16a34a';
  const bg = st.bgColor || '#ffffff';
  const text = st.textColor || '#111827';
  const fs = OFFER_SIZE_PX[st.size] || 13.5;
  const badge = form.discountType === 'percent' && form.discountValue ? `-${form.discountValue}%`
    : form.discountType === 'fixed' && form.discountValue ? `-${moneyFCFA(form.discountValue)}`
    : form.discountType === 'free' ? 'Offert' : '';
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Aperçu client</p>
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm" style={{ backgroundColor: bg }}>
        <div className="px-4 py-2.5 text-center" style={{ backgroundColor: accent }}>
          <p className="text-[11px] font-semibold text-white uppercase tracking-wide">Offre unique — maintenant ou jamais</p>
        </div>
        <div className="p-4 space-y-3" style={{ textAlign: st.align }}>
          <div className="flex items-start gap-3 text-left">
            {st.image
              ? <img src={st.image} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-200" />
              : <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-300"><Package size={22} /></div>}
            <div className="min-w-0 flex-1">
              <p className="leading-tight" style={{ color: text, fontWeight: st.bold ? 700 : 500, fontSize: fs + 1 }}>{form.title || "Titre de votre offre"}</p>
              {form.productName && <p className="text-xs text-gray-500 mt-0.5">{form.productName}</p>}
            </div>
            {badge && <span className="shrink-0 rounded-full text-[11px] font-bold px-2 py-1" style={{ backgroundColor: `${accent}1A`, color: accent }}>{badge}</span>}
          </div>
          {form.description && <p className="leading-relaxed" style={{ color: text, opacity: 0.78, fontSize: fs - 1 }}>{form.description}</p>}
          <div className="flex items-end gap-2" style={{ justifyContent: st.align === 'center' ? 'center' : 'flex-start' }}>
            <span className="font-bold" style={{ color: accent, fontSize: fs + 6 }}>{moneyFCFA(form.offerPrice) || '—'}</span>
            {form.originalPrice && <span className="text-sm text-gray-400 line-through mb-0.5">{moneyFCFA(form.originalPrice)}</span>}
          </div>
          <button type="button" className="w-full h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: accent }}><Check size={15} /> Oui, ajouter à ma commande</button>
          <p className="text-center text-xs text-gray-400 underline">Non merci, je passe cette offre</p>
        </div>
      </div>
    </div>
  );
};

const ExitPreview = ({ form }) => {
  const st = withStyle(form.style);
  const accent = st.accentColor || '#16a34a';
  const bg = st.bgColor || '#ffffff';
  const text = st.textColor || '#111827';
  const fs = OFFER_SIZE_PX[st.size] || 13.5;
  const val = form.discountType === 'percent' ? (form.discountValue ? `${form.discountValue}% de remise` : '')
    : form.discountType === 'fixed' ? (form.discountValue ? `${moneyFCFA(form.discountValue)} offerts` : '')
    : 'Cadeau offert';
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Aperçu client</p>
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm" style={{ backgroundColor: bg }}>
        <div className="relative px-4 py-6 text-center" style={{ backgroundColor: '#111827' }}>
          <span className="absolute right-3 top-2 text-gray-500 text-lg leading-none">×</span>
          <p className="leading-tight text-white" style={{ fontWeight: st.bold ? 700 : 500, fontSize: fs + 3 }}>{form.title || "Attendez ! Une dernière offre…"}</p>
        </div>
        <div className="p-4 space-y-3" style={{ textAlign: st.align === 'left' ? 'left' : 'center' }}>
          {st.image && <img src={st.image} alt="" className="w-full h-28 object-cover rounded-xl" />}
          {form.desc && <p className="leading-relaxed" style={{ color: text, opacity: 0.78, fontSize: fs - 1 }}>{form.desc}</p>}
          {val && <div className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-bold text-sm" style={{ backgroundColor: `${accent}14`, color: accent }}><Tag size={14} /> {val}</div>}
          {form.couponCode && <div className="mx-auto w-fit rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-1.5 font-mono text-sm text-gray-700">{form.couponCode}</div>}
          <button type="button" className="w-full h-10 rounded-xl text-white text-sm font-semibold" style={{ backgroundColor: accent }}>J'en profite</button>
          <p className="text-[10px] text-gray-400">S'affiche après {form.triggerDelay || '3'}s d'inactivité</p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab 1 — 1-Click Upsells
// ═══════════════════════════════════════════════════════════════════════════
const BLANK_UPSELL = { id: null, targetProductId: '', targetProductName: '', targetProductIds: [], targetAllProducts: false, title: '', productName: '', originalPrice: '', offerPrice: '', discountType: 'percent', discountValue: '', description: '', isActive: true, upsellProductIds: [], style: { ...OFFER_STYLE } };

const UpsellsTab = ({ products, loadingProducts, productError, saveProductUpsells }) => {
  const [offers, setOffers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_UPSELL);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (loadingProducts || loaded) return;
    const allProductIds = products.map(getProductId).filter(Boolean);
    const byId = new Map();
    for (const product of products) {
      const pid = getProductId(product);
      const offersOnProduct = product?.productPageConfig?.upsells?.offers || [];
      for (const offer of offersOnProduct) {
        const key = String(offer.id || `${pid}-${offer.title || ''}`);
        if (!byId.has(key)) byId.set(key, { ...offer, id: key, targetProductIds: [] });
        const agg = byId.get(key);
        if (!agg.targetProductIds.includes(pid)) agg.targetProductIds.push(pid);
      }
    }
    const logical = [...byId.values()].map(o => {
      const ids = o.targetProductIds || [];
      const isAll = Boolean(o.targetAllProducts) || (allProductIds.length > 0 && ids.length >= allProductIds.length);
      return { ...o, targetProductIds: ids, targetAllProducts: isAll };
    });
    setOffers(logical);
    setLoaded(true);
  }, [products, loadingProducts, loaded]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...BLANK_UPSELL, id: Date.now() });
    setFormError('');
    setShowModal(true);
  };
  const openEdit = (o) => { setEditing(o.id); setForm({ ...o }); setFormError(''); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const productIdsOf = (offer) => (offer?.targetAllProducts
    ? products.map(getProductId).filter(Boolean)
    : (offer?.targetProductIds || []).filter(Boolean));

  const offersForProduct = (productId, allOffers) =>
    allOffers.filter(o => o.targetAllProducts || (o.targetProductIds || []).includes(productId)).slice(0, 5);

  const syncProducts = async (productIds, allOffers) => {
    const uniq = [...new Set((productIds || []).filter(Boolean))];
    await Promise.all(uniq.map(pid =>
      Promise.resolve(saveProductUpsells(pid, (upsells = {}) => ({
        ...upsells,
        offers: offersForProduct(pid, allOffers).map(normalizeUpsellOffer),
      }))).catch(() => {})
    ));
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (!form.targetAllProducts && !(form.targetProductIds?.length)) {
      setFormError('Choisissez au moins un produit (ou « Tous les produits »).');
      return;
    }
    setFormError('');
    const previous = offers.find(o => o.id === editing);
    const nextOffers = editing
      ? offers.map(o => o.id === editing ? { ...form } : o)
      : [...offers, { ...form }];
    const affected = new Set(productIdsOf(form));
    if (previous) productIdsOf(previous).forEach(pid => affected.add(pid));
    // Optimiste : on ferme tout de suite, l'écriture se fait en arrière-plan
    setOffers(nextOffers);
    closeModal();
    syncProducts([...affected], nextOffers).catch(() => {});
  };

  const remove = async (id) => {
    const removed = offers.find(o => o.id === id);
    const nextOffers = offers.filter(o => o.id !== id);
    setOffers(nextOffers);
    if (removed) await syncProducts(productIdsOf(removed), nextOffers);
  };

  const toggle = async (id) => {
    const nextOffers = offers.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o);
    const changed = nextOffers.find(o => o.id === id);
    setOffers(nextOffers);
    if (changed) await syncProducts(productIdsOf(changed), nextOffers);
  };

  const move = async (id, dir) => {
    const idx = offers.findIndex(o => o.id === id);
    const next = idx + dir;
    if (next < 0 || next >= offers.length) return;
    const arr = [...offers];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setOffers(arr);
    const affected = new Set([...productIdsOf(arr[idx]), ...productIdsOf(arr[next])]);
    await syncProducts([...affected], arr);
  };

  const generateWithAI = async (brief = {}) => {
    const pid = form.targetAllProducts
      ? (products[0] && getProductId(products[0]))
      : (form.targetProductIds || [])[0];
    if (!pid) { setFormError("Choisissez d'abord un produit pour générer l'offre."); return; }
    setAiLoading(true);
    setFormError('');
    try {
      const res = await storeProductsApi.generateUpsellOffer({ productId: pid, kind: 'upsell', brief });
      const o = res?.data?.data?.offer;
      setAiOpen(false);
      if (o) {
        setForm(f => ({
          ...f,
          title: o.title || f.title,
          productName: o.productName || f.productName,
          description: o.description || f.description,
          originalPrice: o.originalPrice !== '' && o.originalPrice != null ? String(o.originalPrice) : f.originalPrice,
          offerPrice: o.offerPrice !== '' && o.offerPrice != null ? String(o.offerPrice) : f.offerPrice,
          discountType: o.discountType || f.discountType,
          discountValue: o.discountValue !== '' && o.discountValue != null ? String(o.discountValue) : f.discountValue,
        }));
      }
    } catch (e) {
      setFormError(e?.response?.data?.message || "Échec de la génération IA. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  };

  const fmt = (n) => n ? `${Number(n).toLocaleString('fr-FR')} FCFA` : '—';

  return (
    <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
      {/* Aperçu client — toujours à gauche */}
      <div className="order-first lg:sticky lg:top-0 self-start space-y-3">
        <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 p-3 sm:p-4 shadow-sm">
          <UpsellPreview form={form} />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">{showModal ? "L'aperçu se met à jour pendant que vous éditez." : "Cliquez sur « Ajouter une offre » ou l'icône crayon pour éditer — l'aperçu s'affiche ici."}</p>
      </div>

      {/* Contenu — à droite */}
      <div className="space-y-5">
      {/* Info banner */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
          <Zap size={14} className="text-gray-600" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800 mb-0.5">{tp('Comment ça marche')}</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Jusqu'à <strong>{tp('5 offres')}</strong> affichées en séquence. Le client accepte ou refuse — l'offre suivante apparaît. Glissez pour réordonner.
          </p>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">{offers.length} offre(s)</span>
          <Badge color="gray">{tp('Max 5 par produit')}</Badge>
        </div>
        <button
          onClick={openNew}
          className="h-9 px-3.5 bg-gray-900 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
        >
          <Plus size={13} /> Ajouter une offre
        </button>
      </div>

      {/* Panneau d'édition inline OU liste */}
      {showModal ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{editing ? "Modifier l'offre" : tp('Nouvelle offre')}</p>
            <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={16} /></button>
          </div>
          <FormField label="Titre de l'offre *">
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={tp('Ex: Protection expédition')} />
          </FormField>
          <FormField label="Produits concernés *" hint="L'upsell s'affichera au checkout de chaque produit ciblé (ou de tous).">
            <ProductMultiTargetSelector
              all={form.targetAllProducts}
              ids={form.targetProductIds}
              onChange={(selection) => setForm(f => ({ ...f, ...selection }))}
              products={products}
              loading={loadingProducts}
              error={productError}
            />
          </FormField>
          {aiOpen ? (
            <AiBriefPanel loading={aiLoading} onCancel={() => setAiOpen(false)} onSubmit={(brief) => generateWithAI(brief)} />
          ) : (
            <button type="button" onClick={() => setAiOpen(true)} className="w-full h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
              <Sparkles size={15} /> Générer l'offre avec l'IA
            </button>
          )}
          <FormField label="Nom du produit">
            <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder={tp('Ex: Pack Protection Premium')} />
          </FormField>
          <FormField label="Produit(s) vendu(s) via cette offre" hint="Ajoutés à la commande créée quand le client accepte l'offre.">
            <SellProductsPicker ids={form.upsellProductIds} onChange={(ids) => setForm(f => {
              const names = ids.map((id) => { const pr = products.find((p) => getProductId(p) === id); return pr ? getProductName(pr) : ''; }).filter(Boolean);
              return { ...f, upsellProductIds: ids, productName: names.length ? names.join(' + ') : f.productName };
            })} products={products} loading={loadingProducts} />
          </FormField>
          <FormField label="Description">
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={tp('Pourquoi le client devrait accepter cette offre…')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prix original (FCFA)">
              <Input type="number" value={form.originalPrice} onChange={e => setForm(f => ({ ...f, originalPrice: e.target.value }))} placeholder="3000" />
            </FormField>
            <FormField label="Prix offert (FCFA)">
              <Input type="number" value={form.offerPrice} onChange={e => setForm(f => ({ ...f, offerPrice: e.target.value }))} placeholder="1500" />
            </FormField>
          </div>
          <FormField label="Type de réduction">
            <DiscountTypeSelector value={form.discountType} onChange={v => setForm(f => ({ ...f, discountType: v }))} />
          </FormField>
          {form.discountType !== 'free' && (
            <FormField label={form.discountType === 'percent' ? 'Pourcentage de remise' : tp('Montant de la remise (FCFA)')}>
              <Input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === 'percent' ? '30' : '1000'} />
            </FormField>
          )}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-700">{tp('Activer cette offre')}</span>
            <Toggle on={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
          <AppearanceControls value={form.style} onChange={(st) => setForm(f => ({ ...f, style: st }))} />
          {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={closeModal} className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-2xl text-sm font-medium hover:bg-gray-200 transition-colors">{tp('Annuler')}</button>
            <button onClick={save} disabled={saving} className="flex-1 h-11 bg-green-600 text-white rounded-2xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">{saving ? 'Enregistrement...' : editing ? 'Enregistrer' : "Créer l'offre"}</button>
          </div>
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title={tp('Aucune offre configurée')}
          subtitle="Créez jusqu'à 5 upsells séquentiels pour maximiser la valeur de chaque commande."
          cta="Créer une offre"
          onCta={openNew}
        />
      ) : (
        <div className="space-y-3">
          {offers.map((o, i) => (
            <div key={o.id} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${!o.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 p-4">
                {/* Drag handle + order */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button onClick={() => move(o.id, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-0 transition-colors">
                    <ChevronUp size={14} />
                  </button>
                  <span className="text-[10px] font-bold text-gray-400 w-4 text-center">{i + 1}</span>
                  <button onClick={() => move(o.id, 1)} disabled={i === offers.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-0 transition-colors">
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
                  <ArrowUpDown size={16} className="text-white" strokeWidth={1.75} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.title}</p>
                    <Badge color={o.isActive ? 'green' : 'gray'}>{o.isActive ? 'Actif' : tp('Inactif')}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><Package size={10} /> {o.targetAllProducts ? tp('Tous les produits') : `${(o.targetProductIds || []).length} produit(s)`}</span>
                    <span className="text-gray-300">·</span>
                    <span>{o.productName || '—'}</span>
                    <span className="text-gray-300">·</span>
                    <span className="font-medium text-green-700">{fmt(o.offerPrice)}</span>
                    {o.originalPrice && <span className="line-through text-gray-400">{fmt(o.originalPrice)}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Toggle on={o.isActive} onChange={() => toggle(o.id)} />
                  <button onClick={() => openEdit(o)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => remove(o.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {o.description && (
                <div className="px-4 pb-3 border-t border-gray-50 pt-2">
                  <p className="text-xs text-gray-500 line-clamp-1">{o.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab 2 — Order Bump (1-Tick)
// ═══════════════════════════════════════════════════════════════════════════
const BUMP_PRESETS = [
  { id: 'shipping', get label() { return tp('Protection expédition'); }, get desc() { return tp('Protège contre perte ou dommage'); } },
  { id: 'priority', label: 'Traitement prioritaire', get desc() { return tp('Traitement de la commande en priorité'); } },
  { id: 'warranty', label: 'Extension de garantie', get desc() { return tp('Prolonger la garantie à 2 ans'); } },
  { id: 'gift', label: 'Emballage cadeau', desc: 'Emballage premium avec message' },
  { id: 'custom', get label() { return tp('Personnalisé'); }, get desc() { return tp('Définir votre propre offre'); } },
];

const BLANK_BUMP = { preset: 'shipping', targetProductId: '', targetProductName: '', targetProductIds: [], targetAllProducts: false, title: '', desc: '', price: '', isActive: false, upsellProductIds: [], style: { ...OFFER_STYLE } };

const OrderBumpTab = ({ products, loadingProducts, productError, saveProductUpsells }) => {
  const [bump, setBump] = useState(BLANK_BUMP);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (loadingProducts || loaded) return;
    const allIds = products.map(getProductId).filter(Boolean);
    let base = null;
    const holders = [];
    for (const product of products) {
      const bumpData = product?.productPageConfig?.upsells?.bump;
      if (bumpData && bumpData.title) {
        if (!base) base = bumpData;
        holders.push(getProductId(product));
      }
    }
    if (base) {
      const storedIds = Array.isArray(base.targetProductIds) ? base.targetProductIds.filter(Boolean) : [];
      const ids = storedIds.length ? storedIds : holders;
      const isAll = Boolean(base.targetAllProducts) || (allIds.length > 0 && ids.length >= allIds.length);
      setBump({ ...BLANK_BUMP, ...base, targetProductIds: ids, targetAllProducts: isAll });
    }
    setLoaded(true);
  }, [products, loadingProducts, loaded]);

  const generateBumpWithAI = async (brief = {}) => {
    const pid = bump.targetAllProducts
      ? (products[0] && getProductId(products[0]))
      : (bump.targetProductIds || [])[0];
    if (!pid) { setFormError("Choisissez d'abord un produit pour générer l'offre."); return; }
    setAiLoading(true);
    setFormError('');
    try {
      const res = await storeProductsApi.generateUpsellOffer({ productId: pid, kind: 'bump', brief });
      const o = res?.data?.data?.offer;
      setAiOpen(false);
      if (o) {
        setBump(b => ({
          ...b,
          title: o.title || b.title,
          desc: o.description || b.desc,
          price: (o.offerPrice !== '' && o.offerPrice != null) ? String(o.offerPrice) : b.price,
        }));
      }
    } catch (e) {
      setFormError(e?.response?.data?.message || "Échec de la génération IA. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  };

  const preset = BUMP_PRESETS.find(p => p.id === bump.preset);

  const selectPreset = (p) => {
    if (p.id === 'custom') {
      setBump(b => ({ ...b, preset: 'custom' }));
    } else {
      setBump(b => ({ ...b, preset: p.id, title: p.label, desc: p.desc }));
    }
  };

  const save = () => {
    if (!bump.targetAllProducts && !(bump.targetProductIds?.length)) {
      setFormError('Choisissez au moins un produit (ou « Tous les produits »).');
      return;
    }
    setFormError('');
    const allIds = products.map(getProductId).filter(Boolean);
    const targeted = bump.targetAllProducts ? allIds : (bump.targetProductIds || []).filter(Boolean);
    const previouslyTargeted = products
      .filter(pr => pr?.productPageConfig?.upsells?.bump?.title)
      .map(getProductId);
    const payload = { ...bump, targetProductIds: targeted, targetProductId: '', targetProductName: '' };
    // Optimiste : feedback immédiat, écriture en arrière-plan
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    (async () => {
      await Promise.all(targeted.map(pid =>
        Promise.resolve(saveProductUpsells(pid, (upsells = {}) => ({ ...upsells, bump: { ...payload } }))).catch(() => {})
      ));
      const toClear = previouslyTargeted.filter(pid => !targeted.includes(pid));
      await Promise.all(toClear.map(pid =>
        Promise.resolve(saveProductUpsells(pid, (upsells = {}) => ({ ...upsells, bump: null }))).catch(() => {})
      ));
    })();
  };

  const bumpStyle = withStyle(bump.style);
  const bumpAccent = bumpStyle.accentColor || '#16a34a';
  const bumpText = bumpStyle.textColor || '#111827';
  return (
    <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
      {/* Aperçu client — toujours visible, à gauche */}
      <div className="order-first lg:sticky lg:top-0 self-start space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Aperçu client</p>
        <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 p-3 sm:p-4 shadow-sm">
          {(bump.targetAllProducts || bump.targetProductIds?.length > 0) && (
            <p className="mb-3 inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
              <Package size={11} /> {bump.targetAllProducts ? tp('Tous les produits') : `${bump.targetProductIds.length} produit(s)`}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mb-2">Dans le formulaire de commande :</p>
          <div className="border-2 rounded-xl p-4 transition-colors" style={{ borderColor: bump.isActive ? bumpAccent : '#e5e7eb', borderStyle: bump.isActive ? 'solid' : 'dashed', backgroundColor: bump.isActive ? (bumpStyle.bgColor || `${bumpAccent}0D`) : '#ffffff' }}>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 shrink-0" style={{ borderColor: bumpAccent, backgroundColor: bumpAccent }}>
                <Check size={11} className="text-white" strokeWidth={3} />
              </div>
              {bumpStyle.image && <img src={bumpStyle.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-gray-200" />}
              <div className="min-w-0">
                <p style={{ color: bumpText, fontWeight: bumpStyle.bold ? 700 : 500, fontSize: OFFER_SIZE_PX[bumpStyle.size] || 13.5 }}>{bump.title || 'Titre de votre option'} {bump.price ? <span style={{ color: bumpAccent, fontWeight: 700 }}>+{Number(bump.price).toLocaleString('fr-FR')} FCFA</span> : null}</p>
                {bump.desc ? <p className="text-xs text-gray-500 mt-0.5">{bump.desc}</p> : <p className="text-xs text-gray-400 mt-0.5">Texte affiché à côté de la case…</p>}
              </div>
            </div>
          </div>
          {!bump.isActive && <p className="mt-2 text-[10px] text-amber-600">Désactivé — activez le Order Bump pour l'afficher au checkout.</p>}
        </div>
      </div>

      {/* Formulaire — à droite */}
      <div className="space-y-5">
      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
          <CheckSquare size={14} className="text-gray-600" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800 mb-0.5">{tp('1-Tick Upsell')}</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Une case à cocher affichée dans le formulaire. Le client ajoute l'option d'un seul clic — idéal pour des petits suppléments à haute valeur perçue.
          </p>
        </div>
      </div>

      {/* Activation toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">{tp('Activer le Order Bump')}</p>
          <p className="text-xs text-gray-400 mt-0.5">{tp('Afficher la case à cocher sur le formulaire de commande')}</p>
        </div>
        <Toggle on={bump.isActive} onChange={v => setBump(b => ({ ...b, isActive: v }))} />
      </div>

      {/* Preset selector */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{tp('Type d\'offre')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUMP_PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => selectPreset(p)}
              className={`text-left px-3 py-3 rounded-xl border-2 transition-all ${
                bump.preset === p.id ? 'border-green-600 bg-green-50' : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <p className={`text-xs font-semibold leading-tight ${bump.preset === p.id ? 'text-green-800' : 'text-gray-700'}`}>{p.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{tp('Configuration')}</p>
        <div className="space-y-3">
          <FormField label="Produits concernés *" hint="La case Order Bump sera visible dans le checkout de chaque produit ciblé (ou de tous).">
            <ProductMultiTargetSelector
              all={bump.targetAllProducts}
              ids={bump.targetProductIds}
              onChange={(selection) => setBump(b => ({ ...b, ...selection }))}
              products={products}
              loading={loadingProducts}
              error={productError}
            />
          </FormField>
          {aiOpen ? (
            <AiBriefPanel loading={aiLoading} onCancel={() => setAiOpen(false)} onSubmit={(brief) => generateBumpWithAI(brief)} />
          ) : (
            <button type="button" onClick={() => setAiOpen(true)} className="w-full h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
              <Sparkles size={15} /> Générer avec l'IA
            </button>
          )}
          <FormField label="Titre affiché *">
            <Input value={bump.title} onChange={e => setBump(b => ({ ...b, title: e.target.value }))} placeholder={tp('Ex: Protection expédition')} />
          </FormField>
          <FormField label="Description">
            <Textarea value={bump.desc} onChange={e => setBump(b => ({ ...b, desc: e.target.value }))} placeholder={tp('Texte affiché à côté de la case…')} rows={2} />
          </FormField>
          <FormField label="Prix supplémentaire (FCFA)" hint="Montant ajouté à la commande si coché">
            <Input type="number" value={bump.price} onChange={e => setBump(b => ({ ...b, price: e.target.value }))} placeholder="500" />
          </FormField>
          <FormField label="Produit(s) ajouté(s) à la commande si coché" hint="Ces produits sont ajoutés aux lignes de la commande quand le client coche l'option.">
            <SellProductsPicker ids={bump.upsellProductIds} onChange={(ids) => setBump(b => ({ ...b, upsellProductIds: ids }))} products={products} loading={loadingProducts} />
          </FormField>
        </div>
      </div>

      <AppearanceControls value={bump.style} onChange={(st) => setBump(b => ({ ...b, style: st }))} />

      {/* Save */}
      <button
        onClick={save}
        disabled={saving}
        className={`w-full h-11 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
          saved ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-60'
        }`}
      >
        {saving ? 'Enregistrement...' : saved ? <><Check size={15} /> {tp('Enregistré')}</> : tp('Enregistrer le Order Bump')}
      </button>
      {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{formError}</p>}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Tab 3 — Exit-intent / Offres supplémentaires
// ═══════════════════════════════════════════════════════════════════════════
const BLANK_EXIT = { id: null, targetProductId: '', targetProductName: '', targetProductIds: [], targetAllProducts: false, title: '', desc: '', discountType: 'percent', discountValue: '', couponCode: '', triggerDelay: '3', trigger: 'both', isActive: true, style: { ...OFFER_STYLE } };

const ExitOffersTab = ({ products, loadingProducts, productError, saveProductUpsells }) => {
  const [offers, setOffers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_EXIT);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (loadingProducts || loaded) return;
    const allIds = products.map(getProductId).filter(Boolean);
    const byId = new Map();
    for (const product of products) {
      const pid = getProductId(product);
      const exitData = product?.productPageConfig?.upsells?.exit;
      if (exitData && exitData.title) {
        const key = String(exitData.id || `${pid}-${exitData.title}`);
        if (!byId.has(key)) byId.set(key, { ...exitData, id: key, targetProductIds: [] });
        const agg = byId.get(key);
        if (!agg.targetProductIds.includes(pid)) agg.targetProductIds.push(pid);
      }
    }
    const logical = [...byId.values()].map(o => {
      const ids = o.targetProductIds || [];
      const isAll = Boolean(o.targetAllProducts) || (allIds.length > 0 && ids.length >= allIds.length);
      return { ...o, targetProductIds: ids, targetAllProducts: isAll };
    });
    setOffers(logical);
    setLoaded(true);
  }, [products, loadingProducts, loaded]);

  const openNew = () => { setEditing(null); setForm({ ...BLANK_EXIT, id: Date.now() }); setFormError(''); setShowModal(true); };
  const openEdit = (o) => { setEditing(o.id); setForm({ ...o }); setFormError(''); setShowModal(true); };
  const closeModal = () => setShowModal(false);

  const exitIdsOf = (offer) => (offer?.targetAllProducts
    ? products.map(getProductId).filter(Boolean)
    : (offer?.targetProductIds || []).filter(Boolean));

  const writeExit = async (productIds, value) => {
    const uniq = [...new Set((productIds || []).filter(Boolean))];
    await Promise.all(uniq.map(pid =>
      Promise.resolve(saveProductUpsells(pid, (upsells = {}) => ({
        ...upsells,
        exit: value ? normalizeExitOffer({ ...value, targetProductIds: uniq }) : null,
      }))).catch(() => {})
    ));
  };

  const save = () => {
    if (!form.title.trim()) return;
    if (!form.targetAllProducts && !(form.targetProductIds?.length)) {
      setFormError('Choisissez au moins un produit (ou « Tous les produits »).');
      return;
    }
    setFormError('');
    const previous = offers.find(o => o.id === editing);
    const targeted = exitIdsOf(form);
    if (editing) {
      setOffers(prev => prev.map(o => o.id === editing ? { ...form } : o));
    } else {
      setOffers(prev => [...prev, { ...form }]);
    }
    // Optimiste : fermeture immédiate, écriture en arrière-plan
    closeModal();
    (async () => {
      await writeExit(targeted, form);
      if (previous) {
        const toClear = exitIdsOf(previous).filter(pid => !targeted.includes(pid));
        await writeExit(toClear, null);
      }
    })().catch(() => {});
  };

  const remove = async (id) => {
    const removed = offers.find(o => o.id === id);
    setOffers(prev => prev.filter(o => o.id !== id));
    if (removed) await writeExit(exitIdsOf(removed), null);
  };
  const toggle = async (id) => {
    const nextOffers = offers.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o);
    const changed = nextOffers.find(o => o.id === id);
    setOffers(nextOffers);
    if (changed) await writeExit(exitIdsOf(changed), changed);
  };

  const generateExitWithAI = async (brief = {}) => {
    const pid = form.targetAllProducts
      ? (products[0] && getProductId(products[0]))
      : (form.targetProductIds || [])[0];
    if (!pid) { setFormError("Choisissez d'abord un produit pour générer l'offre."); return; }
    setAiLoading(true);
    setFormError('');
    try {
      const res = await storeProductsApi.generateUpsellOffer({ productId: pid, kind: 'exit', brief });
      const o = res?.data?.data?.offer;
      setAiOpen(false);
      if (o) {
        setForm(f => ({
          ...f,
          title: o.title || f.title,
          desc: o.description || f.desc,
          discountType: o.discountType || f.discountType,
          discountValue: (o.discountValue !== '' && o.discountValue != null) ? String(o.discountValue) : f.discountValue,
        }));
      }
    } catch (e) {
      setFormError(e?.response?.data?.message || "Échec de la génération IA. Réessayez.");
    } finally {
      setAiLoading(false);
    }
  };

  const discountLabel = (o) => {
    if (o.discountType === 'percent') return `${o.discountValue}% de remise`;
    if (o.discountType === 'fixed') return `${Number(o.discountValue).toLocaleString('fr-FR')} FCFA`;
    return 'Gratuit';
  };

  return (
    <div className="grid lg:grid-cols-[320px_minmax(0,1fr)] gap-5 items-start">
      {/* Aperçu client — toujours à gauche */}
      <div className="order-first lg:sticky lg:top-0 self-start space-y-3">
        <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white border border-gray-200/70 p-3 sm:p-4 shadow-sm">
          <ExitPreview form={form} />
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">{showModal ? "L'aperçu se met à jour pendant que vous éditez." : "Cliquez sur « Ajouter une offre » ou l'icône crayon pour éditer — l'aperçu s'affiche ici."}</p>
      </div>

      {/* Contenu — à droite */}
      <div className="space-y-5">
      {/* Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle size={14} className="text-gray-600" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800 mb-0.5">{tp('Comment ça marche')}</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            Un pop-up s'affiche quand le visiteur tente de fermer le formulaire. Récupérez des ventes perdues en proposant une remise de dernière chance.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{offers.length} offre{offers.length !== 1 ? 's' : ''}</span>
        <button
          onClick={openNew}
          className="h-9 px-3.5 bg-gray-900 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 hover:bg-gray-800 transition-colors"
        >
          <Plus size={13} /> Ajouter une offre
        </button>
      </div>

      {/* Panneau d'édition inline OU liste */}
      {showModal ? (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{editing ? "Modifier l'offre" : tp('Nouvelle offre')}</p>
            <button onClick={closeModal} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"><X size={16} /></button>
          </div>
          <FormField label="Titre du pop-up *">
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={tp('Ex: Attendez ! Voici 10% de remise')} />
          </FormField>
          <FormField label="Produits concernés *" hint="Le pop-up sera rattaché à chaque produit ciblé (ou à tous).">
            <ProductMultiTargetSelector
              all={form.targetAllProducts}
              ids={form.targetProductIds}
              onChange={(selection) => setForm(f => ({ ...f, ...selection }))}
              products={products}
              loading={loadingProducts}
              error={productError}
            />
          </FormField>
          {aiOpen ? (
            <AiBriefPanel loading={aiLoading} onCancel={() => setAiOpen(false)} onSubmit={(brief) => generateExitWithAI(brief)} />
          ) : (
            <button type="button" onClick={() => setAiOpen(true)} className="w-full h-10 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors">
              <Sparkles size={15} /> Générer avec l'IA
            </button>
          )}
          <FormField label="Message">
            <Textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder={tp('Texte principal du pop-up…')} />
          </FormField>
          <FormField label="Type de réduction">
            <DiscountTypeSelector value={form.discountType} onChange={v => setForm(f => ({ ...f, discountType: v }))} />
          </FormField>
          {form.discountType !== 'free' && (
            <FormField label={form.discountType === 'percent' ? 'Pourcentage (%)' : tp('Montant (FCFA)')}>
              <Input type="number" value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={form.discountType === 'percent' ? '10' : '2000'} />
            </FormField>
          )}
          <FormField label="Code promo" hint="Optionnel — code à appliquer automatiquement">
            <Input value={form.couponCode} onChange={e => setForm(f => ({ ...f, couponCode: e.target.value.toUpperCase() }))} placeholder="PROMO10" />
          </FormField>
          <FormField label="Déclenchement" hint="Fermeture du formulaire, souris qui quitte la page (intention de sortie), ou les deux">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {[['both', 'Les deux'], ['close', 'Fermeture'], ['exit-intent', 'Intention de sortie']].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setForm(f => ({ ...f, trigger: v }))}
                  className={`flex-1 px-2 py-2 text-xs transition-colors ${(form.trigger || 'both') === v ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Délai d'armement (secondes)" hint="Temps minimum passé sur la page avant que le pop-up puisse s'afficher">
            <Input type="number" value={form.triggerDelay} onChange={e => setForm(f => ({ ...f, triggerDelay: e.target.value }))} placeholder="3" min="0" max="30" />
          </FormField>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-gray-700">{tp('Activer cette offre')}</span>
            <Toggle on={form.isActive} onChange={v => setForm(f => ({ ...f, isActive: v }))} />
          </div>
          <AppearanceControls value={form.style} onChange={(st) => setForm(f => ({ ...f, style: st }))} />
          {formError && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{formError}</p>}
          <div className="flex gap-2 pt-2">
            <button onClick={closeModal} className="flex-1 h-11 bg-gray-100 text-gray-700 rounded-2xl text-sm font-medium hover:bg-gray-200 transition-colors">{tp('Annuler')}</button>
            <button onClick={save} disabled={saving} className="flex-1 h-11 bg-green-600 text-white rounded-2xl text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">{saving ? 'Enregistrement...' : editing ? 'Enregistrer' : "Créer l'offre"}</button>
          </div>
        </div>
      ) : offers.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title={tp('Aucune offre de sortie')}
          subtitle="Créez un pop-up d'exit intent pour récupérer les visiteurs qui ferment le formulaire."
          cta="Créer une offre"
          onCta={openNew}
        />
      ) : (
        <div className="space-y-3">
          {offers.map(o => (
            <div key={o.id} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${!o.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={16} className="text-white" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">{o.title}</p>
                    <Badge color={o.isActive ? 'green' : 'gray'}>{o.isActive ? 'Actif' : tp('Inactif')}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-medium text-green-700">{discountLabel(o)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="inline-flex items-center gap-1"><Package size={10} /> {o.targetAllProducts ? tp('Tous les produits') : `${(o.targetProductIds || []).length} produit(s)`}</span>
                    {o.couponCode && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span className="flex items-center gap-1">
                          <Tag size={10} strokeWidth={1.75} />
                          <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{o.couponCode}</code>
                        </span>
                      </>
                    )}
                    <span className="text-gray-300">·</span>
                    <span>Délai : {o.triggerDelay}s</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Toggle on={o.isActive} onChange={() => toggle(o.id)} />
                  <button onClick={() => openEdit(o)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => remove(o.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {o.desc && (
                <div className="px-4 pb-3 border-t border-gray-50 pt-2">
                  <p className="text-xs text-gray-500 line-clamp-1">{o.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════
const FormUpsellsPage = () => {
  const [activeTab, setActiveTab] = useState('upsells');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoadingProducts(true);
    storeProductsApi.getProducts({ limit: 200 })
      .then((response) => {
        if (!mounted) return;
        setProducts(readProducts(response));
        setProductError('');
      })
      .catch(() => {
        if (!mounted) return;
        setProducts([]);
        setProductError('Impossible de charger les produits.');
      })
      .finally(() => {
        if (mounted) setLoadingProducts(false);
      });
    return () => { mounted = false; };
  }, []);

  const saveProductUpsells = async (productId, updater) => {
    const localProduct = products.find(product => getProductId(product) === productId);
    const product = localProduct || (await storeProductsApi.getProduct(productId)).data?.data;
    const currentConfig = product?.productPageConfig || {};
    const currentUpsells = currentConfig.upsells || {};
    const nextUpsells = updater(currentUpsells);
    const nextConfig = {
      ...currentConfig,
      upsells: nextUpsells,
    };

    await storeProductsApi.updateProduct(productId, { productPageConfig: nextConfig });
    setProducts(prev => prev.map(item => (
      getProductId(item) === productId ? { ...item, productPageConfig: nextConfig } : item
    )));
    return nextConfig;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Upsells & Downsells</h1>
        <p className="text-sm text-gray-400 mt-0.5">{tp('Augmentez la valeur de chaque commande avec des offres ciblées')}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 p-1.5 mb-6 flex gap-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center sm:justify-center gap-1 sm:gap-2 px-2 py-2.5 rounded-lg transition-all text-center sm:text-left ${
                active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} strokeWidth={1.75} className={active ? 'text-white' : 'text-gray-400'} />
              <span className={`text-xs font-semibold leading-tight ${active ? 'text-white' : 'text-gray-700'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content — conteneur de défilement dédié : l'aperçu peut vraiment rester collé */}
      <div className="lg:h-[calc(100dvh-196px)] lg:overflow-y-auto lg:-mr-2 lg:pr-2">
        {activeTab === 'upsells' && <UpsellsTab products={products} loadingProducts={loadingProducts} productError={productError} saveProductUpsells={saveProductUpsells} />}
        {activeTab === 'bump' && <OrderBumpTab products={products} loadingProducts={loadingProducts} productError={productError} saveProductUpsells={saveProductUpsells} />}
        {activeTab === 'exit' && <ExitOffersTab products={products} loadingProducts={loadingProducts} productError={productError} saveProductUpsells={saveProductUpsells} />}
      </div>
    </div>
  );
};

export default FormUpsellsPage;
