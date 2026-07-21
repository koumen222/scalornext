'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Square, Loader2, ChevronDown, Check, Search, X, Globe, Plus } from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';

/**
 * Catalogue de voix off unifié — utilisé PARTOUT où on choisit une voix
 * (Montage, Éditeur, Avatar parlant, Lancement…).
 * Règle produit : les voix « africaines » sont regroupées et épinglées en
 * premier, puis la sélection maison « Scalor », puis le catalogue Fish Audio.
 * Le catalogue complet est atteignable : les voix populaires sont préchargées
 * pour un affichage instantané, la recherche interroge TOUT le catalogue côté
 * serveur, et « Charger plus » pagine le reste.
 */

// ── Voix Scalor : la sélection maison, priorisée partout ──
export const SCALOR_VOICES = [
  { id: '498c39373700473b9e5251cb2f2049bc', label: 'Dame africaine', tag: 'FR · femme · pro' },
  { id: '13f7f6e260f94079b9d51c961fa6c9e2', label: 'Michelle', tag: 'FR/EN · chaleureuse · naturelle' },
  { id: '14b22748e04a48a58f92fbcde088ee50', label: 'Rita', tag: 'FR · séduisante · persuasive' },
  { id: 'e3a12335ddd040209a99002ee76b682f', label: 'Sophie', tag: 'FR · douce · bienveillante' },
  { id: '4f2a0684dd0247dda68f339738c780e6', label: 'Le narrateur', tag: 'FR · homme · grave · cinéma' },
];
export const DEFAULT_VOICE_ID = SCALOR_VOICES[0].id;
const SCALOR_IDS = new Set(SCALOR_VOICES.map((v) => v.id));

// ── Détection « voix africaine » ─────────────────────────────────────────────
// Trois signaux, du plus fiable au plus large :
//   1. ID curé à la main (AFRICAN_VOICE_IDS) → certitude 100 %.
//   2. Code langue africain (sw, wo, yo, ln…) présent dans voice.languages.
//   3. Mot-clé (africain, wolof, lingala, dakar…) dans le titre ou les tags.
// LIMITE CONNUE : une voix taguée uniquement « fr » est indistinguable d'une
// voix française d'Europe — elle ne sera classée africaine que via curation (1).
// Pour forcer une voix francophone africaine dans le groupe, ajoute son
// reference_id ci-dessous.
export const AFRICAN_VOICE_IDS = new Set([
  '498c39373700473b9e5251cb2f2049bc', // Dame africaine (Scalor)
]);

// Termes de recherche pour PEUPLER le groupe « Voix africaines » depuis TOUT le
// catalogue Fish au chargement (pas seulement les voix préchargées). L'app
// interroge le catalogue sur chacun de ces mots et verse les résultats dans le
// groupe. Édite cette liste pour élargir / affiner la couverture.
export const AFRICAN_QUERY_TERMS = [
  'afrique', 'africa', 'african', 'africain', 'afrikaans', 'wolof', 'lingala', 'swahili',
];

const AFRICAN_LANG_CODES = new Set([
  'sw', 'swa',        // swahili
  'wo', 'wol',        // wolof
  'yo', 'yor',        // yoruba
  'ig', 'ibo',        // igbo
  'ha', 'hau',        // haoussa
  'am', 'amh',        // amharique
  'ln', 'lin',        // lingala
  'zu', 'zul',        // zoulou
  'xh', 'xho',        // xhosa
  'af', 'afr',        // afrikaans
  'so', 'som',        // somali
  'rw', 'kin',        // kinyarwanda
  'mg', 'mlg',        // malgache
  'sn', 'sna',        // shona
  'ny', 'nya',        // chichewa
  'st', 'sot',        // sotho
  'tn', 'tsn',        // tswana
  'ts', 'tso',        // tsonga
  'bm', 'bam',        // bambara
  'ff', 'ful',        // peul / fulfulde
  'ee', 'ewe',        // éwé
  'ak', 'tw', 'twi',  // akan / twi
  'kg', 'kon',        // kikongo
  'lg', 'lug',        // luganda
  'ti', 'tir',        // tigrinya
  'om', 'orm',        // oromo
]);

