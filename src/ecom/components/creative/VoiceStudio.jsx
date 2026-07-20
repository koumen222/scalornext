import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Link } from '@/lib/router-compat';
import {
  Mic, AudioLines, Play, Pause, Download, Loader2, Sparkles, Search,
  RotateCcw, ExternalLink, CheckCircle, AlertCircle, Wand2, Trash2, Globe,
  ChevronDown, Info, X, Wallet, Plus, Settings2, Star, RefreshCw,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, downloadFile, ImportProductBar, stripHtml, featureCost, getInsufficientCredits, CostChip } from './creativeShared.jsx';

const A = ACCENTS.voice;
const MAX_CHARS = 5000;
const PAGE_SIZE = 24;

// ─── Langues de synthèse (texte lu par la voix) ─────────────────────────────
const LANGS = [
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'en', label: 'English',  flag: '🇬🇧' },
  { id: 'es', label: 'Español',  flag: '🇪🇸' },
  { id: 'ar', label: 'العربية',   flag: '🇸🇦' },
];

// ─── Voix curées (repli hors-ligne si le catalogue est indisponible) ─────────
const CURATED = [
  { id: '498c39373700473b9e5251cb2f2049bc', name: 'Aïcha',        langs: ['fr', 'ar'],             use: tp('Pro · posée') },
  { id: '13f7f6e260f94079b9d51c961fa6c9e2', name: 'Michelle',     langs: ['fr', 'en', 'es'],       use: tp('Chaleureuse') },
  { id: '14b22748e04a48a58f92fbcde088ee50', name: 'Rita',         langs: ['fr', 'en'],             use: tp('Persuasive') },
  { id: 'e3a12335ddd040209a99002ee76b682f', name: 'Sophie',       langs: ['fr', 'es'],             use: tp('Douce') },
  { id: '4f2a0684dd0247dda68f339738c780e6', name: 'Le Narrateur', langs: ['fr', 'en', 'ar'],       use: tp('Grave · cinéma') },
  { id: '',                                 name: tp('Voix par défaut'), langs: ['fr', 'en', 'es', 'ar'], use: tp('Neutre') },
];

function mapVoice(v) {
  return {
    id: v.id,
    name: v.title || tp('Voix'),
    use: v.author ? `@${v.author}` : (Array.isArray(v.tags) && v.tags[0] ? v.tags[0] : ''),
    langs: Array.isArray(v.languages) ? v.languages.map((x) => String(x).toLowerCase()) : [],
    cover: v.cover || '',
    sampleUrl: v.sampleUrl || '',
    taskCount: v.taskCount || 0,
  };
}

// Phrase d'aperçu (courte) par langue — utilisée si la voix n'a pas d'échantillon.
const SAMPLE = {
  fr: "Bonjour, découvrez notre nouveau produit dès aujourd'hui.",
  en: 'Hi there! Discover our brand new product today.',
  es: '¡Hola! Descubre nuestro nuevo producto hoy mismo.',
  ar: 'مرحبًا، اكتشف منتجنا الجديد اليوم.',
};

// Exemple de script marketing (bouton « Exemple »).
const SCRIPTS = {
  fr: "Marre de perdre du temps chaque matin ? Ce produit change tout. Simple, rapide, efficace — et aujourd'hui, il est à -30 %. Commandez maintenant, livraison en 24h.",
  en: 'Tired of wasting time every morning? This product changes everything. Simple, fast, effective — and today it is 30% off. Order now, delivered in 24 hours.',
  es: '¿Cansado de perder tiempo cada mañana? Este producto lo cambia todo. Simple, rápido, eficaz — y hoy con 30% de descuento. Pídelo ya, entrega en 24 horas.',
  ar: 'هل سئمت من إضاعة الوقت كل صباح؟ هذا المنتج يغيّر كل شيء. بسيط وسريع وفعّال، واليوم بخصم 30%. اطلبه الآن، التوصيل خلال 24 ساعة.',
};

