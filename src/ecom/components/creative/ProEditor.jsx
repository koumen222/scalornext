import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  X, Play, Pause, Scissors, ZoomIn, ZoomOut, Trash2, Copy,
  Film, Image as ImageIcon, Mic, Music, Upload, Type, Loader2, Sparkles, Wand2,
  Download, Save, Video as VideoIcon, Layers, Maximize2, Minimize2,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { CostChip, featureCost } from './creativeShared.jsx';
import { TRANSITIONS, CAPTION_STYLES, CAPTION_ANIMS, CAPTION_POSITIONS, CAPTION_FONTS, ACCENT_SHAPES, accentShape, captionColor, captionFontCss } from './montageStyles.js';

/* ─────────────────────────────────────────────────────────────────────────────
   Éditeur Pro — volontairement MINIMAL : 3 zones seulement.
   1. Aperçu central (sous-titre draggable + poignée de taille).
   2. UN panneau droit, DEUX onglets : « Plan » (tout ce qui concerne le plan
      sélectionné + ajout de plans) et « Style » (réglages globaux : sous-titres,
      musique, voix).
   3. Timeline 2 pistes (vidéo, musique) — le texte d'un plan est signalé par un
      badge T sur le clip, édité dans l'onglet Plan.
   ──────────────────────────────────────────────────────────────────────────── */