const AFRICAN_KEYWORDS = /afric|afrik|afriq|wolof|yoruba|igbo|swahili|haoussa|hausa|lingala|zoulou|\bzulu|xhosa|amharic|amharique|bambara|\bpeul|fulani|fulfulde|nigeria|senegal|s[eé]n[eé]gal|ivoir|\bcongo|kinshasa|abidjan|dakar|cameroun|cameroon|\bghana|kenya|ethiop|[eé]thiop|afrikaans|kinyarwanda|malgache|somali|\bakan|\btwi\b|[eé]w[eé]|douala|yaound[eé]|bamako|lagos|nairobi|accra/i;

/** Vrai si la voix présente au moins un signal « africain ». */
export function isAfricanVoice(v) {
  if (!v) return false;
  if (v.id && AFRICAN_VOICE_IDS.has(v.id)) return true;
  const langs = Array.isArray(v.languages) ? v.languages : [];
  for (const l of langs) {
    if (AFRICAN_LANG_CODES.has(String(l).toLowerCase().trim())) return true;
  }
  const hay = `${v.label || v.title || ''} ${v.tag || ''} ${Array.isArray(v.tags) ? v.tags.join(' ') : ''}`;
  return AFRICAN_KEYWORDS.test(hay);
}

/** Normalise une voix brute Fish → { id, label, tag, sampleUrl, languages, african }. */
function mapFishVoice(v) {
  const languages = (v.languages || []).map((x) => String(x).toLowerCase());
  return {
    id: v.id,
    label: String(v.title || v.id.slice(0, 8)).slice(0, 60),
    tag: [languages.slice(0, 2).join('/'), ...(v.tags || []).slice(0, 2)].filter(Boolean).join(' · ').slice(0, 60),
    sampleUrl: String(v.sampleUrl || ''), // extrait officiel Fish (pré-écoute)
    languages,
    african: isAfricanVoice({ id: v.id, title: v.title, tags: v.tags, languages }),
  };
}

/** Déduplique une liste de voix par id (garde la première occurrence). */
function dedupeById(list) {
  const seen = new Set();
  const out = [];
  for (const v of list) {
    if (!v?.id || seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
  }
  return out;
}

// Cache module : UN chargement par session, partagé entre studios. Un résultat
// VIDE ou un échec n'est PAS mis en cache : on retentera au prochain montage.
let catalogPromise = null;
function fetchFishCatalog() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      try {
        // Ordre voulu : les voix FRANÇAISES populaires d'abord (le classement
        // de l'onglet Voix : Fille, Féminine, Mbappé, Lama Faché, Macron…),
        // puis le reste du catalogue mondial en complément. Sans le filtre fr
        // en tête, le top MONDIAL (annonceurs de jeux, voix russes/arabes)
        // écraserait les voix utiles au marché francophone.
        const pages = await Promise.allSettled([
          creativeApi.voice.list({ language: 'fr', sort: 'task_count', page: 1, pageSize: 48 }),
          creativeApi.voice.list({ language: 'fr', sort: 'task_count', page: 2, pageSize: 48 }),
          creativeApi.voice.list({ sort: 'task_count', page: 1, pageSize: 48 }),
          creativeApi.voice.list({ sort: 'task_count', page: 2, pageSize: 48 }),
        ]);
        const raw = pages.flatMap((p) => (p.status === 'fulfilled' ? p.value?.data?.voices || [] : []));
        const out = dedupeById(raw.filter((v) => v?.id && !SCALOR_IDS.has(v.id)).map(mapFishVoice));
        if (!out.length) catalogPromise = null; // vide → retry à la prochaine ouverture
        return out;
      } catch {
        catalogPromise = null; // échec réseau → retry à la prochaine ouverture
        return [];
      }
    })();
  }
  return catalogPromise;
}

