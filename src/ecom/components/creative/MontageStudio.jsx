import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Clapperboard, Plus, Trash2, ChevronUp, ChevronDown, Copy, Mic, Upload,
  Music, Wand2, Loader2, Download, Save, X, Play, Type, Images, Film,
  Volume2, Check, AlertCircle, Sparkles, Maximize2,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, Field, ImportProductBar, stripHtml, downloadFile } from './creativeShared.jsx';
import { consumeMontageDraft, consumeMontageProject } from './montageBridge.js';
import { TRANSITIONS, CAPTION_STYLES, CAPTION_ANIMS, CAPTION_POSITIONS, CAPTION_FONTS } from './montageStyles.js';
import ProEditor from './ProEditor.jsx';

const A = ACCENTS.montage;

const FORMATS = [
  { id: '9:16', label: '9:16', hint: tp('TikTok / Reels') },
  { id: '1:1', label: '1:1', hint: tp('Feed carré') },
  { id: '16:9', label: '16:9', hint: tp('YouTube') },
];

// Voix off partagée (une seule voix pour TOUTES les scènes) — mêmes IDs que le Studio Lancement.
const VOICES = [
  { id: '498c39373700473b9e5251cb2f2049bc', label: 'Dame africaine' },
  { id: '13f7f6e260f94079b9d51c961fa6c9e2', label: 'Michelle' },
  { id: '14b22748e04a48a58f92fbcde088ee50', label: 'Rita' },
  { id: 'e3a12335ddd040209a99002ee76b682f', label: 'Sophie' },
  { id: '4f2a0684dd0247dda68f339738c780e6', label: 'Le narrateur' },
  { id: '', label: tp('Voix du modèle') },
];

let SCENE_SEQ = 1;
const newScene = () => ({
  id: `s${SCENE_SEQ++}`,
  videoUrl: '', videoPoster: '', videoName: '', imageUrl: '',
  audioUrl: '', voiceText: '', subtitleText: '',
  durationSec: 5, trimStart: 0, srcDuration: 0,
  volume: 1, fadeIn: 0, fadeOut: 0, transitionOut: '',
  // genMode : 'video' = clip IA généré (précis, plus cher) ; 'image' = image IA
  // animée au montage par Ken Burns (~2-5× moins cher, idéal plans illustratifs).
  // overlays : images superposées [{ url, xPct, yPct, wPct }] (éditeur Pro).
  clipPrompt: '', showProduct: true, genMode: 'video', overlays: [], busy: '',
});