function fmtTime(s) {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${ss}`;
}
function fmtCount(n) {
  if (!n) return '';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ─── Lecteur audio compact (neutre) ─────────────────────────────────────────
function AudioPlayer({ src, subtitle }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => { setPlaying(false); setCur(0); setDur(0); }, [src]);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const seek = (e) => {
    const a = ref.current;
    if (!a || !dur) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    a.currentTime = p * dur;
    setCur(p * dur);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <audio
        ref={ref} src={src} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button onClick={toggle} aria-label={playing ? tp('Pause') : tp('Lire')}
          className="w-11 h-11 shrink-0 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 active:scale-95 transition">
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <div onClick={seek} className="relative h-1.5 flex-1 rounded-full bg-muted cursor-pointer overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gray-800 rounded-full" style={{ width: `${dur ? (cur / dur) * 100 : 0}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-muted-foreground shrink-0 w-[74px] text-right">{fmtTime(cur)} / {fmtTime(dur)}</span>
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-1.5 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Curseur de réglage (neutre) ────────────────────────────────────────────
function Slider({ label, value, min, max, step, onChange, format, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12.5px] font-semibold text-foreground">{label}</span>
        <span className="text-[12px] font-bold text-foreground tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-gray-700 cursor-pointer" />
      {hint && <p className="text-[10.5px] text-muted-foreground mt-1 leading-tight">{hint}</p>}
    </div>
  );
}

// ─── Carte voix ─────────────────────────────────────────────────────────────
function VoiceCard({ v, selected, isPlaying, isLoading, onSelect, onPreview, brand }) {
  const initial = (v.name || '?').charAt(0).toUpperCase();
  return (
    <button onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-2.5 flex items-center gap-3 transition-all ${selected ? 'border-primary-200 bg-primary-50/50 ring-1 ring-primary-100' : 'border-border bg-card hover:border-gray-300'}`}>
      <div className="w-10 h-10 shrink-0 rounded-xl bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm overflow-hidden">
        {isPlaying
          ? <span className="vs-eq flex items-end h-4"><span /><span /><span /><span /></span>
          : v.cover
            ? <img src={v.cover} alt="" className="w-full h-full object-cover" />
            : (v.id ? initial : <Mic size={16} />)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold text-foreground truncate">{v.name}</span>
          {brand && <span className="shrink-0 text-[8px] font-bold uppercase tracking-wide bg-primary-50 text-primary px-1 py-0.5 rounded">Scalor</span>}
          {!!v.taskCount && <span className="inline-flex items-center gap-0.5 text-[9.5px] text-muted-foreground shrink-0"><Star size={9} /> {fmtCount(v.taskCount)}</span>}
        </div>
        <p className="text-[10.5px] text-muted-foreground truncate">{[v.use, (v.langs || []).map((x) => x.toUpperCase()).join(' ')].filter(Boolean).join(' · ')}</p>
      </div>
      <span
        role="button" tabIndex={0}
        onClick={(e) => { e.stopPropagation(); onPreview(); }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onPreview(); } }}
        className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-colors ${selected ? 'bg-primary-100 text-primary' : 'bg-muted text-muted-foreground hover:bg-gray-200'}`}>
        {isLoading ? <Loader2 size={14} className="animate-spin" /> : isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </span>
    </button>
  );
}