// Peuplement du groupe africain : on cherche chaque terme de AFRICAN_QUERY_TERMS
// dans TOUT le catalogue Fish et on fusionne les résultats. Comme le cache
// catalogue : un résultat VIDE ou un échec n'est pas mis en cache (retry).
let africanPromise = null;
function fetchAfricanVoices() {
  if (!africanPromise) {
    africanPromise = (async () => {
      try {
        const pages = await Promise.allSettled(
          AFRICAN_QUERY_TERMS.map((q) => creativeApi.voice.list({ q, sort: 'task_count', page: 1, pageSize: 24 })),
        );
        const raw = pages.flatMap((p) => (p.status === 'fulfilled' ? p.value?.data?.voices || [] : []));
        // Chaque voix a matché un terme africain → on la marque africaine.
        const out = dedupeById(raw.filter((v) => v?.id && !SCALOR_IDS.has(v.id)).map(mapFishVoice))
          .map((v) => ({ ...v, african: true }));
        if (!out.length) africanPromise = null; // vide → retry à la prochaine ouverture
        return out;
      } catch {
        africanPromise = null; // échec réseau → retry
        return [];
      }
    })();
  }
  return africanPromise;
}

/**
 * Voix préchargées : { scalorVoices, fishVoices, africanVoices, loading }.
 * `fishVoices` reste la liste COMPLÈTE préchargée (compat LaunchStudio).
 * `africanVoices` regroupe les voix africaines (Scalor curées + Fish détectées).
 */
export function useFishVoices() {
  const [fishVoices, setFishVoices] = useState([]);
  const [africanSeed, setAfricanSeed] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    fetchFishCatalog().then((list) => { if (alive) { setFishVoices(list); setLoading(false); } });
    fetchAfricanVoices().then((list) => { if (alive) setAfricanSeed(list); });
    return () => { alive = false; };
  }, []);

  // Groupe africain = Scalor curées (en tête, badge) + Fish détectées dans le
  // préchargement + seed cherché dans tout le catalogue. dedupeById garde la
  // 1re occurrence → les voix Scalor priment sur les doublons du catalogue.
  const africanVoices = useMemo(() => {
    const scalorAfr = SCALOR_VOICES.filter(isAfricanVoice).map((v) => ({ ...v, scalor: true }));
    const fishAfr = fishVoices.filter((v) => v.african);
    return dedupeById([...scalorAfr, ...fishAfr, ...africanSeed]);
  }, [fishVoices, africanSeed]);

  return { scalorVoices: SCALOR_VOICES, fishVoices, africanVoices, loading };
}

/**
 * Recherche serveur dans TOUT le catalogue Fish (debouncée) + pagination.
 * Retourne { items, total, loading, loadMore, canLoadMore }. Q vide → inactif.
 */
function useVoiceSearch(query, { pageSize = 40, debounceMs = 350 } = {}) {
  const q = query.trim();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const reqRef = useRef(0);

  const run = useCallback(async (pg, append) => {
    const my = ++reqRef.current;
    setLoading(true);
    try {
      const res = await creativeApi.voice.list({ q: q || undefined, sort: 'task_count', page: pg, pageSize });
      if (my !== reqRef.current) return; // réponse obsolète → ignorée
      const d = res.data || {};
      const mapped = dedupeById((d.voices || []).filter((v) => v?.id && !SCALOR_IDS.has(v.id)).map(mapFishVoice));
      setTotal(Number(d.total) || mapped.length);
      setItems((prev) => (append ? dedupeById([...prev, ...mapped]) : mapped));
    } catch {
      if (my === reqRef.current && !append) { setItems([]); setTotal(0); }
    } finally {
      if (my === reqRef.current) setLoading(false);
    }
  }, [q, pageSize]);

  useEffect(() => {
    if (!q) { reqRef.current++; setItems([]); setTotal(0); setPage(1); setLoading(false); return; }
    const t = setTimeout(() => { setPage(1); run(1, false); }, debounceMs);
    return () => clearTimeout(t);
  }, [q, run, debounceMs]);

  const loadMore = useCallback(() => {
    if (loading) return;
    const next = page + 1;
    setPage(next);
    run(next, true);
  }, [loading, page, run]);

  const canLoadMore = !!q && items.length < total && !loading;
  return { items, total, loading, loadMore, canLoadMore };
}