const uid = () => `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtTime = (s) => {
  const t = Math.max(0, s || 0);
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  const cs = Math.floor((t - Math.floor(t)) * 100);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};
// Répliques d'aperçu = même logique que le moteur : N lignes EXACTES par
// réplique (dynamique : 3 mots/ligne ; bloc : ~30 caractères/ligne).
const buildCaptionEvents = (text, mode = 'dynamic', nLines = 1) => {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ').filter(Boolean);
  const lines = [];
  if (mode === 'block') {
    let line = '';
    for (const wd of words) {
      if ((`${line} ${wd}`).trim().length > 30 && line) { lines.push(line); line = wd; }
      else line = (`${line} ${wd}`).trim();
    }
    if (line) lines.push(line);
  } else {
    for (let i = 0; i < words.length; i += 3) lines.push(words.slice(i, i + 3).join(' '));
  }
  if (!lines.length) lines.push(clean);
  const n = Math.max(1, Math.min(3, Math.round(Number(nLines) || 1)));
  const out = [];
  for (let i = 0; i < lines.length; i += n) out.push(lines.slice(i, i + n).join('\n'));
  return out;
};
const readDur = (url, kind) => new Promise((res) => {
  try {
    const el = document.createElement(kind === 'video' ? 'video' : 'audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => res(Number.isFinite(el.duration) && el.duration > 0 ? el.duration : null);
    el.onerror = () => res(null);
    el.src = url;
  } catch { res(null); }
});
const mkScene = (p = {}) => ({
  id: uid(), videoUrl: '', videoPoster: '', imageUrl: '', audioUrl: '',
  voiceText: '', subtitleText: '', durationSec: 5, trimStart: 0, srcDuration: 0,
  volume: 1, fadeIn: 0, fadeOut: 0, showProduct: true, overlays: [], busy: '', ...p,
});

// ── Galerie (thème sombre de l'éditeur) : choisir un clip ou une voix off
//    déjà générés — mêmes données que la galerie du studio. ──
function DarkGalleryPicker({ open, type, onPick, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setLoading(true);
    creativeApi.gallery.list({ type, limit: 60 })
      .then((res) => { if (alive) setItems(res?.data?.assets || res?.data?.items || res?.data?.data || []); })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [open, type]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-12 border-b border-white/10">
          <p className="text-[13px] font-bold text-white">{type === 'video' ? tp('Choisir un clip') : tp('Choisir une voix off')}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:bg-card/10"><X size={16} /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-neutral-500" /></div>
          ) : !items.length ? (
            <p className="py-16 text-center text-[13px] text-neutral-500">{tp('Aucun contenu dans la galerie pour le moment.')}</p>
          ) : type === 'video' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.filter((it) => it.videoUrl).map((it) => (
                <button key={it._id} onClick={() => onPick(it)}
                  className="group text-left rounded-xl overflow-hidden border border-white/10 hover:border-primary/40 transition">
                  <div className="aspect-video bg-black flex items-center justify-center overflow-hidden">
                    {it.thumbnailUrl || it.imageUrl
                      ? <img src={it.thumbnailUrl || it.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <Film size={22} className="text-white/50" />}
                  </div>
                  <p className="px-2 py-1.5 text-[11px] font-medium text-neutral-300 truncate">{it.label || it.title || it.productName || tp('Clip')}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {items.filter((it) => it.audioUrl).map((it) => (
                <div key={it._id} className="flex items-center gap-3 rounded-xl border border-white/10 p-2.5">
                  <audio src={it.audioUrl} controls className="h-8 flex-1" />
                  <button onClick={() => onPick(it)} className="h-8 px-3 rounded-lg bg-primary text-white text-[12px] font-semibold hover:bg-primary">{tp('Choisir')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Voix off : catalogue unifié (voix Scalor priorisées + tout Fish Audio).
import { VoiceSelect, VoicePreviewButton } from './voiceCatalog.jsx';

export default function ProEditor({
  scenes, setScenes, format, subtitlesOn, setSubtitlesOn, captionMode, setCaptionMode,
  captionStyle = 'classic', setCaptionStyle, captionAnim = 'pop', setCaptionAnim,
  captionPosition = 'bottom', setCaptionPosition,
  captionOffsetPct = null, setCaptionOffsetPct,
  captionScale = 1, setCaptionScale, captionMaxLines = 1, setCaptionMaxLines,
  captionFont = 'sans', setCaptionFont, captionCase = 'none', setCaptionCase,
  transition, setTransition, narrationUrl, musicUrl, setMusicUrl, musicVolume, setMusicVolume,
  onAddMusic, productImage, subject, productContext, voiceRefId, setVoiceRefId,
  onExport, rendering, progress, resultUrl, onNewMontage, onClose, onDownload, onSave, saved,
}) {
  const [pxPerSec, setPxPerSec] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Plan de travail ajustable : largeur du panneau (glissière verticale) et
  // hauteur de la timeline (glissière horizontale), comme un vrai éditeur.
  const [panelW, setPanelW] = useState(320);
  const [timelineH, setTimelineH] = useState(264);
  const [fullPreview, setFullPreview] = useState(false); // aperçu plein écran (Échap pour sortir)
  // Taille réelle de la zone d'aperçu. Le cadre n'a que des enfants en position
  // absolue (couches de transition superposées) : sans dimensions explicites il
  // s'effondre à 0×0. On mesure donc la scène et on fixe le cadre en pixels.
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setStageSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const startPanelResize = (e) => {
    e.preventDefault();
    const startX = e.clientX; const startW = panelW;
    const move = (ev) => setPanelW(clamp(startW + (startX - ev.clientX), 240, 560));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const startTimelineResize = (e) => {
    e.preventDefault();
    const startY = e.clientY; const startH = timelineH;
    const move = (ev) => setTimelineH(clamp(startH + (startY - ev.clientY), 140, 440));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const musicRef = useRef(null);
  // Musique de fond audible pendant la lecture de l'aperçu (comme au rendu).
  useEffect(() => {
    const el = musicRef.current;
    if (!el) return;
    const v = Number(musicVolume);
    el.volume = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.5));
    if (playing && musicUrl) el.play().catch(() => {});
    else el.pause();
  }, [playing, musicUrl, musicVolume]);
  const [selId, setSelId] = useState(scenes[0]?.id || null);
  const [tab, setTab] = useState('plan'); // 'plan' | 'style'
  const [genPrompt, setGenPrompt] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [presets, setPresets] = useState([]);
  // Galerie (clips / voix) pour le plan sélectionné — comme au studio.
  const [picker, setPicker] = useState({ open: false, type: 'video', sceneId: null });
  const [movingId, setMovingId] = useState(null);
  const [moveDx, setMoveDx] = useState(0);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const narrRef = useRef(null);
  const rafRef = useRef(null);
  const baseRef = useRef(0);
  const wallRef = useRef(0);
  const dragRef = useRef(null);

  const durOf = (s) => Math.max(0.3, Number(s.durationSec) || 4);
  const { starts, total } = useMemo(() => {
    const st = []; let acc = 0;
    for (const s of scenes) { st.push(acc); acc += durOf(s); }
    return { starts: st, total: acc };
  }, [scenes]);
  const activeIndex = useMemo(() => {
    if (!scenes.length) return 0;
    for (let i = 0; i < scenes.length; i += 1) if (currentTime < starts[i] + durOf(scenes[i]) - 1e-3) return i;
    return scenes.length - 1;
  }, [currentTime, scenes, starts]);
  const activeScene = scenes[activeIndex];
  const selScene = scenes.find((s) => s.id === selId) || activeScene;
  const aspect = format === '9:16' ? '9 / 16' : format === '1:1' ? '1 / 1' : '16 / 9';
  // Dimensions explicites du cadre d'aperçu : le plus grand rectangle au bon
  // ratio qui tient dans la scène mesurée (letterbox). Repli CSS avant mesure.
  const previewBox = useMemo(() => {
    const [arW, arH] = format === '9:16' ? [9, 16] : format === '1:1' ? [1, 1] : [16, 9];
    const { w: W, h: H } = stageSize;
    if (!W || !H) return { aspectRatio: aspect, height: '100%', maxWidth: '100%' };
    const s = Math.min(W / arW, H / arH);
    return { width: Math.floor(arW * s), height: Math.floor(arH * s) };
  }, [stageSize, format, aspect]);
  const trackW = Math.max(total * pxPerSec + 8, 320);

  const activeCaption = useMemo(() => {
    const sc = scenes[activeIndex];
    if (!subtitlesOn || !sc) return { text: '', key: -1 };
    const cap = (sc.subtitleText || sc.voiceText || '').trim();
    if (!cap) return { text: '', key: -1 };
    const ch = buildCaptionEvents(cap, captionMode, captionMaxLines);
    if (!ch.length) return { text: cap, key: `${sc.id}0` };
    const local = clamp(currentTime - starts[activeIndex], 0, durOf(sc));
    const idx = Math.min(ch.length - 1, Math.floor(local / (durOf(sc) / ch.length)));
    return { text: ch[idx], key: `${sc.id}-${idx}` };
  }, [scenes, activeIndex, currentTime, starts, subtitlesOn, captionMode, captionMaxLines]);

  const syncMedia = useCallback((play) => {
    const sc = scenes[activeIndex];
    if (!sc) return;
    const off = clamp(currentTime - starts[activeIndex], 0, durOf(sc));
    if (narrationUrl && narrRef.current) {
      try { narrRef.current.currentTime = clamp(currentTime, 0, total); } catch { /* noop */ }
      if (play) narrRef.current.play().catch(() => {}); else narrRef.current.pause();
    }
    if (audioRef.current) {
      if (!narrationUrl && sc.audioUrl) {
        if (audioRef.current.getAttribute('data-src') !== sc.audioUrl) { audioRef.current.src = sc.audioUrl; audioRef.current.setAttribute('data-src', sc.audioUrl); }
        try { audioRef.current.currentTime = off; audioRef.current.volume = clamp(Number(sc.volume) == null ? 1 : Number(sc.volume), 0, 1); } catch { /* noop */ }
        if (play) audioRef.current.play().catch(() => {}); else audioRef.current.pause();
      } else { audioRef.current.pause(); }
    }
    if (sc.videoUrl && videoRef.current) {
      videoRef.current.muted = !!narrationUrl || !!sc.audioUrl;
      try { videoRef.current.currentTime = (Number(sc.trimStart) || 0) + off; } catch { /* noop */ }
      if (play) videoRef.current.play().catch(() => {}); else videoRef.current.pause();
    }
  }, [scenes, activeIndex, currentTime, starts, total, narrationUrl]);

  useEffect(() => { syncMedia(playing); }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!playing) syncMedia(false); }, [currentTime, playing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return undefined; }
    baseRef.current = currentTime >= total ? 0 : currentTime;
    wallRef.current = performance.now();
    if (currentTime >= total) setCurrentTime(0);
    syncMedia(true);
    const tick = () => {
      const t = baseRef.current + (performance.now() - wallRef.current) / 1000;
      if (t >= total) { setCurrentTime(total); setPlaying(false); return; }
      setCurrentTime(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  useEffect(() => {
    let alive = true;
    creativeApi.montage.presets().then((r) => { if (alive) setPresets(r?.data?.presets || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const seekTo = (t) => { setPlaying(false); setCurrentTime(clamp(t, 0, total || 0.001)); };
  const seekFromEvent = (e) => { const h = e.currentTarget; const r = h.getBoundingClientRect(); seekTo((e.clientX - r.left + (h.scrollLeft || 0)) / pxPerSec); };

  const patch = (id, p) => setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const removeScene = (id) => setScenes((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const duplicate = (id) => setScenes((prev) => { const i = prev.findIndex((s) => s.id === id); if (i < 0) return prev; const c = { ...prev[i], id: uid() }; return [...prev.slice(0, i + 1), c, ...prev.slice(i + 1)]; });
  const splitAtPlayhead = () => {
    const i = activeIndex; const sc = scenes[i]; if (!sc) return;
    const o = currentTime - starts[i];
    if (o < 0.3 || o > durOf(sc) - 0.3) return;
    const first = { ...sc, durationSec: Math.round(o * 10) / 10 };
    const second = { ...sc, id: uid(), durationSec: Math.round((durOf(sc) - o) * 10) / 10, trimStart: sc.videoUrl ? Math.round(((Number(sc.trimStart) || 0) + o) * 10) / 10 : 0, audioUrl: '' };
    setScenes((prev) => { const n = [...prev]; n.splice(i, 1, first, second); return n; });
    setSelId(second.id);
  };

  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current; if (!d) return;
      if (d.mode === 'scrub') {
        const r = d.el.getBoundingClientRect();
        setPlaying(false);
        setCurrentTime(clamp((e.clientX - r.left) / pxPerSec, 0, total || 0.001));
        return;
      }
      if (d.mode === 'move') { d.dx = e.clientX - d.startX; setMoveDx(d.dx); return; }
      const deltaSec = (e.clientX - d.startX) / pxPerSec;
      setScenes((prev) => prev.map((s) => {
        if (s.id !== d.id) return s;
        const src = s.videoUrl ? (Number(s.srcDuration) || 0) : 0;
        if (d.edge === 'r') { const maxDur = s.videoUrl && src > 0 ? src - (Number(s.trimStart) || 0) : 30; const nd = clamp(d.origDur + deltaSec, 0.5, Math.max(0.5, maxDur)); return { ...s, durationSec: Math.round(nd * 10) / 10 }; }
        const shift = clamp(deltaSec, -(d.origTrim), d.origDur - 0.5); const nd = d.origDur - shift; const nt = s.videoUrl ? Math.max(0, d.origTrim + shift) : 0;
        return { ...s, durationSec: Math.round(nd * 10) / 10, trimStart: Math.round(nt * 10) / 10 };
      }));
    };
    const onUp = () => {
      const d = dragRef.current;
      if (d && d.mode === 'move' && Math.abs(d.dx || 0) > 6) {
        const dropCenter = starts[d.index] + (d.dx / pxPerSec) + d.dur / 2;
        setScenes((prev) => {
          if (d.index < 0 || d.index >= prev.length) return prev;
          const arr = [...prev];
          const [item] = arr.splice(d.index, 1);
          let acc = 0; let insertAt = arr.length;
          for (let k = 0; k < arr.length; k += 1) {
            const c = acc + durOf(arr[k]) / 2;
            if (dropCenter < c) { insertAt = k; break; }
            acc += durOf(arr[k]);
          }
          arr.splice(insertAt, 0, item);
          return arr;
        });
      }
      dragRef.current = null; setMovingId(null); setMoveDx(0);
    };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [pxPerSec, setScenes, total, starts]);
  const startTrim = (e, s, edge) => { e.stopPropagation(); e.preventDefault(); dragRef.current = { id: s.id, edge, startX: e.clientX, origDur: durOf(s), origTrim: Number(s.trimStart) || 0 }; setSelId(s.id); };
  const startMove = (e, s, index) => { e.stopPropagation(); dragRef.current = { mode: 'move', id: s.id, index, startX: e.clientX, dur: durOf(s), dx: 0 }; setMovingId(s.id); setSelId(s.id); };
  const startScrub = (e) => { dragRef.current = { mode: 'scrub', el: e.currentTarget }; const r = e.currentTarget.getBoundingClientRect(); setPlaying(false); setCurrentTime(clamp((e.clientX - r.left) / pxPerSec, 0, total || 0.001)); };

  // ── Raccourcis clavier façon logiciel de montage ──
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target?.isContentEditable) return;
      if (e.code === 'Escape') { setFullPreview(false); }
      else if (e.code === 'Space') { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.code === 'Delete' || e.code === 'Backspace') { if (selScene) removeScene(selScene.id); }
      else if ((e.key === 's' || e.key === 'S') || (e.key.toLowerCase() === 'b' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); splitAtPlayhead(); }
      else if (e.key.toLowerCase() === 'd' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); if (selScene) duplicate(selScene.id); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); seekTo(currentTime - (e.shiftKey ? 1 : 0.1)); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); seekTo(currentTime + (e.shiftKey ? 1 : 0.1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selId, currentTime, scenes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ajout de média ──
  const addUpload = async (file, kind) => {
    if (!file) return; setBusy('add'); setErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      const dur = await readDur(data.url, kind === 'image' ? 'audio' : 'video');
      const sc = mkScene(kind === 'image'
        ? { imageUrl: data.url, durationSec: 4 }
        : { videoUrl: data.url, durationSec: dur ? Math.round(dur * 10) / 10 : 5, srcDuration: dur ? Math.round(dur * 10) / 10 : 0 });
      setScenes((prev) => [...prev, sc]); setSelId(sc.id);
    } catch (e) { setErr(e?.response?.data?.message || e.message); } finally { setBusy(''); }
  };
  const genClip = async () => {
    const prompt = genPrompt.trim();
    if (!productImage && !prompt) { setErr(tp('Importe un produit ou décris le plan à générer.')); return; }
    setBusy('gen'); setErr('');
    try {
      const { data } = await creativeApi.video.generateScene({ mode: 'scene', prompt, scenario: '', sourceUrl: productImage || null, showProduct: !!productImage, subject, productContext, durationSec: 5 });
      const url = data?.videoUrl || '';
      if (!data?.success || !url) throw new Error(data?.message || tp('Génération impossible'));
      const dur = await readDur(url, 'video');
      const sc = mkScene({ videoUrl: url, durationSec: dur ? Math.round(dur * 10) / 10 : 5, srcDuration: dur ? Math.round(dur * 10) / 10 : 0, clipPrompt: prompt });
      setScenes((prev) => [...prev, sc]); setSelId(sc.id); setGenPrompt('');
    } catch (e) { setErr(e?.response?.data?.message || e.message); } finally { setBusy(''); }
  };
  // ── Contenu d'UN plan par IA : remplace le visuel du plan sélectionné.
  //    Même contrat de prompt que le studio (generateVisualCore) : la phrase
  //    prononcée est illustrée littéralement ; genMode 'image' = image IA éco. ──
  const genSceneContent = async (id) => {
    const sc = scenes.find((s) => s.id === id); if (!sc) return;
    const asImage = sc.genMode === 'image';
    const prompt = (sc.clipPrompt || '').trim();
    const voice = String(sc.voiceText || sc.subtitleText || '').trim();
    const useProduct = sc.showProduct !== false && !!productImage;
    if (!useProduct && prompt.length < 8 && voice.length < 8) { setErr(tp('Décris le plan (ou écris son texte/sous-titre) pour générer par IA.')); return; }
    patch(id, { busy: 'gen' }); setErr('');
    try {
      const { data } = await creativeApi.video.generateScene({
        mode: 'scene', prompt, scenario: '',
        ...(asImage ? { stage: 'character' } : {}),
        voiceoverText: voice,
        sourceUrl: useProduct ? productImage : null,
        showProduct: useProduct,
        subject, productContext,
        durationSec: Math.max(3, Math.min(6, Math.round(durOf(sc)))),
      });
      if (asImage) {
        const img = data?.startImage || '';
        if (!data?.success || !img) throw new Error(data?.message || tp('Génération de l’image impossible'));
        patch(id, { imageUrl: img, videoUrl: '', videoPoster: '', trimStart: 0, busy: '' });
      } else {
        const url = data?.videoUrl || '';
        if (!data?.success || !url) throw new Error(data?.message || tp('Génération du clip impossible'));
        const dur = await readDur(url, 'video');
        patch(id, { videoUrl: url, imageUrl: '', trimStart: 0, busy: '', ...(dur ? { srcDuration: Math.round(dur * 10) / 10 } : {}) });
      }
    } catch (e) { setErr(e?.response?.data?.message || e.message); patch(id, { busy: '' }); }
  };
  // ── Remplacement du média du plan sélectionné : upload (clip/image) ──
  const replaceUpload = async (id, file) => {
    if (!file) return;
    const sc = scenes.find((s) => s.id === id); if (!sc) return;
    const isImage = String(file.type || '').startsWith('image');
    patch(id, { busy: 'up' }); setErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      if (isImage) patch(id, { imageUrl: data.url, videoUrl: '', videoPoster: '', trimStart: 0, genMode: 'image', busy: '' });
      else {
        const dur = await readDur(data.url, 'video');
        patch(id, {
          videoUrl: data.url, imageUrl: '', trimStart: 0, genMode: 'video', busy: '',
          ...(dur ? { srcDuration: Math.round(dur * 10) / 10 } : {}),
          // Sans voix, le plan épouse le clip ; avec voix, la voix reste maîtresse.
          ...(dur && !sc.audioUrl ? { durationSec: Math.round(dur * 10) / 10 } : {}),
        });
      }
    } catch (e) { setErr(e?.response?.data?.message || e.message); patch(id, { busy: '' }); }
  };
  // ── Voix off du plan : upload d'un fichier audio ──
  const uploadVoiceFile = async (id, file) => {
    if (!file) return;
    patch(id, { busy: 'voice' }); setErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      const dur = await readDur(data.url, 'audio');
      patch(id, { audioUrl: data.url, busy: '', ...(dur ? { durationSec: Math.max(1.2, Math.round((dur + 0.1) * 10) / 10) } : {}) });
    } catch (e) { setErr(e?.response?.data?.message || e.message); patch(id, { busy: '' }); }
  };
  // ── Choix depuis la galerie (clip ou voix) pour le plan visé ──
  const handleGalleryPick = async (it) => {
    const id = picker.sceneId; const type = picker.type;
    setPicker({ open: false, type: 'video', sceneId: null });
    if (!id || !it) return;
    const sc = scenes.find((s) => s.id === id); if (!sc) return;
    try {
      if (type === 'video' && it.videoUrl) {
        const dur = await readDur(it.videoUrl, 'video');
        patch(id, {
          videoUrl: it.videoUrl, imageUrl: '', videoPoster: it.thumbnailUrl || it.imageUrl || '', trimStart: 0, genMode: 'video',
          ...(dur ? { srcDuration: Math.round(dur * 10) / 10 } : {}),
          ...(dur && !sc.audioUrl ? { durationSec: Math.round(dur * 10) / 10 } : {}),
        });
      } else if (type === 'audio' && it.audioUrl) {
        const dur = await readDur(it.audioUrl, 'audio');
        patch(id, { audioUrl: it.audioUrl, ...(dur ? { durationSec: Math.max(1.2, Math.round((dur + 0.1) * 10) / 10) } : {}) });
      }
    } catch { /* le média reste inchangé */ }
  };
  // ── Images superposées (logo, sticker…) sur le plan sélectionné ──
  const patchOverlay = (sceneId, k, p) => setScenes((prev) => prev.map((s) => (s.id === sceneId
    ? { ...s, overlays: (s.overlays || []).map((o, j) => (j === k ? { ...o, ...p } : o)) }
    : s)));
  const addOverlay = async (file) => {
    if (!file || !selScene) return; setBusy('ov'); setErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      patch(selScene.id, { overlays: [...(selScene.overlays || []), { url: data.url, xPct: 50, yPct: 30, wPct: 35 }] });
    } catch (e) { setErr(e?.response?.data?.message || e.message); } finally { setBusy(''); }
  };

  const genVoice = async (id) => {
    const sc = scenes.find((s) => s.id === id); const text = (sc?.voiceText || sc?.subtitleText || '').trim();
    if (text.length < 2) { setErr(tp('Écris le texte de la voix off (ou un sous-titre) pour générer la voix.')); return; }
    patch(id, { busy: 'voice' }); setErr('');
    try {
      const { data } = await creativeApi.launch.voiceover({ text, referenceId: voiceRefId || undefined });
      if (!data?.success || !data.url) throw new Error(data?.message || tp('Voix impossible'));
      const dur = await readDur(data.url, 'audio');
      // La voix dicte le rythme : plan = phrase + courte finale (comme le rendu).
      // Le sous-titre affiché reprend le texte dit s'il était vide (comme au studio).
      patch(id, {
        audioUrl: data.url, busy: '', subtitleText: sc?.subtitleText || text,
        ...(dur ? { durationSec: Math.max(1.2, Math.round((dur + 0.1) * 10) / 10) } : {}),
      });
    } catch (e) { setErr(e?.response?.data?.message || e.message); patch(id, { busy: '' }); }
  };

  const btn = 'inline-flex items-center justify-center gap-1.5 rounded-md text-[12px] font-semibold transition';
  const iconBtn = 'h-8 w-8 rounded-md flex items-center justify-center text-neutral-300 hover:bg-card/10 transition';
  const secTitle = 'text-[10.5px] font-bold uppercase tracking-wide text-neutral-500';

  return (
    <div className="fixed inset-0 z-[70] bg-neutral-950 text-neutral-200 flex flex-col">
      <style>{`
