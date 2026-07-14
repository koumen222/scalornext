import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Play, Pause, Scissors, ZoomIn, ZoomOut, Trash2, ChevronLeft, ChevronRight,
  Film, Image as ImageIcon, Mic, Music, Upload, Type, Loader2, Sparkles,
  ArrowLeftRight, Maximize2, X,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { TRANSITIONS, transLabel, CAPTION_STYLES } from './montageStyles.js';

// Éditeur vidéo multi-pistes façon CapCut : pistes vidéo / sous-titres / musique,
// tête de lecture, aperçu WYSIWYG (sous-titres dynamiques), découpe et rognage.
const uid = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtTime = (s) => {
  const t = Math.max(0, s || 0);
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  const cs = Math.floor((t - Math.floor(t)) * 10);
  return `${m}:${String(sec).padStart(2, '0')}.${cs}`;
};
const chunkCaption = (text) => {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i < words.length; i += 3) out.push(words.slice(i, i + 3).join(' '));
  return out;
};

export default function TimelineEditor({
  scenes, setScenes, format, narrationUrl, subtitlesOn,
  captionMode = 'dynamic', onSetCaptionMode,
  captionStyle = 'classic', onSetCaptionStyle,
  transition = 'fade', onSetTransition,
  musicUrl, musicVolume, setMusicVolume, onSetMusicUrl, onAddMusic, onOpenPro,
}) {
  const [pxPerSec, setPxPerSec] = useState(64);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sel, setSel] = useState({ type: 'clip', id: scenes[0]?.id || null });
  const [musicBusy, setMusicBusy] = useState(false);
  const [junctionMenu, setJunctionMenu] = useState(null); // index de scène (jonction après)
  const [presets, setPresets] = useState([]);
  const [presetsLoading, setPresetsLoading] = useState(false);

  // Charge les fonds sonores prédéfinis (générés côté serveur, mis en cache).
  useEffect(() => {
    let alive = true;
    setPresetsLoading(true);
    creativeApi.montage.presets()
      .then((r) => { if (alive) setPresets(r?.data?.presets || []); })
      .catch(() => { if (alive) setPresets([]); })
      .finally(() => { if (alive) setPresetsLoading(false); });
    return () => { alive = false; };
  }, []);

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const narrRef = useRef(null);
  const rafRef = useRef(null);
  const baseRef = useRef(0);
  const wallRef = useRef(0);
  const dragRef = useRef(null);

  const durOf = (s) => Math.max(0.3, Number(s.durationSec) || 4);
  const { starts, total } = useMemo(() => {
    const st = [];
    let acc = 0;
    for (const s of scenes) { st.push(acc); acc += durOf(s); }
    return { starts: st, total: acc };
  }, [scenes]);

  const activeIndex = useMemo(() => {
    if (!scenes.length) return 0;
    for (let i = 0; i < scenes.length; i += 1) {
      if (currentTime < starts[i] + durOf(scenes[i]) - 1e-3) return i;
    }
    return scenes.length - 1;
  }, [currentTime, scenes, starts]);

  const activeScene = scenes[activeIndex];
  const aspect = format === '9:16' ? '9 / 16' : format === '1:1' ? '1 / 1' : '16 / 9';
  const trackW = Math.max(total * pxPerSec + 8, 320);

  // ── Sous-titre dynamique affiché dans l'aperçu ──
  const activeCaption = useMemo(() => {
    const sc = scenes[activeIndex];
    if (!subtitlesOn || !sc) return { text: '', key: -1 };
    const cap = (sc.subtitleText || sc.voiceText || '').trim();
    if (!cap) return { text: '', key: -1 };
    if (captionMode === 'block') return { text: cap, key: 0 };
    const chunks = chunkCaption(cap);
    if (!chunks.length) return { text: cap, key: 0 };
    const local = clamp(currentTime - starts[activeIndex], 0, durOf(sc));
    const idx = Math.min(chunks.length - 1, Math.floor(local / (durOf(sc) / chunks.length)));
    return { text: chunks[idx], key: `${sc.id}-${idx}` };
  }, [scenes, activeIndex, currentTime, starts, subtitlesOn, captionMode]);

  // ── Synchronisation média ──
  const syncMedia = useCallback((play) => {
    const sc = scenes[activeIndex];
    if (!sc) return;
    const localOffset = clamp(currentTime - starts[activeIndex], 0, durOf(sc));
    if (narrationUrl && narrRef.current) {
      try { narrRef.current.currentTime = clamp(currentTime, 0, total); } catch { /* noop */ }
      if (play) narrRef.current.play().catch(() => {}); else narrRef.current.pause();
    }
    if (audioRef.current) {
      if (!narrationUrl && sc.audioUrl) {
        if (audioRef.current.getAttribute('data-src') !== sc.audioUrl) {
          audioRef.current.src = sc.audioUrl;
          audioRef.current.setAttribute('data-src', sc.audioUrl);
        }
        try { audioRef.current.currentTime = localOffset; } catch { /* noop */ }
        if (play) audioRef.current.play().catch(() => {}); else audioRef.current.pause();
      } else { audioRef.current.pause(); }
    }
    if (sc.videoUrl && videoRef.current) {
      videoRef.current.muted = !!narrationUrl || !!sc.audioUrl;
      try { videoRef.current.currentTime = (Number(sc.trimStart) || 0) + localOffset; } catch { /* noop */ }
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

  const togglePlay = () => setPlaying((p) => !p);
  const seekTo = (t) => { setPlaying(false); setCurrentTime(clamp(t, 0, total || 0.001)); };
  const seekFromEvent = (e) => {
    const host = e.currentTarget;
    const rect = host.getBoundingClientRect();
    seekTo((e.clientX - rect.left + (host.scrollLeft || 0)) / pxPerSec);
  };

  // ── Édition ──
  const patch = (id, p) => setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const removeScene = (id) => setScenes((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const move = (id, dir) => setScenes((prev) => {
    const i = prev.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const splitAtPlayhead = () => {
    const i = activeIndex;
    const sc = scenes[i];
    if (!sc) return;
    const o = currentTime - starts[i];
    if (o < 0.3 || o > durOf(sc) - 0.3) return;
    const first = { ...sc, durationSec: Math.round(o * 10) / 10 };
    const second = {
      ...sc, id: uid(),
      durationSec: Math.round((durOf(sc) - o) * 10) / 10,
      trimStart: sc.videoUrl ? Math.round(((Number(sc.trimStart) || 0) + o) * 10) / 10 : 0,
      audioUrl: '',
    };
    setScenes((prev) => { const n = [...prev]; n.splice(i, 1, first, second); return n; });
    setSel({ type: 'clip', id: second.id });
  };

  // ── Rognage par glissement des bords ──
  useEffect(() => {
    const onMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const deltaSec = (e.clientX - d.startX) / pxPerSec;
      setScenes((prev) => prev.map((s) => {
        if (s.id !== d.id) return s;
        const src = s.videoUrl ? (Number(s.srcDuration) || 0) : 0;
        if (d.edge === 'r') {
          const maxDur = s.videoUrl && src > 0 ? src - (Number(s.trimStart) || 0) : 30;
          const nd = clamp(d.origDur + deltaSec, 0.5, Math.max(0.5, maxDur));
          return { ...s, durationSec: Math.round(nd * 10) / 10 };
        }
        const shift = clamp(deltaSec, -(d.origTrim), d.origDur - 0.5);
        const nd = d.origDur - shift;
        const nt = s.videoUrl ? Math.max(0, d.origTrim + shift) : 0;
        return { ...s, durationSec: Math.round(nd * 10) / 10, trimStart: Math.round(nt * 10) / 10 };
      }));
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [pxPerSec, setScenes]);

  const startTrim = (e, s, edge) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { id: s.id, edge, startX: e.clientX, origDur: durOf(s), origTrim: Number(s.trimStart) || 0 };
    setSel({ type: 'clip', id: s.id });
  };

  const addMusic = async (file) => {
    if (!file || !onAddMusic) return;
    setMusicBusy(true);
    try { await onAddMusic(file); } finally { setMusicBusy(false); }
  };

  const selScene = scenes.find((s) => s.id === sel.id);

  return (
    <div className="space-y-3">
      <style>{`@keyframes tlpop{0%{transform:scale(.7);opacity:0}55%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}.tl-cap{animation:tlpop .26s ease-out}`}</style>

      {/* Aperçu WYSIWYG */}
      <div className="flex justify-center">
        <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: aspect, maxHeight: '44vh' }}>
          {activeScene?.videoUrl ? (
            <video key={activeScene.id} ref={videoRef} src={activeScene.videoUrl} playsInline className="w-full h-full object-cover" />
          ) : activeScene?.imageUrl ? (
            <img src={activeScene.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full min-w-[200px] flex items-center justify-center text-white/40 text-[13px]">{tp('Plan sans visuel')}</div>
          )}
          {activeCaption.text && (
            <div className="absolute inset-x-0 bottom-[13%] flex justify-center px-5 pointer-events-none">
              <span key={activeCaption.key} className="tl-cap inline-block bg-black/45 text-white font-extrabold text-center px-3 py-1 rounded-lg leading-tight"
                style={{ fontSize: 'clamp(14px, 3.4vh, 30px)', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>
                {activeCaption.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Transport */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="h-9 w-9 rounded-full bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-700">
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>
          <span className="text-[12px] font-mono text-gray-600 tabular-nums">{fmtTime(currentTime)} / {fmtTime(total)}</span>
          <button onClick={splitAtPlayhead} title={tp('Couper au curseur')} className="h-9 px-3 rounded-lg bg-gray-900 text-white text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-black"><Scissors size={14} /> {tp('Couper')}</button>
        </div>
        <div className="flex items-center gap-2">
          {subtitlesOn && (
            <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
              <button onClick={() => onSetCaptionMode?.('dynamic')} className={`h-9 px-2.5 text-[11.5px] font-semibold inline-flex items-center gap-1 ${captionMode === 'dynamic' ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600'}`}><Sparkles size={12} /> {tp('Dynamique')}</button>
              <button onClick={() => onSetCaptionMode?.('block')} className={`h-9 px-2.5 text-[11.5px] font-semibold ${captionMode === 'block' ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600'}`}>{tp('Bloc')}</button>
            </div>
          )}
          {onOpenPro && (
            <button onClick={onOpenPro} title={tp('Éditeur plein écran')} className="h-9 px-3 rounded-lg border border-gray-200 text-gray-600 text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-gray-50"><Maximize2 size={13} /> {tp('Plein écran')}</button>
          )}
          <button onClick={() => setPxPerSec((z) => clamp(z - 16, 24, 220))} className="h-9 w-9 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"><ZoomOut size={15} /></button>
          <button onClick={() => setPxPerSec((z) => clamp(z + 16, 24, 220))} className="h-9 w-9 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"><ZoomIn size={15} /></button>
        </div>
      </div>

      {/* Choix de transition pour la jonction sélectionnée */}
      {junctionMenu !== null && scenes[junctionMenu] && (
        <div className="flex items-center gap-2 flex-wrap rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
          <span className="text-[12px] font-semibold text-cyan-800">{tp('Transition après le plan')} {junctionMenu + 1} :</span>
          {TRANSITIONS.map((t) => (
            <button key={t.id} onClick={() => patch(scenes[junctionMenu].id, { transitionOut: t.id })}
              className={`h-7 px-2.5 rounded-md text-[12px] font-semibold transition ${(scenes[junctionMenu].transitionOut || transition) === t.id ? 'bg-cyan-600 text-white' : 'bg-white border border-cyan-200 text-cyan-700 hover:bg-cyan-100'}`}>
              {t.label}
            </button>
          ))}
          <button onClick={() => setJunctionMenu(null)} className="ml-auto text-gray-400 hover:text-gray-700"><X size={14} /></button>
        </div>
      )}

      {/* Pistes */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-x-auto">
        <div className="relative" style={{ width: trackW }}>
          {/* Règle */}
          <div className="relative h-6 border-b border-gray-200 cursor-pointer select-none" onClick={seekFromEvent}>
            {Array.from({ length: Math.ceil(total) + 1 }).map((_, s) => (
              <div key={s} className="absolute top-0 h-full border-l border-gray-200" style={{ left: s * pxPerSec }}>
                <span className="absolute top-0.5 left-1 text-[9px] text-gray-400">{s}s</span>
              </div>
            ))}
          </div>

          {/* Piste vidéo */}
          <div className="relative border-b border-gray-200" style={{ height: 66 }} onClick={seekFromEvent}>
            {scenes.map((s, i) => {
              const isSel = sel.type === 'clip' && s.id === sel.id;
              return (
                <div key={s.id} onClick={(e) => { e.stopPropagation(); setSel({ type: 'clip', id: s.id }); }}
                  className={`absolute top-1.5 bottom-1.5 rounded-md overflow-hidden cursor-pointer border-2 ${isSel ? 'border-cyan-500' : 'border-black/10'}`}
                  style={{ left: starts[i] * pxPerSec, width: Math.max(10, durOf(s) * pxPerSec) }}>
                  {s.videoPoster || s.imageUrl ? (
                    <img src={s.videoPoster || s.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
                  <div className="absolute inset-0 flex items-center justify-center text-white/80">
                    {s.videoUrl ? <Film size={15} /> : s.imageUrl ? <ImageIcon size={15} /> : <Mic size={15} />}
                  </div>
                  <span className="absolute bottom-0.5 left-1 text-[9px] font-bold text-white/90 drop-shadow">{durOf(s).toFixed(1)}s</span>
                  <div onPointerDown={(e) => startTrim(e, s, 'l')} className="absolute left-0 top-0 bottom-0 w-2 bg-cyan-500/80 cursor-ew-resize hover:bg-cyan-400" />
                  <div onPointerDown={(e) => startTrim(e, s, 'r')} className="absolute right-0 top-0 bottom-0 w-2 bg-cyan-500/80 cursor-ew-resize hover:bg-cyan-400" />
                </div>
              );
            })}
            {/* Boutons de transition entre les plans */}
            {scenes.slice(1).map((_, j) => {
              const cur = scenes[j].transitionOut || transition;
              return (
                <button key={`j${scenes[j].id}`} onClick={(e) => { e.stopPropagation(); setJunctionMenu(junctionMenu === j ? null : j); }}
                  title={`${tp('Transition')} : ${transLabel(cur)}`}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow ${junctionMenu === j ? 'bg-cyan-600 border-cyan-600' : 'bg-white border-cyan-500 hover:bg-cyan-50'}`}
                  style={{ left: starts[j + 1] * pxPerSec }}>
                  <ArrowLeftRight size={11} className={junctionMenu === j ? 'text-white' : 'text-cyan-600'} />
                </button>
              );
            })}
          </div>

          {/* Piste sous-titres */}
          <div className="relative border-b border-gray-200 bg-white/40" style={{ height: 34 }} onClick={seekFromEvent}>
            {subtitlesOn ? scenes.map((s, i) => {
              const cap = (s.subtitleText || s.voiceText || '').trim();
              const isSel = sel.type === 'subtitle' && s.id === sel.id;
              return (
                <div key={s.id} onClick={(e) => { e.stopPropagation(); setSel({ type: 'subtitle', id: s.id }); }}
                  className={`absolute top-1 bottom-1 rounded px-1.5 flex items-center overflow-hidden cursor-pointer border ${isSel ? 'border-cyan-500 bg-cyan-50' : 'border-cyan-200 bg-cyan-50/60'}`}
                  style={{ left: starts[i] * pxPerSec, width: Math.max(10, durOf(s) * pxPerSec) }}>
                  <Type size={10} className="text-cyan-600 mr-1 shrink-0" />
                  <span className="text-[10px] text-cyan-800 truncate">{cap || tp('(vide)')}</span>
                </div>
              );
            }) : <span className="absolute left-2 top-1.5 text-[10px] text-gray-300">{tp('Sous-titres désactivés')}</span>}
          </div>

          {/* Piste musique */}
          <div className="relative" style={{ height: 34 }} onClick={seekFromEvent}>
            {musicUrl ? (
              <div onClick={(e) => { e.stopPropagation(); setSel({ type: 'music', id: 'music' }); }}
                className={`absolute top-1 bottom-1 left-0 rounded px-2 flex items-center gap-1.5 overflow-hidden cursor-pointer border ${sel.type === 'music' ? 'border-emerald-500 bg-emerald-50' : 'border-emerald-200 bg-emerald-50/60'}`}
                style={{ width: Math.max(40, total * pxPerSec) }}>
                <Music size={11} className="text-emerald-600 shrink-0" />
                <span className="text-[10px] text-emerald-800 truncate">{tp('Musique de fond')}</span>
              </div>
            ) : (
              <label className={`absolute top-1 left-2 h-[26px] px-2.5 rounded border border-dashed border-gray-300 text-[10.5px] font-semibold text-gray-500 inline-flex items-center gap-1.5 cursor-pointer hover:border-emerald-300 ${musicBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                {musicBusy ? <Loader2 size={11} className="animate-spin" /> : <Music size={11} />} {tp('Ajouter une musique')}
                <input type="file" accept="audio/*" className="hidden" onClick={(e) => e.stopPropagation()} onChange={(e) => addMusic(e.target.files?.[0])} />
              </label>
            )}
          </div>

          {/* Tête de lecture (superposée sur toutes les pistes) */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none" style={{ left: currentTime * pxPerSec }}>
            <div className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
        </div>
      </div>

      {/* Fonds sonores prédéfinis */}
      <div className="flex items-center gap-2 flex-wrap rounded-xl border border-gray-200 bg-white px-3 py-2">
        <span className="text-[12px] font-semibold text-gray-700 inline-flex items-center gap-1.5"><Music size={13} className="text-emerald-600" /> {tp('Fonds sonores')} :</span>
        {presetsLoading ? <Loader2 size={14} className="animate-spin text-gray-300" /> : presets.length ? presets.map((p) => (
          <button key={p.id} onClick={() => onSetMusicUrl?.(p.url)}
            className={`h-7 px-2.5 rounded-md text-[12px] font-semibold transition ${musicUrl === p.url ? 'bg-emerald-600 text-white' : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'}`}>
            {p.label}
          </button>
        )) : <span className="text-[11px] text-gray-400">{tp('Indisponibles')}</span>}
        <label className={`h-7 px-2.5 rounded-md text-[12px] font-semibold border border-dashed border-gray-300 text-gray-500 inline-flex items-center gap-1.5 cursor-pointer hover:border-emerald-300 ${musicBusy ? 'opacity-50 pointer-events-none' : ''}`}>
          <Upload size={12} /> {tp('Importer')}
          <input type="file" accept="audio/*" className="hidden" onChange={(e) => addMusic(e.target.files?.[0])} />
        </label>
        {musicUrl && <button onClick={() => onSetMusicUrl?.('')} className="text-[11px] text-gray-400 hover:text-red-500 inline-flex items-center gap-1"><X size={12} /> {tp('Retirer')}</button>}
      </div>

      {/* Inspecteur */}
      {sel.type === 'clip' && selScene && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-3">
          <span className="text-[12px] font-semibold text-gray-700">{tp('Plan')}</span>
          <span className="text-[11px] text-gray-400">{selScene.videoUrl ? tp('Clip') : selScene.imageUrl ? tp('Image') : tp('Sans visuel')} · {durOf(selScene).toFixed(1)}s{selScene.videoUrl && selScene.srcDuration ? ` / ${Number(selScene.srcDuration).toFixed(1)}s` : ''}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => move(selScene.id, -1)} className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"><ChevronLeft size={15} /></button>
            <button onClick={() => move(selScene.id, 1)} className="h-8 w-8 rounded-lg border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"><ChevronRight size={15} /></button>
            <button onClick={() => { if (selScene.videoUrl) patch(selScene.id, { trimStart: 0, durationSec: selScene.srcDuration || durOf(selScene) }); }} disabled={!selScene.videoUrl} className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">{tp('Réinit. rognage')}</button>
            <button onClick={() => removeScene(selScene.id)} disabled={scenes.length <= 1} className="h-8 w-8 rounded-lg border border-gray-200 text-red-400 flex items-center justify-center hover:bg-red-50 disabled:opacity-40"><Trash2 size={14} /></button>
          </div>
        </div>
      )}
      {sel.type === 'subtitle' && selScene && (
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-1"><Type size={12} /> {tp('Sous-titre de ce plan')}</label>
          <textarea value={selScene.subtitleText || ''} onChange={(e) => patch(selScene.id, { subtitleText: e.target.value })} rows={2}
            placeholder={tp('Texte affiché à l\'écran…')}
            className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-cyan-400 resize-y" />
          {onSetCaptionStyle && (
            <div className="mt-2">
              <p className="text-[11px] font-semibold text-gray-500 mb-1">{tp('Modèle de sous-titre (global)')}</p>
              <div className="flex flex-wrap gap-1.5">
                {CAPTION_STYLES.map((cs) => (
                  <button key={cs.id} onClick={() => onSetCaptionStyle(cs.id)}
                    className={`h-8 px-2 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 transition ${captionStyle === cs.id ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded" style={{ background: cs.bg === 'transparent' ? '#1f2937' : cs.bg, color: cs.text }}>A</span>
                    {cs.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {sel.type === 'music' && musicUrl && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap items-center gap-3">
          <Music size={15} className="text-emerald-600" />
          <audio src={musicUrl} controls className="h-8 flex-1 min-w-[180px]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500">{tp('Volume')}</span>
            <input type="range" min={0} max={0.5} step={0.05} value={musicVolume} onChange={(e) => setMusicVolume?.(Number(e.target.value))} className="w-28 accent-emerald-600" />
          </div>
          <button onClick={() => { onSetMusicUrl?.(''); setSel({ type: 'clip', id: scenes[0]?.id }); }} className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] text-red-500 hover:bg-red-50">{tp('Retirer')}</button>
        </div>
      )}

      <p className="text-[11px] text-gray-400">{tp('Règle = déplacer la lecture · « Couper » = scinder au curseur · bords cyan = rogner · piste sous-titres = éditer le texte · piste musique = fond sonore.')}</p>

      <audio ref={audioRef} className="hidden" />
      {narrationUrl && <audio ref={narrRef} src={narrationUrl} className="hidden" />}
    </div>
  );
}