// ── Pré-écoute d'une voix : extrait officiel Fish si dispo, sinon une courte
//    démo TTS générée à la volée. Cache module : chaque voix n'est générée
//    qu'une fois par session. Un seul audio à la fois. ──
const previewCache = new Map(); // voiceId -> url
let stopCurrentPreview = null;

/** Logique d'écoute réutilisable (bouton autonome + lignes du dropdown). */
function usePreview(voiceId, sampleUrl = '') {
  const [state, setState] = useState('idle'); // idle | loading | playing
  const audioRef = useRef(null);
  useEffect(() => () => { try { audioRef.current?.pause(); } catch { /* noop */ } }, []);

  const stop = useCallback(() => {
    try { audioRef.current?.pause(); } catch { /* noop */ }
    audioRef.current = null;
    setState('idle');
  }, []);

  const toggle = useCallback(async () => {
    if (state === 'playing') { stop(); return; }
    if (!voiceId || state === 'loading') return;
    try {
      stopCurrentPreview?.();
      stopCurrentPreview = stop;
      setState('loading');
      let url = previewCache.get(voiceId) || sampleUrl || '';
      if (!url) {
        const { data } = await creativeApi.voice.generate({
          text: 'Bonjour ! Voici un aperçu de ma voix pour vos vidéos Scalor.',
          referenceId: voiceId,
        });
        url = data?.url || '';
      }
      if (!url) throw new Error('sample-indisponible');
      previewCache.set(voiceId, url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setState('idle');
      await audio.play();
      setState('playing');
    } catch { setState('idle'); }
  }, [state, voiceId, sampleUrl, stop]);

  return { state, toggle };
}

export function VoicePreviewButton({ voiceId, dark = false, className = '' }) {
  const { fishVoices } = useFishVoices();
  const sampleUrl = fishVoices.find((v) => v.id === voiceId)?.sampleUrl || '';
  const { state, toggle } = usePreview(voiceId, sampleUrl);

  const base = dark
    ? 'h-8 w-8 rounded-md bg-card/5 border border-white/10 text-neutral-300 hover:bg-card/10'
    : 'h-9 w-9 rounded-xl border border-border text-muted-foreground hover:bg-background';
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!voiceId}
      title={state === 'playing' ? tp('Arrêter l’écoute') : tp('Écouter cette voix')}
      className={`shrink-0 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${base} ${className}`}
    >
      {state === 'loading' ? <Loader2 size={14} className="animate-spin" />
        : state === 'playing' ? <Square size={12} className="fill-current" />
          : <Play size={14} className="ml-0.5" />}
    </button>
  );
}

// ── Sélecteur de voix (dropdown personnalisé, rendu riche) ───────────────────
// API de props inchangée vs l'ancien <select> : { value, onChange,
// includeModelVoice, dark, className } — les 4 studios n'ont rien à modifier.
// Le panneau est rendu via un portail (position: fixed) pour ne jamais être
// coupé par un conteneur en overflow (ex. le panneau sombre de ProEditor).