const VoiceStudio = ({ credits, onCreditsChange, onNeedCredits, importedProduct, onImport, onClearImport }) => {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState('fr');
  const [pickedVoice, setPickedVoice] = useState(CURATED[0]);
  const [customMode, setCustomMode] = useState(false);
  const [customId, setCustomId] = useState('');

  const [speed, setSpeed] = useState(1);
  const [stability, setStability] = useState(50);
  const [similarity, setSimilarity] = useState(75);
  const [style, setStyle] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // ── Catalogue de voix (Fish en direct) — la sélection Scalor est séparée ──
  const [voices, setVoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voicesError, setVoicesError] = useState('');
  const [usingFallback, setUsingFallback] = useState(false);
  const [query, setQuery] = useState('');
  const [langFilter, setLangFilter] = useState('all');
  const [onlyMine, setOnlyMine] = useState(false);
  const pickedManuallyRef = useRef(false);

  const previewRef = useRef(null);
  const previewCache = useRef({});
  const [previewingId, setPreviewingId] = useState(null);
  const [playingPreviewId, setPlayingPreviewId] = useState(null);

  const effectiveVoice = useMemo(() => (
    customMode
      ? { id: customId.trim(), name: tp('Voix personnalisée'), langs: LANGS.map((l) => l.id) }
      : (pickedVoice || { id: '', name: tp('Voix par défaut'), langs: [] })
  ), [customMode, customId, pickedVoice]);

  const productText = importedProduct
    ? `${importedProduct.name || ''}. ${stripHtml(importedProduct.description || '').slice(0, 400)}`.trim()
    : '';

  // ── Récupération du catalogue ──
  const fetchVoices = useCallback(async ({ q, lang, self, page: pg, append }) => {
    setVoicesLoading(true); setVoicesError('');
    try {
      const res = await creativeApi.voice.list({
        q: q || undefined,
        language: lang && lang !== 'all' ? lang : undefined,
        self: self || undefined,
        page: pg,
        pageSize: PAGE_SIZE,
        sort: 'task_count',
      });
      const d = res.data || {};
      if (!d.success) throw new Error(d.message || 'load-failed');
      const mapped = (d.voices || []).map(mapVoice);
      setUsingFallback(false);
      setTotal(d.total || mapped.length);
      setVoices((prev) => (append ? [...prev, ...mapped] : mapped));
    } catch (err) {
      if (!append) { setVoices([]); setTotal(0); setUsingFallback(true); }
      setVoicesError(err.response?.data?.message || err.message || tp('Catalogue de voix indisponible.'));
    } finally { setVoicesLoading(false); }
  }, []);

  // Recherche serveur debouncée + filtres (langue / mes voix)
  useEffect(() => {
    const delay = query ? 400 : 0;
    const t = setTimeout(() => { setPage(1); fetchVoices({ q: query, lang: langFilter, self: onlyMine, page: 1, append: false }); }, delay);
    return () => clearTimeout(t);
  }, [query, langFilter, onlyMine, fetchVoices]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchVoices({ q: query, lang: langFilter, self: onlyMine, page: next, append: true });
  };

  // Sélection Scalor (voix maison) — toujours visible, filtrée localement.
  const scalorVoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CURATED.filter((v) => (langFilter === 'all' || v.langs.includes(langFilter)) && (!q || v.name.toLowerCase().includes(q) || (v.use || '').toLowerCase().includes(q)));
  }, [query, langFilter]);

  const canLoadMore = !usingFallback && voices.length < total && !voicesLoading;

  // ── Aperçu ──
  const stopPreview = useCallback(() => {
    try { previewRef.current?.pause(); } catch { /* noop */ }
    previewRef.current = null;
    setPlayingPreviewId(null);
  }, []);
  useEffect(() => () => stopPreview(), [stopPreview]);

  const playUrl = useCallback((url, pid) => {
    if (typeof Audio === 'undefined') return;
    try {
      const a = new Audio(url);
      previewRef.current = a;
      a.onended = () => setPlayingPreviewId(null);
      a.play().catch(() => setPlayingPreviewId(null));
      setPlayingPreviewId(pid);
    } catch { setPlayingPreviewId(null); }
  }, []);

  const previewVoice = useCallback(async (v) => {
    const pid = v.id || 'default';
    if (playingPreviewId === pid) { stopPreview(); return; }
    stopPreview();
    // 1) Échantillon direct (gratuit, instantané)
    if (v.sampleUrl) { playUrl(v.sampleUrl, pid); return; }
    // 2) Sinon on génère un court échantillon
    const key = `${v.id}|${language}`;
    let url = previewCache.current[key];
    if (!url) {
      setPreviewingId(pid);
      try {
        const res = await creativeApi.voice.generate({ text: SAMPLE[language] || SAMPLE.fr, referenceId: v.id || undefined, language, speed });
        url = res.data?.url || res.data?.audioUrl || '';
        if (!url) throw new Error('no-url');
        previewCache.current[key] = url;
      } catch {
        setPreviewingId(null);
        setError(tp('Aperçu indisponible pour cette voix, réessayez.'));
        return;
      }
      setPreviewingId(null);
    }
    playUrl(url, pid);
  }, [playingPreviewId, language, speed, stopPreview, playUrl]);

  const selectVoice = useCallback((v) => { pickedManuallyRef.current = true; setCustomMode(false); setPickedVoice(v); }, []);

  // ── Génération ──
  const generate = useCallback(async () => {
    const value = text.trim();
    if (!value) { setError(tp('Écrivez d’abord le texte à lire.')); return; }
    if (value.length > MAX_CHARS) { setError(tp('Texte trop long.')); return; }
    if (customMode && !customId.trim()) { setError(tp('Entrez l’identifiant de votre voix.')); return; }
    if (typeof credits === 'number' && credits < featureCost('voice')) { onNeedCredits?.(); return; }
    stopPreview();
    setLoading(true); setError('');
    try {
      const res = await creativeApi.voice.generate({
        text: value,
        referenceId: effectiveVoice.id || undefined,
        language,
        speed,
        // Réglages avancés — transmis au moteur, appliqués s’il les supporte.
        stability: stability / 100,
        similarity: similarity / 100,
        style: style / 100,
        format: 'mp3',
      });
      const data = res.data || {};
      const url = data.url || data.audioUrl || '';
      if (!data.success || !url) throw new Error(data.message || tp('Génération impossible, réessayez.'));
      const item = {
        id: `${Date.now()}`, url,
        voiceId: effectiveVoice.id, voiceName: effectiveVoice.name,
        text: value, language, createdAt: new Date().toISOString(), saved: false,
      };
      setHistory((prev) => [item, ...prev].slice(0, 12));
      setActiveId(item.id);
      if (typeof data.creditsRemaining === 'number') onCreditsChange?.(data.creditsRemaining);
      else { try { const cr = await creativeApi.credits.get(); onCreditsChange?.(cr.data?.credits ?? credits); } catch { /* noop */ } }
    } catch (err) {
      const insuff = getInsufficientCredits(err);
      if (insuff) { setError(insuff.message || tp('Crédits insuffisants — rechargez pour continuer.')); onNeedCredits?.(); }
      else setError(err.response?.data?.message || err.message || tp('Voix indisponible — réessayez plus tard.'));
    } finally { setLoading(false); }
  }, [text, customMode, customId, credits, onNeedCredits, effectiveVoice, language, speed, stability, similarity, style, onCreditsChange, stopPreview]);

  const saveToGallery = useCallback(async (item) => {
    setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, saved: true } : h)));
    try {
      await creativeApi.gallery.save({
        type: 'audio',
        label: `${item.voiceName} · ${(item.text || '').slice(0, 40)}`,
        audioUrl: item.url,
        productName: importedProduct?.name || undefined,
        meta: { kind: 'voiceover', voiceId: item.voiceId, voiceName: item.voiceName, language: item.language, source: 'voice-studio' },
      });
    } catch {
      setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, saved: false } : h)));
      setError(tp('Enregistrement dans la galerie impossible.'));
    }
  }, [importedProduct]);

  const removeItem = (id) => setHistory((prev) => prev.filter((h) => h.id !== id));
  const active = history.find((h) => h.id === activeId) || history[0] || null;
  const charPct = Math.min(100, (text.length / MAX_CHARS) * 100);
  const lowCredits = typeof credits === 'number' && credits <= 3;
  const selId = customMode ? '__custom__' : (pickedVoice ? (pickedVoice.id || 'default') : null);

  return (
    <div>
      <style>{`
        .vs-scroll::-webkit-scrollbar{width:6px}
        .vs-scroll::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:9999px}
        @keyframes vsbar{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
        .vs-eq span{display:inline-block;width:2.5px;height:14px;margin:0 1px;background:currentColor;border-radius:2px;transform-origin:bottom;animation:vsbar .9s ease-in-out infinite}
        .vs-eq span:nth-child(2){animation-delay:.15s}.vs-eq span:nth-child(3){animation-delay:.3s}.vs-eq span:nth-child(4){animation-delay:.45s}
      `}</style>

      <StudioHeader
        icon={Mic} kind="voice" title={tp('Studio Voix')}
        subtitle={tp('Transformez n’importe quel texte en voix-off réaliste, en plusieurs langues.')}
        right={typeof credits === 'number' ? (
          <button onClick={() => onNeedCredits?.()}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-[13px] font-semibold transition-colors ${lowCredits ? 'bg-primary/10 text-primary hover:bg-primary/12' : 'bg-muted text-foreground hover:bg-gray-200'}`}>
            <Wallet size={14} /> {credits} <span className="text-muted-foreground font-medium">{tp('crédits')}</span>
          </button>
        ) : null}
      />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={15} /></button>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5 lg:gap-6">
        {/* ── Bibliothèque de voix ── */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-card rounded-3xl border border-border shadow-sm p-4 lg:sticky lg:top-[76px]">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-xl ${A.bg} flex items-center justify-center`}><AudioLines size={16} className={A.text} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-foreground">{tp('Bibliothèque de voix')}</p>
                <p className="text-[10.5px] text-muted-foreground truncate">
                  {voicesLoading && !voices.length ? tp('Chargement…')
                    : usingFallback ? tp('Sélection Scalor')
                    : `${total.toLocaleString('fr-FR')} ${tp('voix disponibles')}`}
                </p>
              </div>
              <button onClick={() => fetchVoices({ q: query, lang: langFilter, self: onlyMine, page: 1, append: false })}
                title={tp('Rafraîchir')} className="w-8 h-8 shrink-0 rounded-lg bg-muted text-muted-foreground hover:bg-gray-200 flex items-center justify-center">
                <RefreshCw size={13} className={voicesLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tp('Rechercher dans tout le catalogue…')}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-background border border-border text-[13px] outline-none focus:border-gray-300 focus:ring-4 focus:ring-gray-100 transition" />
              {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-muted-foreground"><X size={14} /></button>}
            </div>

            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setLangFilter('all')}
                  className={`h-7 px-2.5 rounded-lg text-[11.5px] font-semibold transition-colors ${langFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-muted text-muted-foreground hover:bg-gray-200'}`}>{tp('Toutes')}</button>
                {LANGS.map((l) => (
                  <button key={l.id} onClick={() => setLangFilter(l.id)}
                    className={`h-7 px-2.5 rounded-lg text-[11.5px] font-semibold inline-flex items-center gap-1 transition-colors ${langFilter === l.id ? 'bg-gray-900 text-white' : 'bg-muted text-muted-foreground hover:bg-gray-200'}`}>
                    <span>{l.flag}</span> {l.id.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setOnlyMine((v) => !v)}
              className={`w-full mb-2.5 h-8 rounded-lg text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${onlyMine ? 'bg-primary-50 text-primary ring-1 ring-primary-100' : 'bg-background text-muted-foreground hover:bg-muted'}`}>
              <Mic size={13} /> {onlyMine ? tp('Mes voix') : tp('Afficher mes voix')}
            </button>

            {voicesError && !usingFallback && (
              <p className="text-[11px] text-primary bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 mb-2">{voicesError}</p>
            )}

            <div className="space-y-2 max-h-[460px] overflow-y-auto vs-scroll pr-1">
              {/* Sélection Scalor (voix maison) — toujours en tête */}
              {scalorVoices.length > 0 && (
                <>
                  <p className="px-1 pt-0.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{tp('Voix Scalor')}</p>
                  {scalorVoices.map((v) => {
                    const vid = v.id || 'default';
                    return (
                      <VoiceCard
                        key={`scalor-${vid}`} v={v} brand
                        selected={selId === vid}
                        isPlaying={playingPreviewId === vid}
                        isLoading={previewingId === vid}
                        onSelect={() => selectVoice(v)}
                        onPreview={() => previewVoice(v)}
                      />
                    );
                  })}
                </>
              )}

              {/* Catalogue complet */}
              {!usingFallback && (voices.length > 0 || voicesLoading) && (
                <p className="px-1 pt-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tp('Catalogue')}</p>
              )}
              {voicesLoading && !voices.length ? (
                <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground"><Loader2 size={20} className="animate-spin" /><span className="text-[12px]">{tp('Chargement du catalogue…')}</span></div>
              ) : voices.map((v) => {
                const vid = v.id || 'default';
                return (
                  <VoiceCard
                    key={`cat-${vid}-${v.name}`} v={v}
                    selected={selId === vid}
                    isPlaying={playingPreviewId === vid}
                    isLoading={previewingId === vid}
                    onSelect={() => selectVoice(v)}
                    onPreview={() => previewVoice(v)}
                  />
                );
              })}

              {!voicesLoading && !usingFallback && voices.length === 0 && scalorVoices.length === 0 && (
                <p className="text-center text-[12px] text-muted-foreground py-6">{tp('Aucune voix ne correspond.')}</p>
              )}

              {canLoadMore && (
                <button onClick={loadMore} disabled={voicesLoading}
                  className="w-full h-9 rounded-xl border border-border text-[12.5px] font-semibold text-muted-foreground hover:bg-background inline-flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {voicesLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {tp('Charger plus de voix')}
                </button>
              )}
            </div>

            {/* Voix personnalisée */}
            <button onClick={() => { setCustomMode((v) => !v); pickedManuallyRef.current = true; }}
              className={`w-full mt-2 text-left rounded-2xl border border-dashed p-2.5 flex items-center gap-3 transition-all ${customMode ? 'border-primary-200 bg-primary-50/50' : 'border-border hover:border-gray-300'}`}>
              <div className="w-10 h-10 shrink-0 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><Plus size={16} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-foreground">{tp('Voix personnalisée')}</p>
                <p className="text-[10.5px] text-muted-foreground truncate">{tp('Coller un identifiant de voix')}</p>
              </div>
            </button>
            {customMode && (
              <input value={customId} onChange={(e) => setCustomId(e.target.value)} placeholder={tp('reference_id de la voix')}
                className="w-full h-10 px-3 mt-2 rounded-xl bg-background border border-border text-[13px] outline-none focus:border-gray-300 focus:ring-4 focus:ring-gray-100 transition" />
            )}
          </div>
        </div>

        {/* ── Composition + réglages + résultat ── */}
        <div className="lg:col-span-3 order-1 lg:order-2 space-y-5">
          {importedProduct !== undefined && (
            <ImportProductBar product={importedProduct} onImport={onImport} onClear={onClearImport} accent={A} />
          )}

          <div className="bg-card rounded-3xl border border-border shadow-sm p-5">
            {/* Langue de synthèse */}
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <span className="text-[13px] font-semibold text-foreground inline-flex items-center gap-1.5"><Globe size={14} className="text-muted-foreground" /> {tp('Langue')}</span>
              <div className="flex gap-1.5 flex-wrap">
                {LANGS.map((l) => (
                  <button key={l.id} onClick={() => setLanguage(l.id)}
                    className={`h-8 px-3 rounded-lg text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition-colors ${language === l.id ? 'bg-gray-900 text-white' : 'bg-muted text-muted-foreground hover:bg-gray-200'}`}>
                    <span>{l.flag}</span> {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone de texte */}
            <div className="relative">
              <textarea
                value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                dir={language === 'ar' ? 'rtl' : 'ltr'} rows={6}
                placeholder={tp('Écrivez ou collez le texte à transformer en voix…')}
                className="w-full px-4 py-3.5 rounded-2xl bg-background border border-border text-[14px] leading-relaxed outline-none focus:border-gray-300 focus:ring-4 focus:ring-gray-100 transition resize-y min-h-[150px]" />
              <div className="absolute bottom-3 right-3.5 flex items-center gap-2">
                <div className="w-14 h-1 rounded-full bg-gray-200 overflow-hidden">
                  <div className={`h-full rounded-full ${charPct > 90 ? 'bg-primary' : 'bg-gray-400'}`} style={{ width: `${charPct}%` }} />
                </div>
                <span className={`text-[11px] tabular-nums ${charPct > 90 ? 'text-primary' : 'text-muted-foreground'}`}>{text.length}/{MAX_CHARS}</span>
              </div>
            </div>

            {/* Voix sélectionnée + actions rapides */}
            <div className="flex flex-wrap items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary-50 text-primary text-[12px] font-semibold">
                <Mic size={13} /> {effectiveVoice.name}
              </span>
              <button onClick={() => setText(SCRIPTS[language] || SCRIPTS.fr)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted text-muted-foreground text-[12px] font-medium hover:bg-gray-200 transition-colors">
                <Wand2 size={13} /> {tp('Exemple')}
              </button>
              {productText && (
                <button onClick={() => setText(productText)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-muted text-muted-foreground text-[12px] font-medium hover:bg-gray-200 transition-colors">
                  <Sparkles size={13} /> {tp('Utiliser le produit')}
                </button>
              )}
              {text && (
                <button onClick={() => setText('')}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-muted-foreground text-[12px] font-medium hover:text-muted-foreground transition-colors">
                  <Trash2 size={13} /> {tp('Effacer')}
                </button>
              )}
            </div>

            {/* Réglages */}
            <div className="mt-4 pt-4 border-t border-border">
              <Slider label={tp('Vitesse')} value={speed} min={0.7} max={1.3} step={0.05} onChange={setSpeed}
                format={(v) => `${v.toFixed(2)}×`} hint={tp('Débit de parole de la voix.')} />

              <button onClick={() => setShowAdvanced((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                <Settings2 size={14} /> {tp('Réglages avancés')}
                <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-4">
                  <Slider label={tp('Stabilité')} value={stability} min={0} max={100} step={1} onChange={setStability}
                    format={(v) => `${v}%`} hint={tp('Bas = plus d’expressivité, haut = plus régulier.')} />
                  <Slider label={tp('Similarité')} value={similarity} min={0} max={100} step={1} onChange={setSimilarity}
                    format={(v) => `${v}%`} hint={tp('Fidélité au timbre de la voix d’origine.')} />
                  <Slider label={tp('Style')} value={style} min={0} max={100} step={1} onChange={setStyle}
                    format={(v) => `${v}%`} hint={tp('Accentue le style / l’intonation (peut varier le rendu).')} />
                  <div className="flex items-start gap-2 text-[11px] text-muted-foreground leading-snug">
                    <Info size={13} className="shrink-0 mt-0.5" />
                    {tp('Les réglages avancés sont transmis au moteur et appliqués lorsqu’il les prend en charge.')}
                  </div>
                </div>
              )}
            </div>

            {/* Générer */}
            <button onClick={generate} disabled={loading || !text.trim()}
              className="w-full h-12 mt-4 rounded-2xl bg-gray-900 text-white font-semibold text-[14px] flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50">
              {loading ? <><Loader2 size={17} className="animate-spin" /> {tp('Génération de la voix…')}</> : <><Sparkles size={17} /> {tp('Générer la voix')} <CostChip cost={featureCost('voice')} /></>}
            </button>
            <p className="text-center text-[11px] text-muted-foreground mt-2">{featureCost('voice') ? `${featureCost('voice')} ${tp('crédit(s) par génération · rendu en quelques secondes.')}` : tp('Gratuit · rendu en quelques secondes.')}</p>
          </div>

          {/* Résultat actif */}
          {active && (
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground"><CheckCircle size={17} className="text-foreground" /> {tp('Voix générée')}</p>
                <div className="flex items-center gap-2">
                  <Link to="/ecom/creatives?tab=galerie" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">{tp('Galerie')} <ExternalLink size={13} /></Link>
                  <button onClick={generate} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-[13px] font-medium hover:bg-background"><RotateCcw size={13} /> {tp('Refaire')}</button>
                </div>
              </div>
              <AudioPlayer src={active.url} subtitle={`${active.voiceName} · ${active.language.toUpperCase()} — ${(active.text || '').slice(0, 70)}${active.text.length > 70 ? '…' : ''}`} />
              <div className="flex gap-2 mt-3">
                <button onClick={() => downloadFile(active.url, `voix-${active.voiceName}-${Date.now()}.mp3`)}
                  className="flex-1 h-11 rounded-xl bg-gray-900 text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                  <Download size={15} /> {tp('Télécharger MP3')}
                </button>
                <button onClick={() => saveToGallery(active)} disabled={active.saved}
                  className={`h-11 px-4 rounded-xl border text-[13px] font-medium flex items-center gap-2 transition-colors ${active.saved ? 'border-border bg-background text-muted-foreground' : 'border-border text-muted-foreground hover:bg-background'}`}>
                  {active.saved ? <><CheckCircle size={15} /> {tp('Enregistré')}</> : <><Plus size={15} /> {tp('Galerie')}</>}
                </button>
              </div>
            </div>
          )}

          {/* Historique de session */}
          {history.length > 1 && (
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[13px] font-bold text-foreground">{tp('Générations récentes')}</p>
                <button onClick={() => { setHistory([]); setActiveId(null); }} className="text-[12px] font-medium text-muted-foreground hover:text-muted-foreground inline-flex items-center gap-1"><Trash2 size={13} /> {tp('Vider')}</button>
              </div>
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className={`flex items-center gap-2.5 rounded-2xl border p-2.5 ${h.id === active?.id ? 'border-gray-300 bg-background' : 'border-border'}`}>
                    <button onClick={() => setActiveId(h.id)} className="min-w-0 flex-1 text-left">
                      <p className="text-[12.5px] font-semibold text-foreground truncate">{h.voiceName} · {h.language.toUpperCase()}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{h.text}</p>
                    </button>
                    {h.saved && <CheckCircle size={14} className="text-muted-foreground shrink-0" />}
                    <button onClick={() => downloadFile(h.url, `voix-${h.voiceName}-${h.id}.mp3`)} className="w-8 h-8 shrink-0 rounded-lg bg-muted text-muted-foreground hover:bg-gray-200 flex items-center justify-center"><Download size={13} /></button>
                    <button onClick={() => removeItem(h.id)} className="w-8 h-8 shrink-0 rounded-lg hover:bg-muted text-gray-300 hover:text-muted-foreground flex items-center justify-center"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceStudio;