@keyframes pe-pop{0%{transform:scale(.7);opacity:0}55%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
@keyframes pe-fade{0%{opacity:0}100%{opacity:1}}
@keyframes pe-zoom{0%{transform:scale(.55);opacity:0}100%{transform:scale(1);opacity:1}}
@keyframes pe-bounce{0%{transform:scale(.6);opacity:0}45%{transform:scale(1.26)}70%{transform:scale(.92)}100%{transform:scale(1);opacity:1}}
@keyframes pe-kb-zoomin{0%{transform:scale(1)}100%{transform:scale(1.18)}}
@keyframes pe-kb-zoomout{0%{transform:scale(1.18)}100%{transform:scale(1.001)}}
@keyframes pe-kb-panleft{0%{transform:scale(1.15) translateX(4%)}100%{transform:scale(1.15) translateX(-4%)}}
@keyframes pe-kb-panright{0%{transform:scale(1.15) translateX(-4%)}100%{transform:scale(1.15) translateX(4%)}}
@keyframes pe-punchin{0%{transform:scale(1)}100%{transform:scale(1.08)}}
@keyframes pe-punchout{0%{transform:scale(1.08)}100%{transform:scale(1.001)}}
@keyframes pe-tr-slideleft{0%{transform:translateX(100%)}100%{transform:translateX(0)}}
@keyframes pe-tr-slideright{0%{transform:translateX(-100%)}100%{transform:translateX(0)}}
@keyframes pe-tr-slideup{0%{transform:translateY(100%)}100%{transform:translateY(0)}}
@keyframes pe-tr-slidedown{0%{transform:translateY(-100%)}100%{transform:translateY(0)}}
@keyframes pe-tr-fade{0%{opacity:0}100%{opacity:1}}
@keyframes pe-tr-circle{0%{clip-path:circle(0% at 50% 50%)}100%{clip-path:circle(75% at 50% 50%)}}
@keyframes pe-tr-wipe{0%{clip-path:inset(0 100% 0 0)}100%{clip-path:inset(0 0 0 0)}}
@keyframes pe-flash{0%{opacity:.95}100%{opacity:0}}
`}</style>

      {/* Barre supérieure */}
      <div className="h-12 shrink-0 border-b border-white/10 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className={`${iconBtn}`}><X size={18} /></button>
          <span className="text-[13px] font-bold text-white">{tp('Éditeur vidéo')}</span>
          <span className="text-[11px] text-neutral-500">{subject || tp('Montage')}</span>
        </div>
        <div className="flex items-center gap-2">
          {resultUrl && <button onClick={onNewMontage} className={`${btn} h-8 px-3 border border-white/15 text-neutral-200 hover:bg-card/10`}>{tp('Nouveau')}</button>}
          <button onClick={onExport} disabled={rendering} className={`${btn} h-8 px-4 bg-primary text-white hover:bg-primary disabled:opacity-50`}>
            {rendering ? <><Loader2 size={14} className="animate-spin" /> {progress}%</> : <><VideoIcon size={14} /> {tp('Exporter')}</>}
          </button>
        </div>
      </div>

      {err && <div className="px-3 py-1.5 bg-red-500/15 text-red-300 text-[12px] border-b border-red-500/20">{err}</div>}

      {/* Corps : aperçu + panneau unique */}
      <div className="flex-1 min-h-0 flex">
        {/* Aperçu */}
        <div className="flex-1 min-w-0 flex flex-col items-center justify-center p-4 bg-neutral-900">
          <div ref={stageRef} className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden">
          <div className="pe-preview relative bg-black rounded-lg overflow-hidden shadow-2xl" style={previewBox}>
            {(() => {
              // ── Aperçu FIDÈLE au rendu : transition d'entrée du plan (celle de
              //    la jonction précédente), Ken Burns sur les images, punch-in
              //    sur les vidéos — mêmes mouvements que le moteur ffmpeg. ──
              if (!activeScene?.videoUrl && !activeScene?.imageUrl) {
                return <div className="w-full h-full min-w-[220px] min-h-[300px] flex items-center justify-center text-neutral-600 text-[13px]">{tp('Aucun plan')}</div>;
              }
              const prev = activeIndex > 0 ? scenes[activeIndex - 1] : null;
              const rawTr = prev ? (prev.transitionOut || transition || '') : '';
              const tr = rawTr === 'none' || !prev ? ''
                : /^slide(left|right|up|down)$/.test(rawTr) ? rawTr
                  : /circle|radial/.test(rawTr) ? 'circle'
                    : /^wipe|smoothleft|diagtl/.test(rawTr) ? 'wipe'
                      : 'fade'; // fade, fadeblack, dissolve, pixelize, dynamic…
              const isFlash = rawTr === 'fadewhite';
              const dur = durOf(activeScene);
              const mediaAnim = activeScene.videoUrl
                ? `pe-punch${activeIndex % 2 === 0 ? 'in' : 'out'} ${dur}s linear both`
                : `pe-kb-${activeScene.kenBurns || ['zoomin', 'panleft', 'zoomout', 'panright'][activeIndex % 4]} ${dur}s linear both`;
              return (
                <>
                  <div key={activeScene.id} className="absolute inset-0 overflow-hidden"
                    style={tr ? { animation: `pe-tr-${tr} 0.45s ease-out both` } : undefined}>
                    {activeScene.videoUrl
                      ? <video ref={videoRef} src={activeScene.videoUrl} poster={activeScene.videoPoster || undefined} preload="auto" playsInline
                          onLoadedData={() => { if (!playing) syncMedia(false); }}
                          className="w-full h-full object-cover" style={{ animation: mediaAnim, animationPlayState: playing ? 'running' : 'paused' }} />
                      : <img src={activeScene.imageUrl} alt="" className="w-full h-full object-cover" style={{ animation: mediaAnim, animationPlayState: playing ? 'running' : 'paused' }} />}
                  </div>
                  {isFlash && <div key={`fl-${activeScene.id}`} className="absolute inset-0 bg-card pointer-events-none" style={{ animation: 'pe-flash 0.35s ease-out both' }} />}
                </>
              );
            })()}
            {/* Images superposées : déplaçables (corps) et redimensionnables (poignée) */}
            {(activeScene?.overlays || []).map((o, k) => (
              <div key={`${activeScene.id}ov${k}`} className="absolute select-none touch-none" style={{ left: `${o.xPct}%`, top: `${o.yPct}%`, width: `${o.wPct}%`, ...(o.hPct ? { height: `${o.hPct}%` } : {}), transform: 'translate(-50%,-50%)' }}>
                {o.shape === 'ring'
                  ? <div className="w-full aspect-square rounded-full pointer-events-none" style={{ border: '5px solid #E12338', boxShadow: '0 0 0 2px rgba(255,255,255,.85), inset 0 0 0 2px rgba(255,255,255,.85)' }} />
                  : o.shape && accentShape(o.shape)
                    ? (
                      <svg viewBox="0 0 100 100" className="w-full h-auto pointer-events-none">
                        <text x="50" y="54" textAnchor="middle" dominantBaseline="central" fontSize="86" fontWeight="bold"
                          fill={accentShape(o.shape).color} stroke="rgba(0,0,0,.55)" strokeWidth="3" paintOrder="stroke">{accentShape(o.shape).ch}</text>
                      </svg>
                    )
                    : <img src={o.url} alt="" draggable={false} className={`w-full pointer-events-none rounded ${o.hPct ? 'h-full object-fill' : 'h-auto'}`} />}
                <div
                  className="absolute inset-0 cursor-move rounded ring-1 ring-white/30 hover:ring-primary"
                  title={tp('Glisser pour déplacer l’image')}
                  onPointerDown={(e) => {
                    const container = e.currentTarget.closest('.pe-preview');
                    if (!container) return;
                    e.preventDefault(); e.stopPropagation();
                    const rect = container.getBoundingClientRect();
                    const scId = activeScene.id;
                    const move = (ev) => patchOverlay(scId, k, {
                      xPct: Math.round(Math.max(2, Math.min(98, ((ev.clientX - rect.left) / rect.width) * 100)) * 10) / 10,
                      yPct: Math.round(Math.max(2, Math.min(98, ((ev.clientY - rect.top) / rect.height) * 100)) * 10) / 10,
                    });
                    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
                    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
                  }}
                />
                <span
                  className="absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-primary border-2 border-white shadow cursor-nwse-resize"
                  title={tp('Glisser pour redimensionner (horizontal et vertical)')}
                  onPointerDown={(e) => {
                    const container = e.currentTarget.closest('.pe-preview');
                    const box = e.currentTarget.parentElement; // wrapper de l'overlay
                    if (!container || !box) return;
                    e.preventDefault(); e.stopPropagation();
                    const rect = container.getBoundingClientRect();
                    const startX = e.clientX; const startY = e.clientY;
                    const startW = Number(o.wPct) || 35;
                    // Hauteur de départ mesurée à l'écran (même si hPct était en auto).
                    const startH = Number(o.hPct) > 0 ? Number(o.hPct) : (box.getBoundingClientRect().height / rect.height) * 100;
                    const scId = activeScene.id;
                    const move = (ev) => patchOverlay(scId, k, {
                      wPct: Math.round(Math.max(5, Math.min(80, startW + ((ev.clientX - startX) / rect.width) * 100)) * 10) / 10,
                      hPct: Math.round(Math.max(5, Math.min(95, startH + ((ev.clientY - startY) / rect.height) * 100)) * 10) / 10,
                    });
                    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
                    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
                  }}
                />
              </div>
            ))}
            {activeCaption.text && (
              <div
                className={`absolute inset-x-0 flex justify-center px-5 ${captionOffsetPct == null ? (captionPosition === 'top' ? 'top-[8%]' : captionPosition === 'middle' ? 'top-1/2 -translate-y-1/2' : 'bottom-[13%]') : ''}`}
                style={captionOffsetPct != null ? { top: `${captionOffsetPct}%`, transform: 'translateY(-100%)' } : undefined}
              >
                <span className="relative inline-block">
                  <span
                    key={activeCaption.key}
                    className="inline-block bg-black/35 font-extrabold text-center px-3 py-1 rounded-lg leading-tight cursor-grab active:cursor-grabbing select-none touch-none"
                    title={tp('Glisse-moi pour positionner le sous-titre (façon CapCut)')}
                    onPointerDown={(e) => {
                      // Drag vertical libre : la position (% hauteur) est envoyée au rendu (\pos ASS).
                      const container = e.currentTarget.closest('.pe-preview');
                      if (!container || !setCaptionOffsetPct) return;
                      e.preventDefault();
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                      const rect = container.getBoundingClientRect();
                      const move = (ev) => {
                        const pct = Math.max(5, Math.min(95, ((ev.clientY - rect.top) / rect.height) * 100));
                        setCaptionOffsetPct(Math.round(pct * 10) / 10);
                      };
                      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
                      window.addEventListener('pointermove', move);
                      window.addEventListener('pointerup', up);
                    }}
                    style={{ whiteSpace: 'pre-line', animation: `pe-${['pop', 'fade', 'zoom', 'bounce'].includes(captionAnim) ? captionAnim : 'fade'} .28s ease-out both`, color: captionColor(activeScene?.captionStyle || captionStyle).text, fontFamily: captionFontCss(captionFont), textTransform: captionCase === 'upper' ? 'uppercase' : 'none', fontSize: `calc(clamp(14px,3.2vh,30px) * ${Math.max(0.5, Math.min(2, Number(captionScale) || 1))})`, WebkitTextStroke: '1px rgba(0,0,0,.85)', textShadow: '0 2px 6px rgba(0,0,0,.7)' }}
                  >{activeCaption.text}</span>
                  {/* Poignée de redimensionnement graphique : glisser haut/bas = taille */}
                  <span
                    className="absolute -right-2.5 -bottom-2.5 w-5 h-5 rounded-full bg-primary border-2 border-white shadow cursor-nwse-resize select-none touch-none flex items-center justify-center text-[9px] font-black text-white"
                    title={tp('Glisse pour ajuster la taille des sous-titres')}
                    onPointerDown={(e) => {
                      if (!setCaptionScale) return;
                      e.preventDefault(); e.stopPropagation();
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                      const startY = e.clientY;
                      const startScale = Math.max(0.5, Math.min(2, Number(captionScale) || 1));
                      const move = (ev) => {
                        const next = Math.max(0.5, Math.min(2, startScale + (ev.clientY - startY) / 140));
                        setCaptionScale(Math.round(next * 20) / 20);
                      };
                      const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
                      window.addEventListener('pointermove', move);
                      window.addEventListener('pointerup', up);
                    }}
                  >⤡</span>
                </span>
              </div>
            )}
          </div>
          </div>
          <div className="mt-3 shrink-0 flex items-center gap-3">
            <button onClick={() => setPlaying((p) => !p)} className="h-9 w-9 rounded-full bg-card text-neutral-900 flex items-center justify-center hover:bg-neutral-200">{playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}</button>
            <span className="text-[12px] font-mono text-neutral-400 tabular-nums">{fmtTime(currentTime)} / {fmtTime(total)}</span>
            <button onClick={() => setFullPreview((v) => !v)} title={fullPreview ? `${tp('Quitter le plein écran')} (Échap)` : tp('Aperçu plein écran')}
              className="h-9 w-9 rounded-full bg-card/10 text-white flex items-center justify-center hover:bg-card/20">
              {fullPreview ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>
        </div>

        {/* Glissière : largeur du panneau */}
        {!fullPreview && <div onPointerDown={startPanelResize} title={tp('Glisser pour ajuster la largeur du panneau')}
          className="w-1.5 shrink-0 cursor-col-resize bg-card/5 hover:bg-primary/50 transition-colors touch-none" />}

        {/* Panneau unique : Plan / Style */}
        <div className={`shrink-0 border-l border-white/10 flex-col ${fullPreview ? 'hidden' : 'flex'}`} style={{ width: panelW }}>
          <div className="h-10 shrink-0 flex p-1 gap-1 border-b border-white/10">
            <button onClick={() => setTab('plan')} className={`${btn} h-8 flex-1 ${tab === 'plan' ? 'bg-primary text-white' : 'text-neutral-400 hover:bg-card/10'}`}><Film size={13} /> {tp('Plan')}</button>
            <button onClick={() => setTab('style')} className={`${btn} h-8 flex-1 ${tab === 'style' ? 'bg-primary text-white' : 'text-neutral-400 hover:bg-card/10'}`}><Layers size={13} /> {tp('Style')}</button>
          </div>
          <div className="p-3 overflow-y-auto flex-1 space-y-4">

            {/* ── Onglet PLAN : tout ce qui concerne le plan sélectionné ── */}
            {tab === 'plan' && (!selScene ? <p className="text-[12px] text-neutral-500">{tp('Sélectionne un plan dans la timeline.')}</p> : (
              <>
                {/* En-tête : numéro du plan + nature du visuel (comme au studio) */}
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px] font-bold text-white">{tp('Scène')} {scenes.findIndex((s) => s.id === selScene.id) + 1}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selScene.imageUrl && !selScene.videoUrl ? 'bg-primary/15 text-primary' : 'bg-primary/15 text-primary'}`}>
                    {selScene.imageUrl && !selScene.videoUrl ? tp('Image — animée au montage') : tp('Vidéo')}
                  </span>
                </div>

                {/* Média du plan : galerie / upload / retirer */}
                <div className="flex gap-1.5">
                  <button onClick={() => setPicker({ open: true, type: 'video', sceneId: selScene.id })} disabled={!!selScene.busy} className={`${btn} h-8 flex-1 bg-card/5 hover:bg-card/10 disabled:opacity-50`}><Film size={13} /> {tp('Galerie')}</button>
                  <label className={`${btn} h-8 flex-1 bg-card/5 hover:bg-card/10 cursor-pointer`}>
                    {selScene.busy === 'up' ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {tp('Uploader')}
                    <input type="file" accept="video/*,image/*" className="hidden" onChange={(e) => { replaceUpload(selScene.id, e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  {(selScene.videoUrl || selScene.imageUrl) && (
                    <button onClick={() => patch(selScene.id, { videoUrl: '', imageUrl: '', videoPoster: '', trimStart: 0 })} className={`${btn} h-8 px-2.5 bg-red-500/15 text-red-300 hover:bg-red-500/25`}>{tp('Retirer')}</button>
                  )}
                </div>

                {/* Plan à générer (visuel exact) — mêmes réglages qu'au studio */}
                <div className="space-y-1.5">
                  <p className={secTitle}>{tp('Plan à générer (visuel exact)')}</p>
                  <input
                    value={selScene.clipPrompt || ''}
                    onChange={(e) => patch(selScene.id, { clipPrompt: e.target.value })}
                    placeholder={tp('Description (sinon : sa phrase est illustrée)')}
                    className="w-full h-8 rounded-md bg-card/5 border border-white/10 px-2 text-[11px] outline-none focus:border-primary/30"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex rounded-md overflow-hidden border border-white/10">
                      <button onClick={() => patch(selScene.id, { genMode: 'video' })} className={`px-2 h-7 text-[10.5px] font-bold transition ${(selScene.genMode || 'video') === 'video' ? 'bg-primary text-white' : 'text-neutral-400 hover:bg-card/10'}`}>{tp('Vidéo')}</button>
                      <button onClick={() => patch(selScene.id, { genMode: 'image' })} className={`px-2 h-7 text-[10.5px] font-bold transition ${selScene.genMode === 'image' ? 'bg-primary text-white' : 'text-neutral-400 hover:bg-card/10'}`}>{tp('Image éco')}</button>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer select-none">
                      <input type="checkbox" checked={selScene.showProduct !== false} onChange={(e) => patch(selScene.id, { showProduct: e.target.checked })} className="accent-primary" />
                      {tp('Produit visible')}
                    </label>
                  </div>
                  <button onClick={() => genSceneContent(selScene.id)} disabled={!!selScene.busy}
                    className={`${btn} h-8 w-full bg-primary/80 hover:bg-primary text-white disabled:opacity-50`}>
                    {selScene.busy === 'gen' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} {tp('Générer ce plan')} <CostChip cost={featureCost('video')} />
                  </button>
                </div>

                {/* Voix off (texte) : générer / galerie / uploader */}
                <div>
                  <p className={`${secTitle} mb-1.5`}>{tp('Voix off (texte)')}</p>
                  <textarea value={selScene.voiceText || ''} onChange={(e) => patch(selScene.id, { voiceText: e.target.value })} rows={2} placeholder={tp('Texte dit sur ce plan…')} className="w-full rounded-md bg-card/5 border border-white/10 px-2 py-1.5 text-[12px] outline-none focus:border-primary/30 resize-y" />
                  <div className="flex gap-1.5 mt-1.5">
                    <button onClick={() => genVoice(selScene.id)} disabled={selScene.busy === 'voice'} className={`${btn} h-8 flex-1 bg-card/5 hover:bg-card/10`}>{selScene.busy === 'voice' ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />} {tp('Générer la voix')} <CostChip cost={featureCost('voice')} /></button>
                    <button onClick={() => setPicker({ open: true, type: 'audio', sceneId: selScene.id })} className={`${btn} h-8 px-2.5 bg-card/5 hover:bg-card/10`}>{tp('Galerie')}</button>
                    <label className={`${btn} h-8 px-2.5 bg-card/5 hover:bg-card/10 cursor-pointer`} title={tp('Uploader un fichier audio')}>
                      <Upload size={13} />
                      <input type="file" accept="audio/*" className="hidden" onChange={(e) => { uploadVoiceFile(selScene.id, e.target.files?.[0]); e.target.value = ''; }} />
                    </label>
                  </div>
                  {selScene.audioUrl && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <audio src={selScene.audioUrl} controls className="flex-1 h-8" />
                      <button onClick={() => patch(selScene.id, { audioUrl: '' })} className="text-neutral-400 hover:text-red-400" title={tp('Retirer la voix')}><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>

                {/* Sous-titre affiché (peut différer du texte dit) */}
                <div>
                  <p className={`${secTitle} mb-1.5`}>{tp('Sous-titre affiché')}</p>
                  <textarea value={selScene.subtitleText || ''} onChange={(e) => patch(selScene.id, { subtitleText: e.target.value })} rows={2} placeholder={tp('= texte de la voix off si vide')} className="w-full rounded-md bg-card/5 border border-white/10 px-2 py-1.5 text-[12px] outline-none focus:border-primary/30 resize-y" />
                </div>

                <div className="space-y-3">
                  <p className={secTitle}>{tp('Réglages du plan')}</p>
                  <Row label={selScene.audioUrl ? `${tp('Durée (s)')} — ${tp('auto voix')}` : tp('Durée (s)')}>
                    <input type="number" min={0.5} max={30} step={0.5} value={durOf(selScene)} onChange={(e) => patch(selScene.id, { durationSec: clamp(Number(e.target.value) || 1, 0.5, 30) })} className="w-20 h-8 rounded-md bg-card/5 border border-white/10 px-2 text-[12px] text-right outline-none focus:border-primary/30" />
                  </Row>
                  <Row label={`${tp('Volume')} ${Math.round((selScene.volume ?? 1) * 100)}%`}>
                    <input type="range" min={0} max={2} step={0.1} value={selScene.volume ?? 1} onChange={(e) => patch(selScene.id, { volume: Number(e.target.value) })} className="w-28 accent-primary" />
                  </Row>
                  <Row label={`${tp('Fondus')} ${Number(selScene.fadeIn || 0).toFixed(1)} / ${Number(selScene.fadeOut || 0).toFixed(1)}s`}>
                    <div className="flex gap-1.5">
                      <input type="range" min={0} max={2} step={0.1} value={selScene.fadeIn || 0} onChange={(e) => patch(selScene.id, { fadeIn: Number(e.target.value) })} className="w-12 accent-primary" title={tp('Entrée')} />
                      <input type="range" min={0} max={2} step={0.1} value={selScene.fadeOut || 0} onChange={(e) => patch(selScene.id, { fadeOut: Number(e.target.value) })} className="w-12 accent-primary" title={tp('Sortie')} />
                    </div>
                  </Row>
                  <Row label={tp('Transition après')}>
                    <select value={selScene.transitionOut || transition} onChange={(e) => patch(selScene.id, { transitionOut: e.target.value })} className="w-32 h-8 rounded-md bg-card/5 border border-white/10 px-2 text-[12px] outline-none focus:border-primary/30">
                      {TRANSITIONS.map((t) => <option key={t.id} value={t.id} className="bg-neutral-900">{t.label}</option>)}
                    </select>
                  </Row>
                  <Row label={tp('Style de sous-titre')}>
                    <select value={selScene.captionStyle || ''} onChange={(e) => patch(selScene.id, { captionStyle: e.target.value || '' })} className="w-32 h-8 rounded-md bg-card/5 border border-white/10 px-2 text-[12px] outline-none focus:border-primary/30">
                      <option value="" className="bg-neutral-900">{tp('Global')}</option>
                      {CAPTION_STYLES.map((cs) => <option key={cs.id} value={cs.id} className="bg-neutral-900">{cs.label}</option>)}
                    </select>
                  </Row>
                  <div className="flex gap-1.5">
                    <button onClick={() => duplicate(selScene.id)} className={`${btn} h-8 flex-1 bg-card/5 hover:bg-card/10`}><Copy size={13} /> {tp('Dupliquer')}</button>
                    <button onClick={() => removeScene(selScene.id)} disabled={scenes.length <= 1} className={`${btn} h-8 flex-1 bg-red-500/15 text-red-300 hover:bg-red-500/25 disabled:opacity-40`}><Trash2 size={13} /> {tp('Supprimer')}</button>
                  </div>
                  {selScene.videoUrl && <button onClick={() => patch(selScene.id, { trimStart: 0, durationSec: selScene.srcDuration || durOf(selScene) })} className={`${btn} h-8 w-full bg-card/5 hover:bg-card/10`}>{tp('Réinitialiser le rognage')}</button>}
                </div>

                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <p className={`${secTitle} pt-2`}>{tp('Images superposées')}</p>
                  {(selScene.overlays || []).map((o, k) => (
                    <div key={k} className="flex items-center gap-2">
                      {o.shape === 'ring'
                        ? <span className="w-8 h-8 rounded-full border-[3px] border-red-500 shrink-0" />
                        : o.shape && accentShape(o.shape)
                          ? <span className="w-8 h-8 rounded flex items-center justify-center text-[19px] font-bold shrink-0 bg-card/5" style={{ color: accentShape(o.shape).color }}>{accentShape(o.shape).ch}</span>
                          : <img src={o.url} alt="" className="w-8 h-8 rounded object-cover border border-white/10" />}
                      <span className="text-[11px] text-neutral-400 flex-1">{o.shape ? (accentShape(o.shape)?.label || tp('Accent')) : tp('Image')} · {Math.round(o.wPct)}% · x{Math.round(o.xPct)} y{Math.round(o.yPct)}</span>
                      <button onClick={() => patch(selScene.id, { overlays: (selScene.overlays || []).filter((_, j) => j !== k) })} className="text-neutral-400 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  {(selScene.overlays || []).length < 3 && (
                    <>
                      <label className={`${btn} h-8 w-full bg-card/5 hover:bg-card/10 cursor-pointer`}>
                        {busy === 'ov' ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} {tp('Ajouter une image')}
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => addOverlay(e.target.files?.[0])} />
                      </label>
                      <div className="grid grid-cols-7 gap-1">
                        {ACCENT_SHAPES.map((a) => (
                          <button key={a.id} title={a.label}
                            onClick={() => patch(selScene.id, { overlays: [...(selScene.overlays || []), { shape: a.id, xPct: 50, yPct: 50, wPct: a.id === 'ring' ? 30 : 22 }] })}
                            className="h-8 rounded-md bg-card/5 hover:bg-card/15 text-[15px] font-bold flex items-center justify-center" style={{ color: a.color }}>
                            {a.ch}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {(selScene.overlays || []).length > 0 && <p className="text-[10.5px] text-neutral-500">{tp('Déplace et redimensionne l’image directement sur l’aperçu.')}</p>}
                </div>

                <div className="space-y-1.5 pt-1 border-t border-white/10">
                  <p className={`${secTitle} pt-2`}>{tp('Ajouter un plan')}</p>
                  <div className="flex gap-1.5">
                    <label className={`${btn} h-8 flex-1 bg-card/5 hover:bg-card/10 cursor-pointer`}><Upload size={13} /> {tp('Clip')}<input type="file" accept="video/*" className="hidden" onChange={(e) => addUpload(e.target.files?.[0], 'video')} /></label>
                    <label className={`${btn} h-8 flex-1 bg-card/5 hover:bg-card/10 cursor-pointer`}><ImageIcon size={13} /> {tp('Image')}<input type="file" accept="image/*" className="hidden" onChange={(e) => addUpload(e.target.files?.[0], 'image')} /></label>
                  </div>
                  <div className="flex gap-1">
                    <input value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)} placeholder={tp('Plan à générer par IA…')} className="flex-1 h-8 rounded-md bg-card/5 border border-white/10 px-2 text-[11px] outline-none focus:border-primary/30" />
                    <button onClick={genClip} disabled={busy === 'gen'} className={`${btn} h-8 px-2.5 bg-primary/80 hover:bg-primary text-white disabled:opacity-50`}>{busy === 'gen' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}</button>
                  </div>
                </div>
              </>
            ))}

            {/* ── Onglet STYLE : réglages globaux (sous-titres, musique, voix) ── */}
            {tab === 'style' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-neutral-300">{tp('Sous-titres')}</span>
                  <button onClick={() => setSubtitlesOn?.(!subtitlesOn)} className={`relative w-10 h-5 rounded-full transition ${subtitlesOn ? 'bg-primary' : 'bg-neutral-600'}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-card transition-transform ${subtitlesOn ? 'translate-x-5' : ''}`} /></button>
                </div>
                {subtitlesOn && (
                  <>
                    <div>
                      <p className={`${secTitle} mb-1.5`}>{tp('Modèle')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CAPTION_STYLES.map((cs) => (
                          <button key={cs.id} onClick={() => setCaptionStyle?.(cs.id)}
                            className={`h-8 px-2 rounded-md border text-[11px] font-bold inline-flex items-center gap-1.5 ${captionStyle === cs.id ? 'border-primary/30 bg-primary/15' : 'border-white/10 hover:bg-card/5'}`}>
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded" style={{ background: cs.bg === 'transparent' ? '#374151' : cs.bg, color: cs.text }}>A</span>
                            {cs.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Row label={tp('Police')}>
                      <select value={captionFont} onChange={(e) => setCaptionFont?.(e.target.value)} className="w-36 h-8 rounded-md bg-card/5 border border-white/10 px-2 text-[12px] outline-none focus:border-primary/30">
                        {CAPTION_FONTS.map((f) => <option key={f.id} value={f.id} className="bg-neutral-900">{f.label}</option>)}
                      </select>
                    </Row>
                    <Row label={tp('Casse')}>
                      <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
                        <button onClick={() => setCaptionCase?.('none')} className={`${btn} h-8 px-3 ${captionCase !== 'upper' ? 'bg-primary text-white' : 'text-neutral-400'}`}>Aa</button>
                        <button onClick={() => setCaptionCase?.('upper')} className={`${btn} h-8 px-3 ${captionCase === 'upper' ? 'bg-primary text-white' : 'text-neutral-400'}`}>AA</button>
                      </div>
                    </Row>
                    <Row label={`${tp('Taille')} ${Math.round((Number(captionScale) || 1) * 100)}%`}>
                      <input type="range" min={0.5} max={2} step={0.05} value={Number(captionScale) || 1} onChange={(e) => setCaptionScale?.(Number(e.target.value))} className="w-28 accent-primary" />
                    </Row>
                    <Row label={tp('Lignes')}>
                      <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
                        {[1, 2, 3].map((n) => (
                          <button key={n} onClick={() => setCaptionMaxLines?.(n)} className={`${btn} h-8 w-9 ${captionMaxLines === n ? 'bg-primary text-white' : 'text-neutral-400'}`}>{n}</button>
                        ))}
                      </div>
                    </Row>
                    <Row label={tp('Position')}>
                      <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
                        {CAPTION_POSITIONS.map((p) => (
                          <button key={p.id} onClick={() => { setCaptionPosition?.(p.id); setCaptionOffsetPct?.(null); }}
                            className={`${btn} h-8 px-2.5 ${captionPosition === p.id && captionOffsetPct == null ? 'bg-primary text-white' : 'text-neutral-400'}`}>{p.label}</button>
                        ))}
                      </div>
                    </Row>
                    {captionOffsetPct != null && <p className="text-[11px] text-primary">{tp('Position libre')} : {Math.round(captionOffsetPct)}% — <button className="underline" onClick={() => setCaptionOffsetPct?.(null)}>{tp('réinitialiser')}</button></p>}
                    <Row label={tp('Rythme')}>
                      <div className="inline-flex rounded-md border border-white/10 overflow-hidden">
                        <button onClick={() => setCaptionMode?.('dynamic')} className={`${btn} h-8 px-2.5 ${captionMode === 'dynamic' ? 'bg-primary text-white' : 'text-neutral-400'}`}><Sparkles size={12} /> {tp('Dynamique')}</button>
                        <button onClick={() => setCaptionMode?.('block')} className={`${btn} h-8 px-2.5 ${captionMode === 'block' ? 'bg-primary text-white' : 'text-neutral-400'}`}>{tp('Bloc')}</button>
                      </div>
                    </Row>
                    <div>
                      <p className={`${secTitle} mb-1.5`}>{tp('Animation')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CAPTION_ANIMS.map((a) => (
                          <button key={a.id} onClick={() => setCaptionAnim?.(a.id)}
                            className={`h-8 px-2.5 rounded-md border text-[11.5px] font-semibold ${captionAnim === a.id ? 'border-primary/30 bg-primary/20 text-white' : 'border-white/10 text-neutral-300 hover:bg-card/5'}`}>
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <p className={`${secTitle} pt-1`}>{tp('Musique de fond')}</p>
                  <div className="flex flex-wrap gap-1">
                    {presets.map((p) => (
                      <button key={p.id} onClick={() => setMusicUrl?.(musicUrl === p.url ? '' : p.url)} className={`h-6 px-2 rounded text-[10.5px] font-semibold ${musicUrl === p.url ? 'bg-primary text-white' : 'bg-card/5 text-neutral-300 hover:bg-card/10'}`}>{p.label}</button>
                    ))}
                  </div>
                  <label className={`${btn} h-8 w-full bg-card/5 hover:bg-card/10 cursor-pointer`}><Music size={13} /> {musicUrl ? tp('Remplacer par mon fichier') : tp('Uploader ma piste')}<input type="file" accept="audio/*" className="hidden" onChange={(e) => onAddMusic?.(e.target.files?.[0])} /></label>
                  {musicUrl && (
                    <Row label={`${tp('Volume musique')} ${Math.round((Number(musicVolume) ?? 0.5) * 100)}%`}>
                      <input type="range" min={0} max={1.2} step={0.05} value={Number.isFinite(Number(musicVolume)) ? Number(musicVolume) : 0.5} onChange={(e) => setMusicVolume?.(Number(e.target.value))} className="w-28 accent-primary" />
                    </Row>
                  )}
                </div>

                <div className="space-y-1.5 pt-2 border-t border-white/10">
                  <p className={`${secTitle} pt-1`}>{tp('Voix off (tous les plans)')}</p>
                  <div className="flex items-center gap-1.5">
                    <VoiceSelect value={voiceRefId} onChange={(v) => setVoiceRefId?.(v)} includeModelVoice dark
                      className="flex-1 min-w-0 h-8 rounded-md bg-card/5 border border-white/10 px-2 text-[12px] outline-none" />
                    <VoicePreviewButton voiceId={voiceRefId} dark />
                  </div>
                  {narrationUrl && <p className="text-[11px] text-neutral-500">{tp('Une narration globale est active : elle prime sur les voix par plan au rendu.')}</p>}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Glissière : hauteur de la timeline */}
      {!fullPreview && <div onPointerDown={startTimelineResize} title={tp('Glisser pour ajuster la hauteur de la timeline')}
        className="h-1.5 shrink-0 cursor-row-resize bg-card/5 hover:bg-primary/50 transition-colors touch-none" />}

      {/* Timeline — superpositions, vidéo, sous-titres, voix, musique */}
      <div className={`shrink-0 border-t border-white/10 flex-col bg-neutral-900 ${fullPreview ? 'hidden' : 'flex'}`} style={{ height: timelineH }}>
        <div className="h-10 flex items-center gap-1 px-2 border-b border-white/10">
          <button onClick={splitAtPlayhead} title={`${tp('Couper au curseur')} (S)`} className={`${iconBtn}`}><Scissors size={16} /></button>
          <button onClick={() => selScene && removeScene(selScene.id)} title={tp('Supprimer le plan')} className={`${iconBtn}`}><Trash2 size={15} /></button>
          <span className="ml-2 text-[11px] text-neutral-500">{scenes.length} {tp('plans')} · {fmtTime(total)}</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => setPxPerSec((z) => clamp(z - 16, 24, 240))} className={`${iconBtn}`}><ZoomOut size={15} /></button>
            <button onClick={() => setPxPerSec((z) => clamp(z + 16, 24, 240))} className={`${iconBtn}`}><ZoomIn size={15} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <div className="relative" style={{ width: trackW }}>
            <div className="relative h-5 border-b border-white/10 cursor-ew-resize select-none" onClick={seekFromEvent} onPointerDown={startScrub}>
              {Array.from({ length: Math.ceil(total) + 1 }).map((_, s) => (
                <div key={s} className="absolute top-0 h-full border-l border-white/10" style={{ left: s * pxPerSec }}><span className="absolute top-0 left-1 text-[9px] text-neutral-500">{s}s</span></div>
              ))}
            </div>
            {/* Piste superpositions (au-dessus de la vidéo, comme à l'écran) */}
            <div className="relative border-b border-white/10" style={{ height: 24 }} onClick={seekFromEvent}>
              {scenes.map((s, i) => {
                const ovs = Array.isArray(s.overlays) ? s.overlays : [];
                if (!ovs.length) return null;
                return (
                  <div key={s.id} onClick={(e) => { e.stopPropagation(); setSelId(s.id); setTab('plan'); }}
                    title={tp('Images superposées de ce plan — gérer dans l’onglet Plan')}
                    className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center gap-1 overflow-hidden cursor-pointer border ${selId === s.id ? 'border-primary/40 bg-primary/25' : 'border-primary/30/30 bg-primary/10'}`}
                    style={{ left: starts[i] * pxPerSec, width: Math.max(10, durOf(s) * pxPerSec) }}>
                    <img src={ovs[0].url} alt="" className="h-3.5 w-3.5 rounded-[3px] object-cover shrink-0" />
                    <span className="text-[10px] text-primary truncate">{tp('Superposition')}{ovs.length > 1 ? ` ×${ovs.length}` : ''}</span>
                  </div>
                );
              })}
            </div>
            {/* Piste vidéo (le badge T signale un texte sur le plan) */}
            <div className="relative border-b border-white/10" style={{ height: 64 }} onClick={seekFromEvent}>
              {scenes.map((s, i) => (
                <div key={s.id} onPointerDown={(e) => startMove(e, s, i)} onClick={(e) => { e.stopPropagation(); setSelId(s.id); setTab('plan'); }}
                  className={`absolute top-1.5 bottom-1.5 rounded-md overflow-hidden border-2 ${selId === s.id ? 'border-primary/30' : 'border-transparent'} ${movingId === s.id ? 'cursor-grabbing z-40 opacity-90 shadow-lg' : 'cursor-grab'}`}
                  style={{ left: starts[i] * pxPerSec, width: Math.max(10, durOf(s) * pxPerSec), transform: movingId === s.id ? `translateX(${moveDx}px)` : 'none' }}>
                  {s.videoPoster || s.imageUrl ? <img src={s.videoPoster || s.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-neutral-700" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center text-white/70">{s.videoUrl ? <Film size={14} /> : s.imageUrl ? <ImageIcon size={14} /> : <Mic size={14} />}</div>
                  <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white/90">{durOf(s).toFixed(1)}s</span>
                  {subtitlesOn && (s.subtitleText || s.voiceText) && <span className="absolute top-0.5 right-1 h-4 w-4 rounded bg-primary/90 text-white flex items-center justify-center"><Type size={9} /></span>}
                  <div onPointerDown={(e) => startTrim(e, s, 'l')} className="absolute left-0 top-0 bottom-0 w-2 bg-primary/80 cursor-ew-resize hover:bg-primary" />
                  <div onPointerDown={(e) => startTrim(e, s, 'r')} className="absolute right-0 top-0 bottom-0 w-2 bg-primary/80 cursor-ew-resize hover:bg-primary" />
                </div>
              ))}
            </div>
            {/* Piste sous-titres : le texte de chaque plan, cliquable */}
            <div className="relative border-b border-white/10" style={{ height: 24 }} onClick={seekFromEvent}>
              {subtitlesOn && scenes.map((s, i) => {
                const txt = (s.subtitleText || s.voiceText || '').trim();
                if (!txt) return null;
                return (
                  <div key={s.id} onClick={(e) => { e.stopPropagation(); setSelId(s.id); setTab('plan'); }}
                    className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center gap-1 overflow-hidden cursor-pointer border ${selId === s.id ? 'border-primary/40 bg-primary/25' : 'border-primary/30/30 bg-primary/10'}`}
                    style={{ left: starts[i] * pxPerSec, width: Math.max(10, durOf(s) * pxPerSec) }}>
                    <Type size={10} className="text-primary shrink-0" /><span className="text-[10px] text-primary truncate">{txt}</span>
                  </div>
                );
              })}
            </div>
            {/* Piste voix (sous la vidéo) : voix off par plan ou narration globale */}
            <div className="relative border-b border-white/10" style={{ height: 26 }} onClick={seekFromEvent}>
              {narrationUrl ? (
                <div className="absolute top-1 bottom-1 left-0 rounded px-2 flex items-center gap-1.5 border border-primary/30/30 bg-primary/10" style={{ width: Math.max(40, total * pxPerSec) }}>
                  <Mic size={10} className="text-primary shrink-0" /><span className="text-[10px] text-primary truncate">{tp('Narration (kit)')}</span>
                </div>
              ) : scenes.map((s, i) => (s.audioUrl ? (
                <div key={s.id} onClick={(e) => { e.stopPropagation(); setSelId(s.id); setTab('plan'); }}
                  className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center gap-1 overflow-hidden cursor-pointer border ${selId === s.id ? 'border-primary/40 bg-primary/25' : 'border-primary/30/30 bg-primary/10'}`}
                  style={{ left: starts[i] * pxPerSec, width: Math.max(10, durOf(s) * pxPerSec) }}>
                  <Mic size={10} className="text-primary shrink-0" /><span className="text-[10px] text-primary truncate">{tp('Voix')}</span>
                </div>
              ) : null))}
            </div>
            {/* Piste musique */}
            <div className="relative" style={{ height: 28 }} onClick={seekFromEvent}>
              {musicUrl && <div onClick={(e) => { e.stopPropagation(); setTab('style'); }} className="absolute top-1 bottom-1 left-0 rounded px-2 flex items-center gap-1.5 border border-primary/30/30 bg-primary/10 cursor-pointer" style={{ width: Math.max(40, total * pxPerSec) }}><Music size={11} className="text-primary" /><span className="text-[10px] text-primary truncate">{tp('Musique de fond')}</span></div>}
            </div>
            {/* Tête de lecture */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none" style={{ left: currentTime * pxPerSec }}><div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500" /></div>
          </div>
        </div>
      </div>

      {/* Résultat export */}
      {resultUrl && (
        <div className="absolute inset-0 z-[80] bg-black/85 flex flex-col items-center justify-center p-6">
          <video src={resultUrl} controls autoPlay className="max-h-[70vh] rounded-xl bg-black" />
          <div className="mt-4 flex items-center gap-2">
            <button onClick={() => onDownload?.(resultUrl)} className={`${btn} h-10 px-5 bg-primary text-white hover:bg-primary`}><Download size={15} /> {tp('Télécharger')}</button>
            <button onClick={() => onSave?.()} disabled={saved} className={`${btn} h-10 px-5 border border-white/20 text-white hover:bg-card/10 disabled:opacity-60`}>{saved ? tp('Enregistré') : <><Save size={15} /> {tp('Enregistrer')}</>}</button>
            <button onClick={onNewMontage} className={`${btn} h-10 px-5 border border-white/20 text-white hover:bg-card/10`}>{tp('Continuer l\'édition')}</button>
          </div>
        </div>
      )}

      <audio ref={audioRef} className="hidden" />
      {narrationUrl && <audio ref={narrRef} src={narrationUrl} className="hidden" />}
      {musicUrl && <audio ref={musicRef} src={musicUrl} loop className="hidden" />}

      {/* Galerie clips / voix (thème sombre) pour le plan visé */}
      <DarkGalleryPicker open={picker.open} type={picker.type} onPick={handleGalleryPick} onClose={() => setPicker({ open: false, type: 'video', sceneId: null })} />
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-neutral-400">{label}</span>
      {children}
    </div>
  );
}