function themeTokens(dark) {
  return dark
    ? {
        panel: 'bg-neutral-900 border border-white/10 text-neutral-100',
        header: 'text-neutral-500',
        row: 'hover:bg-white/5',
        rowSel: 'bg-white/10',
        sub: 'text-neutral-400',
        input: 'bg-white/5 border-white/10 text-neutral-100 placeholder:text-neutral-500 focus:border-white/25',
        badge: 'bg-white/10 text-neutral-200',
        avatar: 'bg-white/10 text-neutral-300',
        divider: 'border-white/10',
        more: 'border-white/10 text-neutral-300 hover:bg-white/5',
        openRing: 'ring-1 ring-white/25',
        check: 'text-neutral-100',
      }
    : {
        panel: 'bg-card border border-border text-foreground',
        header: 'text-muted-foreground',
        row: 'hover:bg-muted',
        rowSel: 'bg-primary-50',
        sub: 'text-muted-foreground',
        input: 'bg-background border-border text-foreground placeholder:text-gray-400 focus:border-gray-300',
        badge: 'bg-primary-50 text-primary',
        avatar: 'bg-muted text-muted-foreground',
        divider: 'border-border',
        more: 'border-border text-muted-foreground hover:bg-muted',
        openRing: 'ring-2 ring-gray-200',
        check: 'text-primary',
      };
}

function GroupHeader({ icon: Icon, children, T }) {
  return (
    <p className={`flex items-center gap-1.5 px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider ${T.header}`}>
      {Icon && <Icon size={11} />} {children}
    </p>
  );
}

function VoiceRow({ v, selected, dark, T, onPick }) {
  const initial = (v.label || '?').charAt(0).toUpperCase();
  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => onPick(v.id)}
      className={`group flex items-center gap-2.5 px-2 py-1.5 mx-1 rounded-lg cursor-pointer transition-colors ${selected ? T.rowSel : T.row}`}
    >
      <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[11px] font-bold ${T.avatar}`}>
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold truncate">{v.label}</span>
          {v.scalor && (
            <span className={`shrink-0 text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded ${T.badge}`}>Scalor</span>
          )}
        </div>
        {v.tag && <p className={`text-[10.5px] truncate ${T.sub}`}>{v.tag}</p>}
      </div>
      {selected && <Check size={15} className={`shrink-0 ${T.check}`} />}
      <span onClick={(e) => e.stopPropagation()} className="shrink-0">
        <RowPreview voiceId={v.id} sampleUrl={v.sampleUrl} dark={dark} />
      </span>
    </div>
  );
}

function RowPreview({ voiceId, sampleUrl, dark }) {
  const { state, toggle } = usePreview(voiceId, sampleUrl);
  const base = dark
    ? 'text-neutral-400 hover:bg-white/10 hover:text-neutral-100'
    : 'text-muted-foreground hover:bg-gray-200 hover:text-foreground';
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!voiceId}
      title={state === 'playing' ? tp('Arrêter l’écoute') : tp('Écouter cette voix')}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition disabled:opacity-30 ${base}`}
    >
      {state === 'loading' ? <Loader2 size={13} className="animate-spin" />
        : state === 'playing' ? <Square size={11} className="fill-current" />
          : <Play size={13} className="ml-0.5" />}
    </button>
  );
}