// Lit la durée d'un média audio/vidéo côté navigateur (métadonnées).
function readMediaDuration(url, kind = 'audio') {
  return new Promise((resolve) => {
    try {
      const el = document.createElement(kind === 'video' ? 'video' : 'audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => { const d = el.duration; resolve(Number.isFinite(d) && d > 0 ? d : null); };
      el.onerror = () => resolve(null);
      el.src = url;
    } catch { resolve(null); }
  });
}

// ─── Sélecteur galerie (clips vidéo ou voix off enregistrées) ────────────────
function GalleryPicker({ open, type, onPick, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[80vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
          <p className="text-sm font-bold text-gray-900">{type === 'video' ? tp('Choisir un clip') : tp('Choisir une voix off')}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div>
          ) : !items.length ? (
            <p className="py-16 text-center text-[13px] text-gray-400">{tp('Aucun contenu dans la galerie pour le moment.')}</p>
          ) : type === 'video' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.filter((it) => it.videoUrl).map((it) => (
                <button key={it._id} onClick={() => onPick(it)}
                  className="group text-left rounded-xl overflow-hidden border border-gray-200 hover:border-cyan-400 hover:shadow-md transition">
                  <div className="aspect-video bg-black/90 flex items-center justify-center overflow-hidden">
                    {it.thumbnailUrl || it.imageUrl
                      ? <img src={it.thumbnailUrl || it.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <Film size={22} className="text-white/60" />}
                  </div>
                  <p className="px-2 py-1.5 text-[11px] font-medium text-gray-700 truncate">{it.label || it.title || it.productName || tp('Clip')}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {items.filter((it) => it.audioUrl).map((it) => (
                <div key={it._id} className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
                  <audio src={it.audioUrl} controls className="h-8 flex-1" />
                  <button onClick={() => onPick(it)} className="h-8 px-3 rounded-lg bg-cyan-600 text-white text-[12px] font-semibold hover:bg-cyan-700">{tp('Choisir')}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Aperçu en direct : lit les scènes en séquence (visuel + sous-titre + voix) ──
function PreviewPlayer({ scenes, format, narrationUrl, subtitlesOn, musicUrl, musicVolume, captionPosition = 'middle', onClose }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const narrRef = useRef(null);
  const musicRef = useRef(null);

  // Musique de fond dans l'aperçu : ce que tu entends = ce que le rendu mixera.
  useEffect(() => {
    const el = musicRef.current;
    if (!el || !musicUrl) return undefined;
    const v = Number(musicVolume);
    el.volume = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0.5));
    el.play().catch(() => {});
    return () => el.pause();
  }, [musicUrl, musicVolume]);
  const aspect = format === '9:16' ? '9 / 16' : format === '1:1' ? '1 / 1' : '16 / 9';
  const scene = scenes[idx];

  useEffect(() => {
    if (!scene) { onClose?.(); return undefined; }
    const ms = Math.max(1, Number(scene.durationSec) || 4) * 1000;
    timerRef.current = setTimeout(() => {
      if (idx + 1 < scenes.length) setIdx(idx + 1); else onClose?.();
    }, ms);
    if (!narrationUrl && scene.audioUrl && audioRef.current) {
      try { audioRef.current.src = scene.audioUrl; audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); } catch { /* noop */ }
    }
    return () => { clearTimeout(timerRef.current); if (audioRef.current) audioRef.current.pause(); };
  }, [idx, scene, scenes.length, narrationUrl, onClose]);

  useEffect(() => {
    if (narrationUrl && narrRef.current) { try { narrRef.current.currentTime = 0; narrRef.current.play().catch(() => {}); } catch { /* noop */ } }
    return () => { if (narrRef.current) narrRef.current.pause(); };
  }, [narrationUrl]);

  if (!scene) return null;
  const caption = scene.subtitleText || scene.voiceText || '';
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: aspect, maxHeight: '78vh', maxWidth: '96vw' }} onClick={(e) => e.stopPropagation()}>
        {scene.videoUrl ? (
          <video key={scene.id} src={scene.videoUrl} autoPlay muted={!!narrationUrl || !!scene.audioUrl} loop playsInline className="w-full h-full object-cover" />
        ) : scene.imageUrl ? (
          <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 text-[13px]">{tp('Plan sans visuel')}</div>
        )}
        {subtitlesOn && caption && (
          <div className={`absolute inset-x-0 flex justify-center px-6 ${captionPosition === 'top' ? 'top-6' : captionPosition === 'middle' ? 'top-1/2 -translate-y-1/2' : 'bottom-6'}`}>
            <span className="bg-black/60 text-white text-[14px] font-bold text-center px-3 py-1.5 rounded-lg max-w-[90%]">{caption}</span>
          </div>
        )}
        <div className="absolute top-0 inset-x-0 flex gap-1 p-2">
          {scenes.map((sc, i) => <div key={sc.id} className={`h-1 flex-1 rounded-full ${i <= idx ? 'bg-white' : 'bg-white/30'}`} />)}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-white/70 text-[12px]">{tp('Aperçu')} — {tp('plan')} {idx + 1}/{scenes.length}</span>
        <button onClick={onClose} className="h-9 px-4 rounded-xl bg-white/15 text-white text-[13px] font-semibold hover:bg-white/25">{tp('Fermer')}</button>
      </div>
      <audio ref={audioRef} className="hidden" />
      {narrationUrl && <audio ref={narrRef} src={narrationUrl} className="hidden" />}
      {musicUrl && <audio ref={musicRef} src={musicUrl} loop className="hidden" />}
    </div>
  );
}

const MontageStudio = ({ importedProduct, onImport, onClearImport }) => {
  const [scenes, setScenes] = useState(() => [newScene(), newScene()]);
  const [prefillInfo, setPrefillInfo] = useState('');
  const [narrationUrl, setNarrationUrl] = useState('');
  const [format, setFormat] = useState('9:16');
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [captionMode, setCaptionMode] = useState('dynamic');
  const [captionStyle, setCaptionStyle] = useState('classic');
  const [captionAnim, setCaptionAnim] = useState('pop');
  // Défauts du montage (auto compris) : sous-titres CENTRÉS, UNE ligne.
  const [captionPosition, setCaptionPosition] = useState('middle');
  const [captionOffsetPct, setCaptionOffsetPct] = useState(null); // position libre (drag) en % de hauteur
  const [captionScale, setCaptionScale] = useState(1); // taille des sous-titres (0.5-2)
  const [captionMaxLines, setCaptionMaxLines] = useState(1); // lignes max par réplique (1-3)
  const [captionFont, setCaptionFont] = useState('sans'); // police embarquée moteur
  const [captionCase, setCaptionCase] = useState('none'); // 'none' | 'upper' (MAJUSCULES)
  const [transition, setTransition] = useState('dynamic');
  const [renderWarning, setRenderWarning] = useState('');
  const [musicOk, setMusicOk] = useState(false); // confirmation « musique bien mixée » du moteur
  const [voiceRefId, setVoiceRefId] = useState(VOICES[0].id);
  const [musicUrl, setMusicUrl] = useState('');
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [musicBusy, setMusicBusy] = useState(false);
  const [musicPresets, setMusicPresets] = useState([]);

  // Fonds sonores prédéfinis (vraies musiques + synthés) — chargés une fois.
  useEffect(() => {
    let alive = true;
    creativeApi.montage.presets()
      .then((r) => { if (alive) setMusicPresets(r?.data?.presets || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  const [preview, setPreview] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [picker, setPicker] = useState({ open: false, type: 'video', sceneId: null });
  const pollRef = useRef(null);
  // Montage AUTO (un clic depuis un lancement) : étapes du pipeline plein écran.
  const [autoStep, setAutoStep] = useState(''); // '' | 'visuals' | 'director' | 'voices' | 'render'
  const [directorOn, setDirectorOn] = useState(true); // direction IA sur le montage manuel
  // Mode de génération des visuels : 'mixte' (répartition intelligente par
  // pertinence de plan), 'video' (tout en clips IA), 'image' (tout en images
  // animées — le plus économique).
  const [genStrategy, setGenStrategy] = useState('mixte');
  const [autoDone, setAutoDone] = useState(0);
  const [autoTotal, setAutoTotal] = useState(0);
  const autoPendingRef = useRef(false);

  // Produit du brouillon de lancement (image/description saisies à la main dans
  // « Lancement produit ») : sert de repli quand aucun produit boutique n'est importé.
  const [draftProduct, setDraftProduct] = useState(null);
  const subject = importedProduct?.name || draftProduct?.name || '';
  const productContext = importedProduct?.description
    ? stripHtml(importedProduct.description).slice(0, 1500)
    : (draftProduct?.context || '');
  const productImage = importedProduct?.imageUrl || draftProduct?.imageUrl || '';

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Pré-remplissage depuis un angle marketing (Lancement → « Envoyer au montage »),
  // récupéré via le relais module au montage du studio (fiable même après remontage d'onglet).
  useEffect(() => {
    const draft = consumeMontageDraft();
    if (!draft || !Array.isArray(draft.scenes) || !draft.scenes.length) return;
    const imgs = Array.isArray(draft.images) ? draft.images.filter(Boolean) : [];
    setScenes(draft.scenes.map((sc, i) => ({
      ...newScene(),
      voiceText: sc.voiceText || '',
      subtitleText: sc.subtitleText || sc.voiceText || '',
      clipPrompt: sc.clipPrompt || '',
      showProduct: sc.showProduct !== false,
      // Stratégie mixte du storyboard (vidéo / image animée) — était perdue ici.
      genMode: sc.genMode === 'image' ? 'image' : 'video',
      // Décisions de monteur expert : transition selon le rôle narratif,
      // médaillon produit et cercle d'accent (appliqués par le pipeline auto).
      transitionOut: sc.transitionOut || '',
      overlayProduct: sc.overlayProduct === true,
      highlight: sc.highlight === true,
      durationSec: Math.max(1, Math.min(30, Number(sc.durationSec) || 4)),
      imageUrl: imgs.length ? imgs[i % imgs.length] : '',
    })));
    setNarrationUrl(draft.voiceoverUrl || '');
    // Produit transmis par le lancement (y compris saisi à la main là-bas).
    if (draft.productName || draft.productImage || draft.productContext) {
      setDraftProduct({ name: draft.productName || '', imageUrl: draft.productImage || '', context: String(draft.productContext || '').slice(0, 1500) });
    }
    setResultUrl(''); setProgress(0); setSaved(false); setError('');
    setPrefillInfo(draft.angleTitle || draft.productName || '');
    if (draft.auto) autoPendingRef.current = true; // → pipeline complet dès que les scènes sont posées
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ré-édition d'une vidéo de la galerie : charge le projet enregistré (scènes + réglages).
  useEffect(() => {
    const proj = consumeMontageProject();
    if (!proj || !Array.isArray(proj.scenes) || !proj.scenes.length) return;
    setScenes(proj.scenes.map((s) => ({ ...newScene(), ...s, busy: '' })));
    const st = proj.settings || {};
    if (st.format) setFormat(st.format);
    if (typeof st.subtitles === 'boolean') setSubtitlesOn(st.subtitles);
    if (st.captionStyle) setCaptionStyle(st.captionStyle);
    if (st.captionAnim) setCaptionAnim(st.captionAnim);
    if (st.captionPosition) setCaptionPosition(st.captionPosition);
    if (st.captionOffsetPct != null) setCaptionOffsetPct(Number(st.captionOffsetPct));
    if (st.captionScale) setCaptionScale(Number(st.captionScale));
    if (st.captionMaxLines) setCaptionMaxLines(Number(st.captionMaxLines));
    if (st.captionFont) setCaptionFont(st.captionFont);
    if (st.captionCase) setCaptionCase(st.captionCase);
    if (st.transition) setTransition(st.transition);
    if (st.musicUrl !== undefined) setMusicUrl(st.musicUrl || '');
    if (st.musicVolume != null) setMusicVolume(Number(st.musicVolume));
    setNarrationUrl(st.narrationUrl || '');
    setResultUrl(''); setProgress(0); setSaved(false);
    setProOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchScene = useCallback((id, patch) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);
  const addScene = () => setScenes((prev) => [...prev, newScene()]);
  const removeScene = (id) => setScenes((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  const duplicateScene = (id) => setScenes((prev) => {
    const i = prev.findIndex((s) => s.id === id);
    if (i < 0) return prev;
    const copy = { ...prev[i], id: `s${SCENE_SEQ++}` };
    return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
  });
  const moveScene = (id, dir) => setScenes((prev) => {
    const i = prev.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  // ── Clip : upload ──
  const uploadClip = async (id, file) => {
    if (!file) return;
    patchScene(id, { busy: 'clip' });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      const dur = await readMediaDuration(data.url, 'video');
      patchScene(id, { videoUrl: data.url, videoName: file.name, busy: '', trimStart: 0, ...(dur ? { durationSec: Math.round(dur * 10) / 10, srcDuration: Math.round(dur * 10) / 10 } : {}) });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      patchScene(id, { busy: '' });
    }
  };

  // ── CŒURS COMMUNS manuel/auto : le mode auto appelle EXACTEMENT ces mêmes
  //    fonctions (mêmes prompts, mêmes gardes, même post-traitement) — l'auto
  //    ne fait qu'enchaîner ce que les boutons par plan font un à un. ──
  const generateVisualCore = async (sc) => {
    const prompt = (sc.clipPrompt || '').trim();
    const useProduct = sc.showProduct !== false;
    if (useProduct && !productImage) throw new Error(tp('Importe un produit (avec photo) pour un plan AVEC produit, ou décoche « Produit visible », ou choisis/uploade un clip.'));
    if (!useProduct && prompt.length < 8) throw new Error(tp('Décris le plan à générer (quelques mots) quand le produit n’est pas visible.'));
    const asImage = sc.genMode === 'image';
    const { data } = await creativeApi.video.generateScene({
      mode: 'scene', prompt, scenario: '',
      // Stratégie mixte éco : stage 'character' = image IA seule (le montage
      // l'anime en Ken Burns), sans passage par la génération vidéo payante.
      ...(asImage ? { stage: 'character' } : {}),
      // Phrase dite sur ce plan : le réalisateur IA l'illustre visuellement
      // (plante/ingrédient cité, composition, processus… montrés à l'écran).
      voiceoverText: String(sc.voiceText || sc.subtitleText || '').trim(),
      sourceUrl: useProduct ? productImage : null,
      showProduct: useProduct,
      // Clip IA : durée de la scène (rythme par rôle), bornée 3-6 s.
      subject, productContext, durationSec: Math.max(3, Math.min(6, Math.round(sc.durationSec || 5))),
    });
    if (asImage) {
      const img = data?.startImage || '';
      if (!data?.success || !img) throw new Error(data?.message || tp('Génération de l’image impossible'));
      return { genMode: 'image', imageUrl: img, videoUrl: '', videoName: '', videoPoster: '', trimStart: 0 };
    }
    const url = data?.videoUrl || '';
    if (!data?.success || !url) throw new Error(data?.message || tp('Génération du clip impossible'));
    const dur = await readMediaDuration(url, 'video');
    return { genMode: 'video', videoUrl: url, imageUrl: '', videoName: tp('Clip IA'), trimStart: 0, ...(dur ? { durationSec: Math.round(dur * 10) / 10, srcDuration: Math.round(dur * 10) / 10 } : {}) };
  };

  const generateVoiceCore = async (sc) => {
    const text = (sc.voiceText || '').trim();
    if (text.length < 2) return null;
    const { data } = await creativeApi.launch.voiceover({ text, referenceId: voiceRefId || undefined });
    if (!data?.success || !data.url) throw new Error(data?.message || tp('Voix off impossible'));
    const dur = await readMediaDuration(data.url, 'audio');
    return {
      audioUrl: data.url,
      subtitleText: sc.subtitleText || text,
      ...(dur ? { durationSec: Math.max(1, Math.round(dur * 10) / 10) } : {}),
    };
  };

  // ── Clip : génération IA (bouton par plan) — délègue au cœur commun. ──
  const generateClip = async (id, promptText) => {
    const sc = scenes.find((s) => s.id === id);
    if (!sc) return;
    patchScene(id, { busy: 'clip' });
    setError('');
    try {
      const p = await generateVisualCore({ ...sc, clipPrompt: (promptText ?? sc.clipPrompt) || '' });
      patchScene(id, { ...p, busy: '' });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      patchScene(id, { busy: '' });
    }
  };

  // ── Voix off : génération (bouton par plan) — délègue au cœur commun. ──
  const generateVoice = async (id) => {
    const sc = scenes.find((s) => s.id === id);
    const text = (sc?.voiceText || '').trim();
    if (text.length < 2) { setError(tp('Écris le texte de la voix off pour cette scène.')); return; }
    patchScene(id, { busy: 'voice' });
    setError('');
    try {
      const p = await generateVoiceCore(sc);
      patchScene(id, { ...(p || {}), busy: '' });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      patchScene(id, { busy: '' });
    }
  };

  // ── Voix off : upload ──
  const uploadVoice = async (id, file) => {
    if (!file) return;
    patchScene(id, { busy: 'voice' });
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      const dur = await readMediaDuration(data.url, 'audio');
      // La durée planifiée du plan (rythme) reste le plancher ; la voix peut l'allonger.
      patchScene(id, { audioUrl: data.url, busy: '', ...(dur ? { durationSec: Math.max(Number(sc?.durationSec) || 3, Math.round(dur * 10) / 10) } : {}) });
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      patchScene(id, { busy: '' });
    }
  };

  // ── Musique de fond : upload ──
  const uploadMusic = async (file) => {
    if (!file) return;
    setMusicBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      setMusicUrl(data.url);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    } finally {
      setMusicBusy(false);
    }
  };

  const openPicker = (type, sceneId) => setPicker({ open: true, type, sceneId });
  const handlePick = async (item) => {
    const { type, sceneId } = picker;
    setPicker({ open: false, type, sceneId: null });
    if (type === 'video' && item.videoUrl) {
      const dur = await readMediaDuration(item.videoUrl, 'video');
      patchScene(sceneId, { videoUrl: item.videoUrl, videoPoster: item.thumbnailUrl || item.imageUrl || '', videoName: item.label || tp('Clip'), trimStart: 0, ...(dur ? { durationSec: Math.round(dur * 10) / 10, srcDuration: Math.round(dur * 10) / 10 } : {}) });
    } else if (type === 'audio' && item.audioUrl) {
      const dur = await readMediaDuration(item.audioUrl, 'audio');
      patchScene(sceneId, { audioUrl: item.audioUrl, ...(dur ? { durationSec: Math.max(1, Math.round(dur * 10) / 10) } : {}) });
    }
  };

  const readyScenes = scenes.filter((s) => s.videoUrl || s.imageUrl);
  const totalDuration = readyScenes.reduce((t, s) => t + (Number(s.durationSec) || 0), 0);
  const canRender = readyScenes.length >= 1 && !rendering;

  // ── Directeur de montage IA : récupération du plan (avec la liste des
  //    musiques, chargée à la volée si besoin) puis application. ──
  const fetchDirectorPlan = async (list) => {
    let presetList = musicPresets;
    if (!presetList.length) {
      try {
        const r = await creativeApi.montage.presets();
        presetList = r?.data?.presets || [];
        if (presetList.length) setMusicPresets(presetList);
      } catch { /* pas de presets disponibles */ }
    }
    const { data } = await creativeApi.montage.director({
      productName: subject, productContext,
      musicPresets: presetList.map((p) => p.id),
      scenes: list.map((s) => ({
        voiceText: s.voiceText, subtitleText: s.subtitleText, clipPrompt: s.clipPrompt,
        role: s.role || '', showProduct: s.showProduct !== false,
        genMode: s.genMode || 'video', durationSec: s.durationSec,
      })),
    });
    return data?.success && data.plan ? { plan: data.plan, presetList } : null;
  };

  // Applique le plan du directeur. respectUser=true (montage manuel) : ne
  // touche à rien de ce que l'utilisateur a déjà personnalisé — il complète.
  const applyDirectorPlan = (list, plan, presetList, { respectUser }) => {
    const overrides = {};
    const captionsUntouched = captionStyle === 'classic' && captionAnim === 'pop'
      && captionFont === 'sans' && captionCase === 'none' && captionOffsetPct == null;
    if (!respectUser || captionsUntouched) {
      setCaptionStyle(plan.captionStyle); overrides.captionStyle = plan.captionStyle;
      setCaptionAnim(plan.captionAnim); overrides.captionAnim = plan.captionAnim;
      setCaptionPosition(plan.captionPosition); overrides.captionPosition = plan.captionPosition;
      setCaptionFont(plan.captionFont); overrides.captionFont = plan.captionFont;
      setCaptionCase(plan.captionCase); overrides.captionCase = plan.captionCase;
    }
    const preset = presetList.find((p) => p.id === plan.musicPreset);
    if (preset?.url && !musicUrl) {
      setMusicUrl(preset.url); overrides.musicUrl = preset.url;
      setMusicVolume(plan.musicVolume); overrides.musicVolume = plan.musicVolume;
    }
    const out = [...list];
    plan.scenes.forEach((p, i) => {
      if (!out[i]) return;
      const s = out[i];
      const overlays = [...(s.overlays || [])];
      if (p.overlayProduct && productImage && !overlays.some((o) => !o.shape)) {
        overlays.push({ url: productImage, xPct: 79, yPct: 80, wPct: 26 }); // médaillon produit
      }
      if (p.accent && !overlays.some((o) => o.shape)) {
        // Accent situationnel choisi par l'IA (cercle, flèche, coche, croix, étoile, alerte, cœur).
        overlays.push({ shape: p.accent.type, xPct: p.accent.xPct, yPct: p.accent.yPct, wPct: p.accent.wPct });
      }
      const keepUserTransition = respectUser && s.transitionOut;
      out[i] = {
        ...s,
        transitionOut: keepUserTransition ? s.transitionOut : (p.transitionOut || s.transitionOut || ''),
        ...(s.genMode === 'image' && p.kenBurns && (!respectUser || !s.kenBurns) ? { kenBurns: p.kenBurns } : {}),
        overlays: overlays.slice(0, 3),
      };
      patchScene(s.id, { transitionOut: out[i].transitionOut, kenBurns: out[i].kenBurns, overlays: out[i].overlays });
    });
    return { scs: out, overrides };
  };

  // « Monter la vidéo » : la direction IA s'applique AUSSI au montage manuel
  // (elle complète sans écraser tes choix), puis le rendu démarre.
  const renderWithDirector = async () => {
    if (!canRender) return;
    if (!directorOn) { startRender(); return; }
    setError('');
    setAutoStep('director');
    let list = scenes;
    let overrides = {};
    try {
      const res = await fetchDirectorPlan(scenes);
      if (res) {
        const applied = applyDirectorPlan(scenes, res.plan, res.presetList, { respectUser: true });
        list = applied.scs;
        overrides = applied.overrides;
      }
    } catch { /* directeur indisponible → rendu direct */ }
    setAutoStep('render');
    await startRender(list, overrides);
  };

  // ── Montage AUTO : génère tous les visuels manquants (stratégie mixte),
  //    les voix par plan, puis assemble — un seul clic, un seul écran. ──
  const runAutoMontage = async (list) => {
    const scs = [...list];
    // Mode de génération : 'mixte' respecte la pertinence décidée par plan
    // (storyboard) ; 'image'/'video' forcent tout dans un seul type.
    const effMode = (s) => (genStrategy === 'image' ? 'image'
      : genStrategy === 'video' ? 'video'
        : (s.genMode === 'image' ? 'image' : 'video'));
    const missing = scs.filter((s) => !s.videoUrl && !s.imageUrl).length;
    setError(''); setAutoDone(0); setAutoTotal(missing);
    try {
      // ── 1. L'IA ORCHESTRE D'ABORD : le directeur décide AVANT la génération
      //    — dont la répartition vidéo/image de chaque plan en mode Mixte. ──
      setAutoStep('director');
      let renderOverrides = {};
      let directed = false;
      try {
        const res = await fetchDirectorPlan(scs);
        if (res) {
          const applied = applyDirectorPlan(scs, res.plan, res.presetList, { respectUser: false });
          scs.splice(0, scs.length, ...applied.scs);
          renderOverrides = applied.overrides;
          // Mixte : la pertinence décidée par le directeur fixe le type de
          // chaque plan encore sans visuel.
          if (genStrategy === 'mixte' && Array.isArray(res.plan.scenes)) {
            res.plan.scenes.forEach((p, i) => {
              if (!scs[i] || scs[i].videoUrl || scs[i].imageUrl || !p.media) return;
              scs[i] = { ...scs[i], genMode: p.media };
              patchScene(scs[i].id, { genMode: p.media });
            });
          }
          directed = true;
        }
      } catch { /* directeur indisponible → secours règles statiques ci-dessous */ }
      if (!directed) {
        // Secours : médaillons/cercles par règles, et en Mixte une répartition
        // heuristique si AUCUN plan n'est encore en image (hook et final en
        // vidéo, un plan intermédiaire sur deux en image).
        const noneImage = genStrategy === 'mixte' && !scs.some((s) => s.genMode === 'image');
        for (let i = 0; i < scs.length; i += 1) {
          const s = scs[i];
          const patch = {};
          if (noneImage && !s.videoUrl && !s.imageUrl && i !== 0 && i !== scs.length - 1 && i % 2 === 1) {
            patch.genMode = 'image';
          }
          const extra = [];
          if (s.overlayProduct && productImage && !(s.overlays || []).length) {
            extra.push({ url: productImage, xPct: 79, yPct: 80, wPct: 26 }); // médaillon bas-droite
          }
          if (s.highlight) {
            extra.push({ shape: 'ring', xPct: 50, yPct: 46, wPct: 34 }); // cercle d'accent
          }
          if (extra.length) patch.overlays = [...(s.overlays || []), ...extra].slice(0, 3);
          if (Object.keys(patch).length) {
            scs[i] = { ...s, ...patch };
            patchScene(s.id, patch);
          }
        }
      }
      // ── 2. Génération des visuels manquants (mêmes fonctions que les boutons),
      //    en DEUX VOIES PARALLÈLES : les plans image (gpt-image) d'un côté,
      //    les plans vidéo (xAI/Grok) de l'autre — chaque voie séquentielle
      //    pour respecter les limites de débit, mais les deux avancent en
      //    même temps → le montage mixte va ~2× plus vite. ──
      setAutoStep('visuals');
      let done = 0;
      const jobs = [];
      for (let i = 0; i < scs.length; i += 1) {
        const s = scs[i];
        if (s.videoUrl || s.imageUrl) continue;
        jobs.push({ i, mode: effMode(s) });
      }
      const runVisualJob = async ({ i, mode }) => {
        const s = scs[i];
        // EXACTEMENT la même génération que le bouton « Générer ce plan ».
        // Plan sans description visuelle : sa phrase sert de brief, comme si
        // on l'avait tapée dans le champ du plan.
        const brief = (s.clipPrompt || s.voiceText || s.subtitleText || '').trim();
        const p = await generateVisualCore({ ...s, genMode: mode, clipPrompt: brief });
        scs[i] = { ...s, ...p, clipPrompt: s.clipPrompt || brief };
        patchScene(s.id, { ...p, clipPrompt: scs[i].clipPrompt });
        done += 1; setAutoDone(done);
      };
      const lane = async (list) => { for (const j of list) await runVisualJob(j); };
      const laneErrors = [];
      await Promise.all([
        lane(jobs.filter((j) => j.mode === 'image')).catch((e) => laneErrors.push(e)),
        lane(jobs.filter((j) => j.mode === 'video')).catch((e) => laneErrors.push(e)),
      ]);
      if (laneErrors.length) throw laneErrors[0];
      // Voix off par plan (sauf si la narration globale du kit est fournie).
      if (!narrationUrl) {
        setAutoStep('voices');
        for (let i = 0; i < scs.length; i += 1) {
          const s = scs[i];
          if (s.audioUrl) continue;
          try {
            // MÊME génération que le bouton « Générer la voix » du plan.
            const p = await generateVoiceCore({ ...s, voiceText: s.voiceText || s.subtitleText || '' });
            if (p) {
              scs[i] = { ...s, ...p };
              patchScene(s.id, p);
            }
          } catch { /* voix best-effort : le plan reste muet plutôt que d'échouer */ }
        }
      }
      setAutoStep('render');
      await startRender(scs, renderOverrides);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setAutoStep('');
    }
  };

  // Déclenchement du pipeline auto une fois les scènes du lancement posées.
  useEffect(() => {
    if (!autoPendingRef.current || !scenes.length) return;
    autoPendingRef.current = false;
    runAutoMontage(scenes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes]);

  // Fin du pipeline auto : résultat arrivé ou erreur → l'overlay se ferme.
  useEffect(() => { if (resultUrl || error) setAutoStep(''); }, [resultUrl, error]);

  // startRender(list?, ov?) : liste + overrides explicites pour le pipeline auto
  // (l'état React n'est pas encore à jour pendant la boucle de génération).
  const startRender = async (list, ov = {}) => {
    const sourceScenes = (Array.isArray(list) ? list : scenes).filter((s) => s.videoUrl || s.imageUrl);
    if (!sourceScenes.length || rendering) return;
    setRendering(true); setProgress(2); setError(''); setResultUrl(''); setSaved(false); setRenderWarning(''); setMusicOk(false);
    try {
      const spec = {
        format,
        subtitles: subtitlesOn,
        captionMode,
        captionStyle: ov.captionStyle ?? captionStyle,
        captionAnim: ov.captionAnim ?? captionAnim,
        captionPosition: ov.captionPosition ?? captionPosition,
        captionOffsetPct,
        captionScale,
        captionMaxLines,
        captionFont: ov.captionFont ?? captionFont,
        captionCase: ov.captionCase ?? captionCase,
        transition,
        transitions: sourceScenes.slice(0, -1).map((s) => s.transitionOut || transition),
        musicUrl: (ov.musicUrl ?? musicUrl) || null,
        musicVolume: ov.musicVolume ?? musicVolume,
        narrationUrl: narrationUrl || null,
        scenes: sourceScenes.map((s) => ({
          videoUrl: s.videoUrl || undefined,
          imageUrl: (!s.videoUrl && s.imageUrl) ? s.imageUrl : undefined,
          audioUrl: narrationUrl ? null : (s.audioUrl || null),
          trimStart: s.videoUrl ? (Number(s.trimStart) || 0) : 0,
          durationSec: Math.max(1, Number(s.durationSec) || 4),
          volume: s.volume == null ? 1 : Number(s.volume),
          fadeIn: Number(s.fadeIn) || 0,
          fadeOut: Number(s.fadeOut) || 0,
          subtitleText: subtitlesOn ? (s.subtitleText || s.voiceText || '') : '',
          // Style de sous-titre propre à la scène (éditeur Pro) — repli global sinon.
          captionStyle: s.captionStyle || undefined,
          // Images superposées du plan (logo, sticker…) composées au rendu.
          overlays: Array.isArray(s.overlays) && s.overlays.length ? s.overlays : undefined,
          // Mouvement Ken Burns choisi par le directeur IA (plans image).
          kenBurns: s.kenBurns || undefined,
        })),
      };
      const { data } = await creativeApi.montage.create(spec);
      if (!data?.jobId) throw new Error(data?.message || tp('Lancement du montage impossible'));
      let jobMisses = 0; // 404 consécutifs : job perdu (redémarrage serveur) → on arrête proprement
      pollRef.current = setInterval(async () => {
        try {
          const resp = await creativeApi.montage.job(data.jobId);
          if (resp.status === 404) {
            jobMisses += 1;
            if (jobMisses >= 5) {
              clearInterval(pollRef.current); pollRef.current = null;
              setError(tp('Suivi du montage perdu (le serveur a probablement redémarré). Relance le montage.'));
              setRendering(false);
            }
            return;
          }
          const j = resp.data;
          jobMisses = 0;
          if (typeof j?.progress === 'number') setProgress(Math.max(2, j.progress));
          if (j?.status === 'done' && j.url) {
            clearInterval(pollRef.current); pollRef.current = null;
            setResultUrl(j.url); setRendering(false); setProgress(100);
            if (j.warning) setRenderWarning(String(j.warning)); // ex. musique/voix off ignorée
            setMusicOk(!!j.musicApplied);

            saveToGallery(j.url); // enregistrement automatique dans la galerie Scalor
          } else if (j?.status === 'error') {
            clearInterval(pollRef.current); pollRef.current = null;
            setError(j.error || tp('Montage échoué')); setRendering(false);
          }
        } catch { /* erreurs réseau transitoires : on continue */ }
      }, 2000);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
      setRendering(false);
    }
  };

  const saveToGallery = async (url) => {
    const videoUrl = typeof url === 'string' && url ? url : resultUrl;
    if (!videoUrl) return;
    try {
      await creativeApi.gallery.save({
        type: 'video', videoUrl,
        label: tp('Montage créatif'),
        productName: subject || undefined,
        meta: {
          source: 'montage', format, durationSec: Math.round(totalDuration), scenes: readyScenes.length,
          // Projet ré-éditable : on garde les scènes + réglages pour rouvrir le montage.
          montageScenes: readyScenes.map((s) => ({
            videoUrl: s.videoUrl || '', imageUrl: s.imageUrl || '', videoPoster: s.videoPoster || '', audioUrl: s.audioUrl || '',
            trimStart: Number(s.trimStart) || 0, srcDuration: Number(s.srcDuration) || 0,
            durationSec: Math.max(1, Number(s.durationSec) || 4),
            volume: s.volume == null ? 1 : Number(s.volume), fadeIn: Number(s.fadeIn) || 0, fadeOut: Number(s.fadeOut) || 0,
            transitionOut: s.transitionOut || '', captionStyle: s.captionStyle || '', genMode: s.genMode || 'video', overlays: Array.isArray(s.overlays) ? s.overlays : [], subtitleText: s.subtitleText || '', voiceText: s.voiceText || '', showProduct: s.showProduct !== false,
          })),
          montageSettings: { format, subtitles: subtitlesOn, captionStyle, captionAnim, captionPosition, captionOffsetPct, captionScale, captionMaxLines, captionFont, captionCase, transition, musicUrl: musicUrl || '', musicVolume, narrationUrl: narrationUrl || '' },
        },
      });
      setSaved(true);
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const resetResult = () => { setResultUrl(''); setProgress(0); setSaved(false); setRenderWarning(''); };

  return (
    <div className="space-y-5">
      <StudioHeader
        icon={Clapperboard} kind="montage"
        title={tp('Studio Montage')}
        subtitle={tp('Assemble tes clips et tes voix off en une vidéo créative — scène par scène.')}
      />

      <ImportProductBar product={importedProduct} onImport={onImport} onClear={onClearImport} accent={A} />

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* ── Chargement plein page : pipeline AUTO *et* rendu manuel ── */}
      {(autoStep || rendering) && !resultUrl && (
        <div className="fixed inset-0 z-[65] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <Loader2 size={34} className="animate-spin text-cyan-600" />
          <p className="mt-4 text-[15px] font-bold text-gray-900">{autoStep && autoStep !== 'render' ? tp('Montage automatique en cours…') : tp('Montage en cours…')}</p>
          <div className="mt-4 w-full max-w-xs space-y-2 text-[12.5px]">
            {autoStep && (
              <>
                <div className={`flex items-center gap-2 ${autoStep === 'director' ? 'text-cyan-700 font-semibold' : 'text-gray-400'}`}>
                  {autoStep === 'director' ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  {tp('Direction artistique IA')}
                </div>
                <div className={`flex items-center gap-2 ${autoStep === 'visuals' ? 'text-cyan-700 font-semibold' : ['voices', 'render'].includes(autoStep) ? 'text-gray-400' : 'text-gray-300'}`}>
                  {['voices', 'render'].includes(autoStep) ? <Check size={13} /> : autoStep === 'visuals' ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
                  {tp('Génération des visuels')}{autoTotal > 0 ? ` — ${Math.min(autoDone, autoTotal)}/${autoTotal}` : ''}
                </div>
                <div className={`flex items-center gap-2 ${autoStep === 'voices' ? 'text-cyan-700 font-semibold' : autoStep === 'render' ? 'text-gray-400' : 'text-gray-300'}`}>
                  {autoStep === 'render' ? <Check size={13} /> : autoStep === 'voices' ? <Loader2 size={13} className="animate-spin" /> : <Mic size={13} />}
                  {tp('Voix off des plans')}
                </div>
              </>
            )}
            <div className={`flex items-center gap-2 ${autoStep === 'render' || (!autoStep && rendering) ? 'text-cyan-700 font-semibold' : 'text-gray-300'}`}>
              {autoStep === 'render' || (!autoStep && rendering) ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}
              {tp('Assemblage de la vidéo')}{autoStep === 'render' || (!autoStep && rendering) ? ` — ${progress}%` : ''}
            </div>
          </div>
          {(autoStep === 'render' || (!autoStep && rendering)) && (
            <div className="mt-4 w-full max-w-xs h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-cyan-600 transition-all" style={{ width: `${progress}%` }} /></div>
          )}
          <p className="mt-4 text-[11.5px] text-gray-400">
            {autoStep && autoStep !== 'render'
              ? tp('Quelques minutes selon le nombre de plans — tu peux laisser cette page ouverte.')
              : tp('Normalisation des clips, voix off, sous-titres puis encodage — patiente une minute.')}
          </p>
        </div>
      )}

      {prefillInfo && !resultUrl && (
        <div className="flex items-start gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3.5 py-2.5 text-[12.5px] text-cyan-800">
          <Sparkles size={15} className="mt-0.5 shrink-0" />
          <span>{tp('Récupéré depuis l’angle')} <b>« {prefillInfo} »</b> : {tp('script')}{scenes.some((s) => s.imageUrl) ? tp(', images du kit') : ''}{narrationUrl ? tp(', voix off du kit') : ''}. {tp('Ajuste si besoin, ajoute un clip là où il manque un visuel, puis lance le montage.')}</span>
        </div>
      )}

      {/* ── Résultat final ── */}
      {resultUrl && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Check size={16} className="text-cyan-600" />
            <p className="text-[13.5px] font-bold text-gray-900">{tp('Montage prêt')}</p>
          </div>
          {renderWarning && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /><span>{renderWarning}</span>
            </div>
          )}
          {musicOk && (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11.5px] font-semibold text-emerald-700">
              <Music size={12} /> {tp('Musique de fond appliquée')}
            </div>
          )}
          <div className="flex justify-center">
            <video src={resultUrl} controls playsInline className="max-h-[560px] w-auto rounded-xl bg-black" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            <button onClick={() => downloadFile(resultUrl, 'montage-creatif.mp4')} className="h-9 px-4 rounded-xl bg-cyan-600 text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-cyan-700"><Download size={14} /> {tp('Télécharger')}</button>
            <button onClick={() => setProOpen(true)} className="h-9 px-4 rounded-xl border border-cyan-300 bg-white text-cyan-700 text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-cyan-50"><Film size={14} /> {tp('Ouvrir l’éditeur')}</button>
            <button onClick={saveToGallery} disabled={saved} className="h-9 px-4 rounded-xl border border-cyan-300 bg-white text-cyan-700 text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-cyan-50 disabled:opacity-60">
              {saved ? <><Check size={14} /> {tp('Enregistré')}</> : <><Save size={14} /> {tp('Enregistrer dans la galerie')}</>}
            </button>
            <button onClick={resetResult} className="h-9 px-4 rounded-xl border border-gray-200 bg-white text-gray-600 text-[13px] font-semibold hover:bg-gray-50">{tp('Nouveau montage')}</button>
          </div>
        </div>
      )}

      {/* ── Timeline des scènes ── */}
      {!resultUrl && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Mic size={15} className="text-cyan-600" />
              <span className="text-[12.5px] font-semibold text-gray-700">{tp('Voix off')}</span>
              <select value={voiceRefId} onChange={(e) => setVoiceRefId(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-2 text-[12.5px] font-medium outline-none focus:border-cyan-400">
                {VOICES.map((v) => <option key={v.id || 'model'} value={v.id}>{v.label}</option>)}
              </select>
              <span className="text-[11px] text-gray-400">{tp('une seule voix pour toutes les scènes')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreview(true)} disabled={!readyScenes.length}
                className="h-9 px-4 rounded-xl border border-cyan-300 bg-cyan-50 text-cyan-700 text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-cyan-100 disabled:opacity-40">
                <Play size={14} /> {tp('Aperçu')}
              </button>
              <button onClick={() => setProOpen(true)} disabled={!readyScenes.length}
                className="h-9 px-4 rounded-xl bg-cyan-600 text-white text-[13px] font-semibold inline-flex items-center gap-2 hover:bg-cyan-700 disabled:opacity-40">
                <Maximize2 size={14} /> {tp('Ouvrir l\'éditeur')}
              </button>
            </div>
          </div>

          <>
          <div className="space-y-3">
            {scenes.map((s, idx) => (
              <div key={s.id} className="rounded-2xl border border-gray-200 bg-white p-3.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-cyan-600 text-white text-[12px] font-bold flex items-center justify-center">{idx + 1}</span>
                    <span className="text-[12.5px] font-semibold text-gray-700">{tp('Scène')} {idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveScene(s.id, -1)} disabled={idx === 0} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ChevronUp size={15} /></button>
                    <button onClick={() => moveScene(s.id, 1)} disabled={idx === scenes.length - 1} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30"><ChevronDown size={15} /></button>
                    <button onClick={() => duplicateScene(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><Copy size={14} /></button>
                    <button onClick={() => removeScene(s.id)} disabled={scenes.length <= 1} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {/* Colonne clip */}
                  <div>
                    <div className="aspect-video rounded-xl bg-gray-900/95 overflow-hidden flex items-center justify-center relative">
                      {s.busy === 'clip' ? (
                        <div className="flex flex-col items-center gap-1.5 text-white/70"><Loader2 className="animate-spin" size={20} /><span className="text-[11px]">{tp('Traitement…')}</span></div>
                      ) : s.videoUrl ? (
                        <video src={s.videoUrl} poster={s.videoPoster || undefined} controls playsInline className="w-full h-full object-contain bg-black" />
                      ) : s.imageUrl ? (
                        <>
                          <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wide bg-white/90 text-gray-700 px-1.5 py-0.5 rounded">{tp('Image — animée au montage')}</span>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-white/40"><Film size={22} /><span className="text-[11px]">{tp('Aucun clip')}</span></div>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button onClick={() => openPicker('video', s.id)} disabled={!!s.busy} className="h-8 px-2.5 rounded-lg border border-gray-200 text-[11.5px] font-medium text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50"><Images size={13} /> {tp('Galerie')}</button>
                      <label className={`h-8 px-2.5 rounded-lg border border-gray-200 text-[11.5px] font-medium text-gray-700 inline-flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 ${s.busy ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Upload size={13} /> {tp('Uploader')}
                        <input type="file" accept="video/*" className="hidden" onChange={(e) => uploadClip(s.id, e.target.files?.[0])} />
                      </label>
                      {(s.videoUrl || s.imageUrl) && <button onClick={() => patchScene(s.id, { videoUrl: '', videoName: '', videoPoster: '', imageUrl: '' })} className="h-8 px-2 rounded-lg text-[11.5px] text-gray-400 hover:text-red-500">{tp('Retirer')}</button>}
                    </div>
                    {/* Plan précis de la scène → génération exacte du visuel */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <label className="text-[10.5px] font-semibold text-gray-500 flex items-center gap-1"><Wand2 size={11} /> {tp('Plan à générer (visuel exact)')}</label>
                        <div className="flex items-center gap-1.5">
                          <div className="inline-flex rounded-full border border-gray-200 overflow-hidden" title={tp('Vidéo IA : mouvement réel, plus cher. Image IA : photo animée au montage, ~2-5× moins cher.')}>
                            <button type="button" onClick={() => patchScene(s.id, { genMode: 'video' })}
                              className={`px-2 py-0.5 text-[10.5px] font-bold transition ${(s.genMode || 'video') === 'video' ? 'bg-cyan-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>{tp('Vidéo')}</button>
                            <button type="button" onClick={() => patchScene(s.id, { genMode: 'image' })}
                              className={`px-2 py-0.5 text-[10.5px] font-bold transition ${s.genMode === 'image' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-400 hover:bg-gray-50'}`}>{tp('Image éco')}</button>
                          </div>
                          <button type="button" onClick={() => patchScene(s.id, { showProduct: !s.showProduct })} title={tp('Afficher ou non le produit dans ce plan')}
                            className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full border transition ${s.showProduct ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                            {s.showProduct ? <Check size={11} /> : <X size={11} />} {tp('Produit visible')}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <textarea value={s.clipPrompt} onChange={(e) => patchScene(s.id, { clipPrompt: e.target.value })} rows={2}
                          placeholder={s.showProduct ? tp('Ex. gros plan du produit sur une étagère, lumière du matin…') : tp('Ex. femme souriante qui se réveille reposée dans sa chambre (sans le produit)…')}
                          className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11.5px] outline-none focus:border-cyan-400 resize-y" />
                        <button onClick={() => generateClip(s.id, s.clipPrompt)} disabled={!!s.busy || (!s.showProduct && !s.clipPrompt.trim())} title={tp('Générer exactement ce plan')}
                          className="h-9 px-2.5 rounded-lg bg-cyan-600 text-white text-[11.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-cyan-700 disabled:opacity-50 shrink-0"><Wand2 size={13} /> {tp('Générer ce plan')}</button>
                      </div>
                    </div>
                  </div>

                  {/* Colonne voix off + durée + sous-titre */}
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-1"><Mic size={12} /> {tp('Voix off (texte)')}</label>
                      <textarea value={s.voiceText} onChange={(e) => patchScene(s.id, { voiceText: e.target.value })} rows={2}
                        placeholder={tp('Ce que dit la voix sur cette scène…')}
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-cyan-400 resize-y" />
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <button onClick={() => generateVoice(s.id)} disabled={!!s.busy} className="h-8 px-2.5 rounded-lg bg-gray-900 text-white text-[11.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-black disabled:opacity-50">
                          {s.busy === 'voice' ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {tp('Générer la voix')}
                        </button>
                        <button onClick={() => openPicker('audio', s.id)} disabled={!!s.busy} className="h-8 px-2.5 rounded-lg border border-gray-200 text-[11.5px] font-medium text-gray-700 inline-flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-50"><Images size={13} /> {tp('Galerie')}</button>
                        <label className={`h-8 px-2.5 rounded-lg border border-gray-200 text-[11.5px] font-medium text-gray-700 inline-flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 ${s.busy ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Upload size={13} /> {tp('Uploader')}
                          <input type="file" accept="audio/*" className="hidden" onChange={(e) => uploadVoice(s.id, e.target.files?.[0])} />
                        </label>
                      </div>
                      {s.audioUrl && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <audio src={s.audioUrl} controls className="h-8 flex-1" />
                          <button onClick={() => patchScene(s.id, { audioUrl: '' })} className="p-1 text-gray-400 hover:text-red-500"><X size={14} /></button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-[11px] font-semibold text-gray-500">{tp('Durée')}</label>
                      <input type="number" min={1} max={30} step={0.5} value={s.durationSec}
                        onChange={(e) => patchScene(s.id, { durationSec: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
                        className="w-20 h-8 rounded-lg border border-gray-200 px-2 text-[12px] outline-none focus:border-cyan-400" />
                      <span className="text-[11px] text-gray-400">{tp('sec')}{s.audioUrl ? tp(' (auto voix)') : ''}</span>
                    </div>

                    {subtitlesOn && (
                      <div>
                        <label className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5 mb-1"><Type size={12} /> {tp('Sous-titre affiché')}</label>
                        <input value={s.subtitleText} onChange={(e) => patchScene(s.id, { subtitleText: e.target.value })}
                          placeholder={tp('Texte incrusté (par défaut = voix off)')}
                          className="w-full h-8 rounded-lg border border-gray-200 px-2.5 text-[12px] outline-none focus:border-cyan-400" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addScene} className="w-full h-11 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-[13px] font-semibold inline-flex items-center justify-center gap-2 hover:border-cyan-300 hover:text-cyan-600 transition">
            <Plus size={16} /> {tp('Ajouter une scène')}
          </button>
          </>

          {/* ── Réglages globaux ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-4">
            <Field label={tp('Format')}>
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((f) => (
                  <button key={f.id} onClick={() => setFormat(f.id)}
                    className={`px-3.5 h-9 rounded-xl text-[12.5px] font-semibold border transition ${format === f.id ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {f.label} <span className={`ml-1 font-normal ${format === f.id ? 'text-white/70' : 'text-gray-400'}`}>· {f.hint}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label={tp('Transition entre les scènes')}>
              <div className="flex flex-wrap gap-2">
                {TRANSITIONS.map((t) => (
                  <button key={t.id} onClick={() => setTransition(t.id)}
                    className={`px-3 h-9 rounded-xl text-[12.5px] font-semibold border transition ${transition === t.id ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type size={15} className="text-gray-400" />
                <span className="text-[13px] font-semibold text-gray-700">{tp('Sous-titres incrustés')}</span>
              </div>
              <button onClick={() => setSubtitlesOn((v) => !v)} className={`relative w-11 h-6 rounded-full transition ${subtitlesOn ? 'bg-cyan-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${subtitlesOn ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {subtitlesOn && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{tp('Style des sous-titres')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAPTION_STYLES.map((s) => (
                    <button key={s.id} onClick={() => setCaptionStyle(s.id)}
                      className={`h-8 px-2 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 transition ${captionStyle === s.id ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-gray-200 hover:bg-gray-50'}`}>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[11px]" style={{ background: s.bg === 'transparent' ? '#1f2937' : s.bg, color: s.text }}>A</span>
                      {s.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5 mt-3">{tp('Animation des sous-titres')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAPTION_ANIMS.map((a) => (
                    <button key={a.id} onClick={() => setCaptionAnim(a.id)}
                      className={`h-8 px-2.5 rounded-lg border text-[11.5px] font-semibold transition ${captionAnim === a.id ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {a.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5 mt-3">{tp('Position des sous-titres')}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CAPTION_POSITIONS.map((p) => (
                    <button key={p.id} onClick={() => { setCaptionPosition(p.id); setCaptionOffsetPct(null); }}
                      className={`h-8 px-3 rounded-lg border text-[11.5px] font-semibold transition ${captionPosition === p.id && captionOffsetPct == null ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {p.label}
                    </button>
                  ))}
                  {captionOffsetPct != null && (
                    <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-cyan-300 bg-cyan-50 text-[11px] font-bold text-cyan-700">
                      {tp('Libre')} · {Math.round(captionOffsetPct)}%
                      <button onClick={() => setCaptionOffsetPct(null)} className="text-cyan-500 hover:text-red-500"><X size={11} /></button>
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10.5px] text-gray-400">{tp('Astuce : dans l’éditeur Pro, fais glisser le sous-titre directement sur l’aperçu.')}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-500">{tp('Police')}</span>
                    <select value={captionFont} onChange={(e) => setCaptionFont(e.target.value)} className="h-8 rounded-lg border border-gray-200 px-2 text-[12px] outline-none focus:border-cyan-400">
                      {CAPTION_FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500">{tp('Casse')}</span>
                    <button onClick={() => setCaptionCase('none')} title={tp('Texte tel quel')}
                      className={`h-7 px-2.5 rounded-lg border text-[11.5px] font-bold transition ${captionCase !== 'upper' ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>Aa</button>
                    <button onClick={() => setCaptionCase('upper')} title={tp('Tout en majuscules')}
                      className={`h-7 px-2.5 rounded-lg border text-[11.5px] font-bold transition ${captionCase === 'upper' ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>AA</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-500">{tp('Taille')}</span>
                    <input type="range" min={0.5} max={2} step={0.05} value={captionScale} onChange={(e) => setCaptionScale(Number(e.target.value))} className="w-28 accent-cyan-600" />
                    <span className="text-[11px] font-bold text-gray-600 tabular-nums w-10">{Math.round(captionScale * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-gray-500">{tp('Lignes')}</span>
                    {[1, 2, 3].map((n) => (
                      <button key={n} onClick={() => setCaptionMaxLines(n)}
                        className={`h-7 w-7 rounded-lg border text-[11.5px] font-bold transition ${captionMaxLines === n ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {narrationUrl && (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic size={15} className="text-cyan-600" />
                    <span className="text-[13px] font-semibold text-gray-700">{tp('Narration (voix off du kit)')}</span>
                  </div>
                  <button onClick={() => setNarrationUrl('')} className="text-[12px] text-gray-400 hover:text-red-500 inline-flex items-center gap-1"><X size={13} /> {tp('Retirer')}</button>
                </div>
                <audio src={narrationUrl} controls className="mt-2 h-8 w-full" />
                <p className="mt-1 text-[11px] text-gray-400">{tp('Sert de voix off sur toute la vidéo ; les voix par scène sont ignorées.')}</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music size={15} className="text-gray-400" />
                  <span className="text-[13px] font-semibold text-gray-700">{tp('Musique de fond')} <span className="text-gray-400 font-normal">({tp('optionnel')})</span></span>
                </div>
                {musicUrl ? (
                  <button onClick={() => setMusicUrl('')} className="text-[12px] text-gray-400 hover:text-red-500 inline-flex items-center gap-1"><X size={13} /> {tp('Retirer')}</button>
                ) : (
                  <label className={`h-8 px-3 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-700 inline-flex items-center gap-1.5 cursor-pointer hover:bg-gray-50 ${musicBusy ? 'opacity-50 pointer-events-none' : ''}`}>
                    {musicBusy ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {tp('Uploader une piste')}
                    <input type="file" accept="audio/*" className="hidden" onChange={(e) => uploadMusic(e.target.files?.[0])} />
                  </label>
                )}
              </div>
              {musicPresets.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {musicPresets.map((p) => (
                    <button key={p.id} onClick={() => setMusicUrl(musicUrl === p.url ? '' : p.url)}
                      className={`h-7 px-2.5 rounded-full border text-[11px] font-semibold transition ${musicUrl === p.url ? 'border-cyan-500 bg-cyan-600 text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              {musicUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <audio src={musicUrl} controls className="h-8 flex-1" />
                  <div className="flex items-center gap-1.5">
                    <Volume2 size={14} className="text-gray-400" />
                    <input type="range" min={0} max={1.2} step={0.05} value={musicVolume} onChange={(e) => setMusicVolume(Number(e.target.value))} className="w-24 accent-cyan-600" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Rendu ── */}
          <div className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-4">
            {rendering ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[12.5px] font-semibold text-gray-700">
                  <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin text-cyan-600" /> {tp('Montage en cours…')}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-white overflow-hidden"><div className="h-full bg-cyan-600 transition-all" style={{ width: `${progress}%` }} /></div>
                <p className="text-[11px] text-gray-400">{tp('Normalisation des clips, voix off, sous-titres puis encodage — patiente une minute.')}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-[12.5px] text-gray-600">
                  <span className="font-bold text-gray-900">{readyScenes.length}</span>/{scenes.length} {tp('scène(s) prête(s)')} · <span className="font-bold text-gray-900">≈ {Math.round(totalDuration)}s</span> · {format}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-gray-500">{tp('Génération')}</span>
                  <div className="inline-flex rounded-full border border-gray-200 overflow-hidden" title={tp('Mixte : l’IA répartit vidéo/image selon la pertinence de chaque plan. Vidéo : tout en clips IA. Image : tout en images animées (le plus économique).')}>
                    {[['mixte', tp('Mixte IA')], ['video', tp('Vidéo')], ['image', tp('Image éco')]].map(([id, label]) => (
                      <button key={id} onClick={() => setGenStrategy(id)}
                        className={`px-2.5 h-8 text-[11.5px] font-bold transition ${genStrategy === id ? (id === 'image' ? 'bg-emerald-600 text-white' : 'bg-cyan-600 text-white') : 'bg-white text-gray-400 hover:bg-gray-50'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {scenes.some((s) => !s.videoUrl && !s.imageUrl || (!narrationUrl && !s.audioUrl && (s.voiceText || s.subtitleText))) && (
                    <button onClick={() => runAutoMontage(scenes)} disabled={!!autoStep}
                      title={tp('Génère tous les visuels manquants et les voix, applique la direction IA puis assemble — en un clic')}
                      className="h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[13.5px] font-bold inline-flex items-center gap-2 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 shadow-sm">
                      ⚡ {tp('Tout générer et monter')}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setDirectorOn((v) => !v)} title={tp('L’IA choisit transitions, habillage, musique et accents — sans écraser tes réglages')}
                    className={`h-8 px-2.5 rounded-full border text-[11.5px] font-bold inline-flex items-center gap-1.5 transition ${directorOn ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-gray-200 bg-white text-gray-400'}`}>
                    <Sparkles size={12} /> {tp('Direction IA')} {directorOn ? 'ON' : 'OFF'}
                  </button>
                  <button onClick={renderWithDirector} disabled={!canRender}
                    className="h-11 px-6 rounded-xl bg-cyan-600 text-white text-[14px] font-bold inline-flex items-center gap-2 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                    <Play size={16} /> {tp('Monter la vidéo')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {preview && <PreviewPlayer scenes={readyScenes} format={format} narrationUrl={narrationUrl} subtitlesOn={subtitlesOn} musicUrl={musicUrl} musicVolume={musicVolume} captionPosition={captionOffsetPct == null ? captionPosition : 'middle'} onClose={() => setPreview(false)} />}

      <GalleryPicker open={picker.open} type={picker.type} onPick={handlePick} onClose={() => setPicker({ open: false, type: 'video', sceneId: null })} />

      {proOpen && (
        <ProEditor
          scenes={scenes} setScenes={setScenes}
          format={format} subtitlesOn={subtitlesOn} setSubtitlesOn={setSubtitlesOn}
          captionMode={captionMode} setCaptionMode={setCaptionMode}
          captionStyle={captionStyle} setCaptionStyle={setCaptionStyle}
          captionAnim={captionAnim} setCaptionAnim={setCaptionAnim}
          captionPosition={captionPosition} setCaptionPosition={setCaptionPosition}
          captionOffsetPct={captionOffsetPct} setCaptionOffsetPct={setCaptionOffsetPct}
          captionScale={captionScale} setCaptionScale={setCaptionScale}
          captionMaxLines={captionMaxLines} setCaptionMaxLines={setCaptionMaxLines}
          captionFont={captionFont} setCaptionFont={setCaptionFont}
          captionCase={captionCase} setCaptionCase={setCaptionCase}
          transition={transition} setTransition={setTransition}
          narrationUrl={narrationUrl}
          musicUrl={musicUrl} setMusicUrl={setMusicUrl} musicVolume={musicVolume} setMusicVolume={setMusicVolume}
          onAddMusic={uploadMusic}
          productImage={productImage} subject={subject} productContext={productContext}
          voiceRefId={voiceRefId} setVoiceRefId={setVoiceRefId}
          onExport={startRender} rendering={rendering} progress={progress} resultUrl={resultUrl}
          onNewMontage={resetResult} onDownload={(u) => downloadFile(u, 'montage-creatif.mp4')}
          onSave={saveToGallery} saved={saved}
          onClose={() => setProOpen(false)}
        />
      )}
    </div>
  );
};

export default MontageStudio;
