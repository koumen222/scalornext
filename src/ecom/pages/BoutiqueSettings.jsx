/**
 * BoutiqueSettings — Unique page de configuration de la boutique.
 * Radical & minimal : nom, logo, 4 couleurs, 1 police, description. C'est tout.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useEcomAuth } from '../hooks/useEcomAuth';
import { useStore } from '../contexts/StoreContext.jsx';
import api from '../../lib/api';
import { storeManageApi } from '../services/storeApi.js';
import DeleteStoreModal from '../components/DeleteStoreModal.jsx';
import { ExternalLink, Check, Upload, Palette, Type, Store, Megaphone, Sparkles, Loader2, RefreshCw, Settings, Eye, Trash2 } from 'lucide-react';
import { tp } from '../i18n/platform.js';
import { WORLD_COUNTRIES as COUNTRIES } from '../constants/countries.js';

const FONTS = [
  { id: 'inter',      name: 'Inter',      sample: 'Modern & Clean' },
  { id: 'poppins',    name: 'Poppins',    sample: 'Friendly & Bold' },
  { id: 'dm-sans',    name: 'DM Sans',    sample: 'Neutral & Sharp' },
  { id: 'montserrat', name: 'Montserrat', sample: 'Strong & Elegant' },
  { id: 'satoshi',    name: 'Satoshi',    sample: 'Future & Luxury' },
];

const FONT_FAMILIES = {
  inter:      'Inter, system-ui, sans-serif',
  poppins:    'Poppins, sans-serif',
  'dm-sans':  '"DM Sans", sans-serif',
  montserrat: 'Montserrat, sans-serif',
  satoshi:    '"Satoshi", Inter, system-ui, sans-serif',
};

const CURRENCIES = [
  { code: 'XAF', label: 'FCFA (XAF)' },
  { code: 'XOF', label: 'FCFA (XOF)' },
  { code: 'USD', label: 'Dollar US (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'Livre Sterling (GBP)' },
  { code: 'GHS', label: 'Cedi (GHS)' },
  { code: 'NGN', label: 'Naira (NGN)' },
  { code: 'MAD', label: 'Dirham (MAD)' },
  { code: 'TND', label: 'Dinar Tunisien (TND)' },
  { code: 'DZD', get label() { return tp('Dinar Algérien (DZD)'); } },
  { code: 'KES', label: 'Shilling Kenyan (KES)' },
  { code: 'ZAR', label: 'Rand (ZAR)' },
  { code: 'RWF', label: 'Franc Rwandais (RWF)' },
  { code: 'CDF', label: 'Franc Congolais (CDF)' },
  { code: 'GNF', get label() { return tp('Franc Guinéen (GNF)'); } },
  { code: 'MGA', label: 'Ariary (MGA)' },
  { code: 'MRU', label: 'Ouguiya (MRU)' },
  { code: 'CVE', label: 'Escudo (CVE)' },
  { code: 'BIF', label: 'Franc Burundais (BIF)' },
  { code: 'CAD', label: 'Dollar Canadien (CAD)' },
  { code: 'CHF', label: 'Franc Suisse (CHF)' },
  { code: 'CNY', label: 'Yuan (CNY)' },
  { code: 'INR', label: 'Roupie Indienne (INR)' },
  { code: 'BRL', get label() { return tp('Réal (BRL)'); } },
  { code: 'AED', label: 'Dirham EAU (AED)' },
];

// COUNTRIES : liste mondiale partagée — voir ../constants/countries.js

const fmt = (n, cur = 'FCFA') => `${new Intl.NumberFormat('fr-FR').format(n)} ${cur}`;

// ── Section wrapper ──────────────────────────────────────────────────────────
const Section = ({ icon, title, desc, children }) => (
  <div className="bg-card rounded-2xl border p-6 shadow-sm">
    <div className="flex items-start gap-3 mb-5">
      <span className="w-9 h-9 rounded-xl bg-[#E6F2ED] flex items-center justify-center text-[#0F6B4F] flex-shrink-0">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
    {children}
  </div>
);

// ── Label + Input helper ─────────────────────────────────────────────────────
const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-foreground mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
  </div>
);

// ── Logo uploader ────────────────────────────────────────────────────────────
const LogoUploader = ({ value, onChange }) => {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = res.data?.data?.url || res.data?.url;
      if (url) { onChange(url); return; }
    } catch (_) {}
    // Fallback: data URL
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
    setUploading(false);
  };

  return (
    <div className="flex items-center gap-5">
      <div
        onClick={() => ref.current?.click()}
        className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-[#4D9F82] transition overflow-hidden flex-shrink-0 bg-background"
      >
        {uploading ? (
          <div className="w-5 h-5 border-2 border-[#0F6B4F] border-t-transparent rounded-full animate-spin" />
        ) : value ? (
          <img src={value} alt="Logo" className="w-full h-full object-contain p-1" />
        ) : (
          <Upload size={22} className="text-gray-300" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="px-4 py-2 text-xs font-bold text-[#0A5740] bg-[#E6F2ED] rounded-xl hover:bg-[#C0DDD2] transition"
        >
          {value ? 'Changer le logo' : tp('Uploader un logo')}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition"
          >
            {tp('Supprimer')}
          </button>
        )}
        <p className="text-[11px] text-muted-foreground">{tp('PNG, SVG ou WEBP recommandé')}</p>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
};

// ── Color picker row ─────────────────────────────────────────────────────────
const ColorPicker = ({ label, value, onChange }) => (
  <div className="flex items-center gap-3">
    <div className="relative flex-shrink-0">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded-xl cursor-pointer border-2 border-border p-0.5 bg-card"
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs font-mono text-muted-foreground bg-background border border-border rounded-lg px-2 py-1 w-24 focus:ring-1 focus:ring-[#0F6B4F] focus:border-[#0F6B4F] outline-none"
      />
    </div>
  </div>
);

// ── Settings cache (stale-while-revalidate) ──────────────────────────────────
const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 min

function _scRead(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > SETTINGS_CACHE_TTL) { sessionStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function _scWrite(key, data) {
  try { sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function settingsToForm(s, workspaceName) {
  return {
    storeName:           s.storeName           || workspaceName || '',
    storeDescription:    s.storeDescription    || '',
    storeLogo:           s.storeLogo           || '',
    storeFavicon:        s.storeFavicon        || '',
    storePhone:          s.storePhone          || '',
    storeWhatsApp:       s.storeWhatsApp       || '',
    storeCountry:        s.storeCountry        || 'Cameroun',
    storeCurrency:       s.storeCurrency       || 'XAF',
    language:            s.language            || 'fr',
    isStoreEnabled:      s.isStoreEnabled      ?? true,
    primaryColor:        s.primaryColor        || s.storeThemeColor || '#0F6B4F',
    accentColor:         s.accentColor         || '#059669',
    backgroundColor:     s.backgroundColor     || '#FFFFFF',
    textColor:           s.textColor           || '#111827',
    font:                s.font                || 'inter',
    announcement:        s.announcement        || '',
    announcementEnabled: s.announcementEnabled ?? false,
  };
}

// ── Main component ────────────────────────────────────────────────────────────
const BoutiqueSettings = () => {
  const navigate = useNavigate();
  const { workspace } = useEcomAuth();
  const { activeStore, getActiveStorefrontUrl } = useStore();

  // ── Suppression de la boutique (modal partagée) ─────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canDeleteStore = Boolean(activeStore?._id) && !activeStore?.legacyWorkspaceStore;

  const _cacheKey = activeStore?._id
    ? `boutique_settings_${activeStore._id}`
    : workspace?._id ? `boutique_settings_ws_${workspace._id}` : null;

  const _cached = _cacheKey ? _scRead(_cacheKey) : null;

  const [form, setForm] = useState(() => {
    if (_cached?.storeSettings) return settingsToForm(_cached.storeSettings, workspace?.name);
    return {
      storeName: '', storeDescription: '', storeLogo: '', storeFavicon: '',
      storePhone: '', storeWhatsApp: '', storeCountry: 'Cameroun', storeCurrency: 'XAF',
      language: 'fr',
      isStoreEnabled: true, primaryColor: '#0F6B4F', accentColor: '#059669',
      backgroundColor: '#FFFFFF', textColor: '#111827', font: 'inter',
      announcement: '', announcementEnabled: false,
    };
  });

  const [subdomain, setSubdomain] = useState(() => _cached?.subdomain || '');
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg, setRegenMsg] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  // ── Auto-save ────────────────────────────────────────────────────────────────
  const [autoSave, setAutoSave] = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const saveTimer = useRef(null);
  const isLoaded = useRef(false); // don't auto-save before initial data load

  // Allow auto-save 900 ms after mount (covers both cache & API paths)
  useEffect(() => {
    const t = setTimeout(() => { isLoaded.current = true; }, 900);
    return () => clearTimeout(t);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  // Persist to backend after last form change
  useEffect(() => {
    if (!isLoaded.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setAutoSave('idle'); // reset while debouncing — spinner shows only when request fires
    saveTimer.current = setTimeout(async () => {
      setAutoSave('saving'); // spinner starts only when request actually fires
      try {
        const res = await storeManageApi.updateStoreConfig({
          storeName:           form.storeName,
          storeDescription:    form.storeDescription,
          storeLogo:           form.storeLogo,
          storeFavicon:        form.storeFavicon,
          storePhone:          form.storePhone,
          storeWhatsApp:       form.storeWhatsApp,
          storeCountry:        form.storeCountry,
          storeCurrency:       form.storeCurrency,
          language:            form.language,
          isStoreEnabled:      form.isStoreEnabled,
          storeThemeColor:     form.primaryColor,
          primaryColor:        form.primaryColor,
          accentColor:         form.accentColor,
          backgroundColor:     form.backgroundColor,
          textColor:           form.textColor,
          font:                form.font,
          announcement:        form.announcement,
          announcementEnabled: form.announcementEnabled,
        });
        const saved_data = res.data?.data;
        if (saved_data) {
          const cKey = activeStore?._id
            ? `boutique_settings_${activeStore._id}`
            : workspace?._id ? `boutique_settings_ws_${workspace._id}` : null;
          if (cKey) _scWrite(cKey, saved_data);
          if (saved_data.subdomain) setSubdomain(saved_data.subdomain);
        }
        setAutoSave('saved');
        setTimeout(() => setAutoSave('idle'), 2500);
      } catch (err) {
        console.error('BoutiqueSettings auto-save error:', err);
        setAutoSave('error');
        setTimeout(() => setAutoSave('idle'), 4000);
      }
    }, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const TABS = [
    { id: 'general', get label() { return tp('Général'); }, icon: <Store size={15} /> },
    { id: 'apparence', label: 'Apparence', icon: <Palette size={15} /> },
    { id: 'avance', get label() { return tp('Avancé'); }, icon: <Settings size={15} /> },
  ];

  const handleRegenerate = async () => {
    setRegenerating(true);
    setRegenMsg("L'IA reconstruit votre page d'accueil...");
    try {
      await storeManageApi.regenerateHomepage();
      setRegenMsg('Page d\'accueil régénérée ! Actualisez votre boutique.');
      setTimeout(() => setRegenMsg(''), 5000);
    } catch {
      setRegenMsg('Erreur lors de la régénération, réessayez.');
      setTimeout(() => setRegenMsg(''), 4000);
    } finally {
      setRegenerating(false);
    }
  };

  // Load settings — show cache instantly, then revalidate in background
  useEffect(() => {
    if (!workspace?._id) return;
    const key = activeStore?._id
      ? `boutique_settings_${activeStore._id}`
      : `boutique_settings_ws_${workspace._id}`;
    const load = async () => {
      try {
        const settingsRes = await storeManageApi.getStoreConfig();
        const data = settingsRes.data?.data || {};
        const s = data.storeSettings || {};
        _scWrite(key, data);
        isLoaded.current = false; // pause auto-save while form resets
        setForm(settingsToForm(s, workspace?.name));
        setSubdomain(data.subdomain || '');
        // Re-enable auto-save after the state update flushes
        setTimeout(() => { isLoaded.current = true; }, 400);
      } catch (err) {
        console.error('BoutiqueSettings load error:', err);
      }
    };
    load();
  }, [workspace?._id, activeStore?._id]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // Manual save (used as error-retry fallback)
  const handleSave = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setAutoSave('saving');
    try {
      const res = await storeManageApi.updateStoreConfig({
        storeName:           form.storeName,
        storeDescription:    form.storeDescription,
        storeLogo:           form.storeLogo,
        storeFavicon:        form.storeFavicon,
        storePhone:          form.storePhone,
        storeWhatsApp:       form.storeWhatsApp,
        storeCountry:        form.storeCountry,
        storeCurrency:       form.storeCurrency,
        isStoreEnabled:      form.isStoreEnabled,
        storeThemeColor:     form.primaryColor,
        primaryColor:        form.primaryColor,
        accentColor:         form.accentColor,
        backgroundColor:     form.backgroundColor,
        textColor:           form.textColor,
        font:                form.font,
        announcement:        form.announcement,
        announcementEnabled: form.announcementEnabled,
      });
      const saved_data = res.data?.data;
      if (saved_data) {
        const cKey = activeStore?._id
          ? `boutique_settings_${activeStore._id}`
          : workspace?._id ? `boutique_settings_ws_${workspace._id}` : null;
        if (cKey) _scWrite(cKey, saved_data);
        if (saved_data.subdomain) setSubdomain(saved_data.subdomain);
      }
      setAutoSave('saved');
      setTimeout(() => setAutoSave('idle'), 2500);
    } catch (err) {
      console.error('handleSave error:', err);
      setAutoSave('error');
      setTimeout(() => setAutoSave('idle'), 4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, activeStore, workspace]);

  const previewUrl = getActiveStorefrontUrl() || (subdomain ? `https://${subdomain}.scalor.net` : null);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">{tp('Ma Boutique')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tp('Configurez votre boutique en ligne')}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:border-gray-300 hover:bg-background transition"
            >
              <ExternalLink size={14} /> Voir la boutique
            </a>
          )}
          {/* Auto-save status indicator */}
          <div className="flex items-center gap-2 px-3 py-2.5 h-[42px]">
            {autoSave === 'idle' && (
              <span className="text-xs text-muted-foreground">{tp('Auto-sauvegarde activée')}</span>
            )}
            {autoSave === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-3 h-3 rounded-full border-2 border-border border-t-[#0F6B4F] animate-spin inline-block flex-shrink-0" />
                {tp('Sauvegarde...')}
              </span>
            )}
            {autoSave === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-[#0F6B4F] font-semibold">
                <Check size={13} className="flex-shrink-0" /> Sauvegardé
              </span>
            )}
            {autoSave === 'error' && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 text-xs text-red-500 font-semibold hover:text-red-700 transition"
              >
                ✕ Erreur — Réessayer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Général ───────────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <>
          <Section
            icon={<Store size={18} />}
            title={tp('Informations')}
            desc="Le nom et la description que vos clients voient"
          >
            <div className="space-y-4">
              <Field label="Nom de la boutique *">
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(e) => set('storeName', e.target.value)}
                  placeholder={tp('Ma Super Boutique')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none transition"
                />
              </Field>

              <Field label="Description courte" hint="Affichée dans le hero de votre homepage et dans les métadonnées SEO">
                <textarea
                  rows={3}
                  value={form.storeDescription}
                  onChange={(e) => set('storeDescription', e.target.value)}
                  placeholder={tp('Découvrez notre sélection de produits soigneusement choisis…')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none resize-none transition"
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Téléphone">
                  <input
                    type="tel"
                    value={form.storePhone}
                    onChange={(e) => set('storePhone', e.target.value)}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none transition"
                  />
                </Field>
                <Field label="WhatsApp" hint="Activer le bouton 'Commander via WhatsApp'">
                  <input
                    type="tel"
                    value={form.storeWhatsApp}
                    onChange={(e) => set('storeWhatsApp', e.target.value)}
                    placeholder="237600000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none transition"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Pays de la boutique">
                  <select
                    value={form.storeCountry}
                    onChange={(e) => set('storeCountry', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none transition bg-card"
                  >
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Devise">
                  <select
                    value={form.storeCurrency}
                    onChange={(e) => set('storeCurrency', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none transition bg-card"
                  >
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Langue de la boutique" hint="Boutons, formulaire de commande et messages affichés aux clients. Vos textes (produits, descriptions) restent tels que vous les écrivez.">
                  <select
                    value={form.language}
                    onChange={(e) => set('language', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none transition bg-card"
                  >
                    <option value="fr">{tp('Français')}</option>
                    <option value="en">{tp('English')}</option>
                    <option value="es">{tp('Español')}</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Boutique active">
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => set('isStoreEnabled', !form.isStoreEnabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.isStoreEnabled ? 'bg-[#0F6B4F]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${form.isStoreEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                    <span className="text-sm text-muted-foreground">{form.isStoreEnabled ? 'En ligne' : tp('Hors ligne')}</span>
                  </div>
                </Field>
              </div>

              <div className="rounded-2xl border border-border bg-background/70 p-4 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tp('Barre d\'annonce')}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tp('Affichée en haut de la boutique, y compris sur les pages produit quand elle est activée.')}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={() => set('announcementEnabled', !form.announcementEnabled)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${form.announcementEnabled ? 'bg-[#0F6B4F]' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${form.announcementEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                    <span className="text-sm text-muted-foreground">{form.announcementEnabled ? 'Activée' : tp('Désactivée')}</span>
                  </div>
                </div>

                <Field label="Texte de l'annonce" hint="Ex: Livraison rapide · Paiement à la livraison · Retours faciles">
                  <input
                    type="text"
                    value={form.announcement}
                    onChange={(e) => set('announcement', e.target.value)}
                    placeholder={tp('Livraison rapide · Paiement à la livraison · Retours faciles')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm text-foreground focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent outline-none transition"
                  />
                </Field>
              </div>
            </div>
          </Section>

        </>
      )}

      {/* ── Tab: Apparence ─────────────────────────────────────────────── */}
      {activeTab === 'apparence' && (
        <>
          <Section
            icon={<Upload size={18} />}
            title={tp('Logo')}
            desc="Affiché en header sur toutes les pages de votre boutique"
          >
            <LogoUploader value={form.storeLogo} onChange={(v) => set('storeLogo', v)} />
          </Section>

          <Section
            icon={<Upload size={18} />}
            title={tp('Favicon')}
            desc="Petite icône affichée dans l'onglet du navigateur (32x32 ou 64x64 recommandé)"
          >
            <LogoUploader value={form.storeFavicon} onChange={(v) => set('storeFavicon', v)} />
          </Section>
          <Section
            icon={<Type size={18} />}
            title={tp('Police')}
            desc="Appliquée à l'ensemble de votre boutique"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FONTS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set('font', f.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    form.font === f.id
                      ? 'border-[#0F6B4F] bg-[#E6F2ED] shadow-sm'
                      : 'border-border hover:border-border bg-card'
                  }`}
                >
                  <p className="text-xl font-bold text-foreground leading-tight" style={{ fontFamily: FONT_FAMILIES[f.id] }}>
                    {f.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: FONT_FAMILIES[f.id] }}>
                    {f.sample}
                  </p>
                  {form.font === f.id && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-[#0A5740] bg-[#C0DDD2] px-2 py-0.5 rounded-full">
                      <Check size={10} /> Actif
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* ── Tab: Avancé ───────────────────────────────────────────────── */}
      {activeTab === 'avance' && (
        <>
          <div className="bg-gradient-to-r from-[#0F6B4F] to-[#0A5740] rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                  <Sparkles size={20} /> Modifier votre boutique
                </h3>
                <p className="text-sm text-white/80">{tp('Utilisez notre assistant pour configurer votre boutique en détail : cible, ton, audience, localisation, etc.')}</p>
              </div>
              <button
                onClick={() => navigate('/ecom/boutique/wizard')}
                className="px-6 py-2.5 rounded-xl bg-card text-[#0F6B4F] font-bold text-sm hover:bg-muted transition whitespace-nowrap flex-shrink-0"
              >
                Ouvrir l'assistant
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-purple-100 p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0">
                <Sparkles size={17} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">{tp('Régénérer la homepage par IA')}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{tp('L\'IA recrée toute votre page d\'accueil en fonction de votre niche, audience et produits.')}</p>
              </div>
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 transition disabled:opacity-60 shadow-md shadow-purple-200"
            >
              {regenerating ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {regenerating ? regenMsg || 'Génération…' : 'Régénérer la page d\'accueil'}
            </button>
            {regenMsg && !regenerating && (
              <p className="text-xs mt-3 font-medium text-purple-700">{regenMsg}</p>
            )}
          </div>

          {/* ── Zone de danger : suppression de la boutique ─────────────── */}
          <div className="bg-red-50/60 rounded-2xl border border-red-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                <Trash2 size={17} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-red-900">{tp('Supprimer la boutique')}</h2>
                <p className="text-xs text-red-700/80 mt-0.5">
                  {tp('Action définitive : la boutique passe hors ligne immédiatement, ses produits, pages et réglages ne seront plus accessibles.')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              disabled={!canDeleteStore}
              title={canDeleteStore ? undefined : tp('Cette boutique ne peut pas être supprimée depuis cette page')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-md shadow-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={15} />
              {tp('Supprimer cette boutique')}
            </button>
          </div>

          {/* Modal de confirmation partagée */}
          {deleteOpen && (
            <DeleteStoreModal store={activeStore} onClose={() => setDeleteOpen(false)} />
          )}
        </>
      )}

      {/* ── Bottom auto-save status ──────────────────────────────────────── */}
      <div className="flex justify-end pb-8">
        {autoSave === 'error' ? (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition shadow"
          >
            ✕ Erreur — Sauvegarder maintenant
          </button>
        ) : (
          <span className="text-xs text-muted-foreground py-2.5">
            {autoSave === 'saving' && 'Sauvegarde en cours...'}
            {autoSave === 'saved' && '✓ Toutes les modifications sont sauvegardées'}
            {autoSave === 'idle' && 'Les modifications sont sauvegardées automatiquement'}
          </span>
        )}
      </div>
    </div>
  );
};

export default BoutiqueSettings;