export function VoiceSelect({ value, onChange, includeModelVoice = false, dark = false, className = '' }) {
  const { scalorVoices, fishVoices, africanVoices, loading } = useFishVoices();
  const T = themeTokens(dark);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  // Parcours paginé (recherche vide) : on continue le catalogue mondial au-delà
  // des voix préchargées, en fusionnant sans doublon.
  const [browseExtra, setBrowseExtra] = useState([]);
  const [browsePage, setBrowsePage] = useState(2); // préchargement = pages 1‑2
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseDone, setBrowseDone] = useState(false);
  const loadBrowseMore = useCallback(async () => {
    if (browseLoading || browseDone) return;
    const next = browsePage + 1;
    setBrowseLoading(true);
    try {
      const res = await creativeApi.voice.list({ sort: 'task_count', page: next, pageSize: 48 });
      const list = res.data?.voices || [];
      const mapped = list.filter((v) => v?.id && !SCALOR_IDS.has(v.id)).map(mapFishVoice);
      setBrowseExtra((prev) => dedupeById([...prev, ...mapped]));
      setBrowsePage(next);
      if (list.length < 48) setBrowseDone(true);
    } catch { setBrowseDone(true); }
    finally { setBrowseLoading(false); }
  }, [browseLoading, browseDone, browsePage]);

  // Recherche serveur (recherche non vide) : couvre TOUT le catalogue.
  const search = useVoiceSearch(query);
  const isSearching = query.trim().length > 0;

  // Index id → voix (pour le libellé du bouton).
  const byId = useMemo(() => {
    const m = new Map();
    [...africanVoices, ...scalorVoices, ...fishVoices, ...browseExtra, ...search.items].forEach((v) => { if (!m.has(v.id)) m.set(v.id, v); });
    return m;
  }, [africanVoices, scalorVoices, fishVoices, browseExtra, search.items]);

  const selectedLabel = value
    ? (byId.get(value)?.label || tp('Voix personnalisée'))
    : (includeModelVoice ? tp('Voix du modèle (neutre)') : (scalorVoices[0]?.label || tp('Choisir une voix')));

  // Groupes affichés selon le mode.
  const groups = useMemo(() => {
    const ql = query.trim().toLowerCase();
    const match = (v) => !ql || (v.label || '').toLowerCase().includes(ql) || (v.tag || '').toLowerCase().includes(ql);
    if (isSearching) {
      const scalorMatched = scalorVoices.filter(match);
      const afr = dedupeById([
        ...scalorMatched.filter(isAfricanVoice).map((v) => ({ ...v, scalor: true })),
        ...search.items.filter((v) => v.african),
      ]);
      const afrIds = new Set(afr.map((v) => v.id));
      return {
        african: afr,
        scalor: scalorMatched.filter((v) => !isAfricanVoice(v) && !afrIds.has(v.id)),
        fish: search.items.filter((v) => !v.african && !afrIds.has(v.id)),
      };
    }
    const allFish = dedupeById([...fishVoices, ...browseExtra]);
    const afrIds = new Set(africanVoices.map((v) => v.id));
    const afrExtra = allFish.filter((v) => v.african && !afrIds.has(v.id));
    return {
      african: [...africanVoices, ...afrExtra],
      scalor: scalorVoices.filter((v) => !afrIds.has(v.id) && !isAfricanVoice(v)),
      fish: allFish.filter((v) => !v.african && !afrIds.has(v.id)),
    };
  }, [isSearching, query, scalorVoices, fishVoices, browseExtra, africanVoices, search.items]);

  const totalShown = groups.african.length + groups.scalor.length + groups.fish.length;
  const showLoading = isSearching ? (search.loading && !search.items.length) : (loading && !fishVoices.length);
  const canLoadMore = isSearching ? search.canLoadMore : !browseDone;
  const loadingMore = isSearching ? search.loading : browseLoading;
  const onLoadMore = isSearching ? search.loadMore : loadBrowseMore;

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, bottom: r.bottom, width: r.width });
  }, []);

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    place();
    const onMove = () => place();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    const t = setTimeout(() => searchRef.current?.focus(), 10);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
      clearTimeout(t);
    };
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      if (e.target.closest?.('[data-voice-pop]')) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (id) => { onChange?.(id); setOpen(false); };

  // Position du panneau (fixed) : ouvre vers le bas, ou vers le haut s'il
  // manque de place. Largeur ≥ 288px, clampée dans le viewport.
  const panel = (() => {
    if (!open || !rect || typeof window === 'undefined') return null;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.max(rect.width, 288);
    const left = Math.max(8, Math.min(rect.left, vw - width - 8));
    const spaceBelow = vh - rect.bottom;
    const openUp = spaceBelow < 320 && rect.top > spaceBelow;
    const style = openUp
      ? { position: 'fixed', left, bottom: vh - rect.top + 4, width, zIndex: 60, maxHeight: Math.min(440, rect.top - 16) }
      : { position: 'fixed', left, top: rect.bottom + 4, width, zIndex: 60, maxHeight: Math.min(440, spaceBelow - 16) };

    const modelMatches = includeModelVoice && (!isSearching || tp('Voix du modèle (neutre)').toLowerCase().includes(query.trim().toLowerCase()));

    return createPortal(
      <div data-voice-pop style={style} className={`rounded-xl shadow-xl flex flex-col overflow-hidden ${T.panel}`}>
        <div className={`p-2 border-b ${T.divider}`}>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tp('Rechercher dans tout le catalogue…')}
              className={`w-full h-8 pl-8 pr-7 rounded-lg text-[12.5px] border outline-none transition ${T.input}`}
            />
            {search.loading && <Loader2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin opacity-60" />}
            {!search.loading && query && (
              <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        <div className="voice-scroll overflow-y-auto py-1 flex-1">
          <style>{`.voice-scroll::-webkit-scrollbar{width:7px}.voice-scroll::-webkit-scrollbar-thumb{background:${dark ? 'rgba(255,255,255,.15)' : '#e5e7eb'};border-radius:9999px}`}</style>

          {groups.african.length > 0 && (
            <>
              <GroupHeader icon={Globe} T={T}>{tp('Voix africaines')}</GroupHeader>
              {groups.african.map((v) => (
                <VoiceRow key={`afr-${v.id}`} v={v} selected={value === v.id} dark={dark} T={T} onPick={pick} />
              ))}
            </>
          )}

          {(groups.scalor.length > 0 || modelMatches) && (
            <>
              <GroupHeader T={T}>{tp('Voix Scalor (recommandées)')}</GroupHeader>
              {groups.scalor.map((v) => (
                <VoiceRow key={`scalor-${v.id}`} v={{ ...v, scalor: true }} selected={value === v.id} dark={dark} T={T} onPick={pick} />
              ))}
              {modelMatches && (
                <div
                  role="option"
                  aria-selected={!value}
                  onClick={() => pick('')}
                  className={`flex items-center gap-2.5 px-2 py-1.5 mx-1 rounded-lg cursor-pointer transition-colors ${!value ? T.rowSel : T.row}`}
                >
                  <span className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${T.avatar}`}>
                    <Globe size={13} />
                  </span>
                  <span className="text-[13px] font-semibold flex-1 min-w-0 truncate">{tp('Voix du modèle (neutre)')}</span>
                  {!value && <Check size={15} className={`shrink-0 ${T.check}`} />}
                </div>
              )}
            </>
          )}

          {groups.fish.length > 0 && (
            <>
              <GroupHeader T={T}>{isSearching ? tp('Résultats du catalogue') : tp('Catalogue Fish Audio')}</GroupHeader>
              {groups.fish.map((v) => (
                <VoiceRow key={`fish-${v.id}`} v={v} selected={value === v.id} dark={dark} T={T} onPick={pick} />
              ))}
            </>
          )}

          {showLoading && (
            <div className={`flex items-center justify-center gap-2 py-4 text-[12px] ${T.sub}`}>
              <Loader2 size={14} className="animate-spin" /> {isSearching ? tp('Recherche…') : tp('Chargement du catalogue…')}
            </div>
          )}
          {!showLoading && totalShown === 0 && (
            <p className={`text-center text-[12px] py-6 ${T.sub}`}>{tp('Aucune voix ne correspond.')}</p>
          )}

          {canLoadMore && totalShown > 0 && (
            <div className="px-2 pt-1.5 pb-1">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className={`w-full h-9 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 border transition disabled:opacity-50 ${T.more}`}
              >
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {tp('Charger plus de voix')}
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body,
    );
  })();

  return (
    <div ref={wrapRef} className={`relative ${className} ${open ? T.openRing : ''}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full h-full flex items-center gap-2 text-left bg-transparent outline-none cursor-pointer"
      >
        <span className="truncate flex-1 min-w-0">{selectedLabel}</span>
        <ChevronDown size={14} className={`shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {panel}
    </div>
  );
}

export default VoiceSelect;
