import React, { useState, useEffect } from 'react';
import { Clapperboard, Loader2, X, Plus, Trash2, Upload, Image as ImageIcon, Sparkles, Film, ListOrdered } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { storeProductsApi } from '../services/storeApi.js';
import { tp } from '../i18n/platform.js';

/**
 * AiGifPromptBox — GIF animé par IA, deux modes :
 *  - « Situation animée » : vraie vidéo (fal.ai image-to-video) convertie en
 *    GIF — illustre n'importe quelle situation (produit porté, en action,
 *    avant/après…). Sans photo, l'IA crée d'abord la scène de départ.
 *  - « Mode d'emploi » : 2-4 étapes → une image GPT par étape → GIF diaporama.
 *
 * Props :
 *  - subject          : nom du produit (contexte du prompt)
 *  - referenceOptions : [{label, url}] — sources proposées (ex. image principale)
 *  - onGenerated      : (gifUrl, extra) => void — extra = { frames?, videoUrl? }
 *  - aspectRatio      : '1:1' par défaut (mode étapes)
 */

const DEFAULT_STEPS = ['', '', ''];

// Scénarios prédéfinis — le backend met en scène intelligemment à partir du
// produit réel (nom + description) : avant/après déduit le problème que le
// produit résout, action montre un personnage qui le consomme/utilise, etc.
// Toujours sans texte incrusté ni voix (vrai GIF e-com).
const SCENE_PRESETS = [
  { id: 'before_after', label: 'Avant / après', hint: 'Une personne avec le problème que votre produit résout… puis le résultat' },
  { id: 'action', label: 'Produit en action', hint: 'Un personnage consomme / utilise votre produit' },
  { id: 'worn', label: 'Porté / utilisé', hint: 'Le produit porté naturellement au quotidien' },
  { id: 'lifestyle', label: 'Ambiance lifestyle', hint: 'Le produit dans une scène de vie chaleureuse' },
  { id: 'unboxing', label: 'Unboxing', hint: 'Des mains ouvrent l\'emballage, effet premium' },
  { id: 'rotation', label: 'Rotation 360°', hint: 'Le produit seul qui tourne, fond studio' },
];

const AiGifPromptBox = ({ subject = '', context = '', referenceOptions = [], onGenerated, aspectRatio = '1:1' }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('scene'); // 'scene' | 'steps'
  // Mode scène
  const [scenePrompt, setScenePrompt] = useState('');
  const [presetId, setPresetId] = useState('');
  const [durationSec, setDurationSec] = useState(6);
  // Mode étapes
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  // Commun
  const [refUrl, setRefUrl] = useState('');
  const [refUploading, setRefUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [progressIdx, setProgressIdx] = useState(0);
  const [error, setError] = useState('');

  const filledSteps = steps.map((s) => s.trim()).filter(Boolean);
  const isScene = tab === 'scene';

  // Progression affichée pendant la génération
  useEffect(() => {
    if (!loading) return undefined;
    setProgressIdx(0);
    if (isScene) {
      const labels = [
        tp('Analyse du produit et mise en scène…'),
        tp('Création de l\'image de départ…'),
        tp('Animation vidéo en cours (1 à 3 min)…'),
        tp('Conversion en GIF optimisé…'),
      ];
      setLoadingLabel(labels[0]);
      const timers = [
        setTimeout(() => setLoadingLabel(labels[1]), 10000),
        setTimeout(() => setLoadingLabel(labels[2]), 45000),
        setTimeout(() => setLoadingLabel(labels[3]), 195000),
      ];
      return () => timers.forEach(clearTimeout);
    }
    const t = setInterval(() => setProgressIdx((i) => Math.min(i + 1, filledSteps.length)), 35000);
    return () => clearInterval(t);
  }, [loading, isScene, filledSteps.length]);

  const setStep = (i, v) => setSteps((prev) => prev.map((s, idx) => (idx === i ? v : s)));
  const addStep = () => setSteps((prev) => (prev.length >= 4 ? prev : [...prev, '']));
  const removeStep = (i) => setSteps((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  // Le preset est un TYPE de scénario envoyé au backend (mise en scène
  // intelligente d'après le produit) — il ne pré-remplit pas le texte.
  const applyPreset = (p) => setPresetId(presetId === p.id ? '' : p.id);
  const activePreset = SCENE_PRESETS.find((p) => p.id === presetId);

  const uploadReference = async (file) => {
    if (!file) return;
    setRefUploading(true);
    try {
      const res = await storeProductsApi.uploadImages([file]);
      const url = res?.data?.data?.[0]?.url || res?.data?.urls?.[0];
      if (url) setRefUrl(url);
    } catch { /* silencieux */ } finally {
      setRefUploading(false);
    }
  };

  const run = async () => {
    if (loading) return;
    if (isScene && !presetId && scenePrompt.trim().length < 8) { setError(tp('Choisissez un scénario ou décrivez la situation')); return; }
    if (!isScene && filledSteps.length < 2) { setError(tp('Décrivez au moins 2 étapes')); return; }
    setLoading(true);
    setError('');
    try {
      const body = isScene
        ? { mode: 'scene', scenario: presetId, prompt: scenePrompt.trim(), sourceUrl: refUrl || null, subject, productContext: String(context || '').slice(0, 2000), durationSec }
        : { steps: filledSteps, sourceUrl: refUrl || null, subject, aspectRatio };
      const { data } = await ecomApi.post('/builder-ai/generate-gif', body, { timeout: 600000 });
      if (data?.success && typeof data.url === 'string' && /^https?:\/\//.test(data.url)) {
        onGenerated?.(data.url, { frames: data.frames || [], videoUrl: data.videoUrl || '' });
        setSteps(DEFAULT_STEPS);
        setScenePrompt('');
        setPresetId('');
        setOpen(false);
      } else {
        setError(data?.message || tp('Génération impossible, réessayez'));
      }
    } catch (err) {
      setError(err?.response?.data?.message || tp('Génération impossible, réessayez'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setError(''); }}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 transition hover:text-indigo-800"
      >
        <Clapperboard className="h-3 w-3" />
        {tp('GIF animé par IA')}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5">
      {loading ? (
        <div className="space-y-2 py-1">
          <div className="relative h-20 overflow-hidden rounded-lg bg-slate-200">
            {refUrl && <img src={refUrl} alt="" className="h-full w-full object-cover opacity-40" />}
            <div className="ai-gif-shimmer absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 px-3 text-center text-[12px] font-bold text-slate-700">
              <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-indigo-600" />
              {isScene
                ? loadingLabel
                : (progressIdx < filledSteps.length
                  ? `${tp('Image')} ${Math.min(progressIdx + 1, filledSteps.length)}/${filledSteps.length} — ${filledSteps[Math.min(progressIdx, filledSteps.length - 1)].slice(0, 40)}…`
                  : tp('Assemblage du GIF animé…'))}
            </div>
          </div>
          <p className="text-center text-[10.5px] text-slate-400">
            {isScene
              ? tp('Vidéo IA — comptez 1 à 4 minutes, ne fermez pas la page')
              : `${tp('Environ')} ${filledSteps.length * 30}-${filledSteps.length * 45} ${tp('secondes — ne fermez pas la page')}`}
          </p>
          <style>{`
            @keyframes ai-gif-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            .ai-gif-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent); animation: ai-gif-shimmer 1.4s ease-in-out infinite; }
          `}</style>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg bg-card p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => { setTab('scene'); setError(''); }}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-black transition ${isScene ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Film className="h-3 w-3" /> {tp('Situation animée')}
              </button>
              <button
                type="button"
                onClick={() => { setTab('steps'); setError(''); }}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-black transition ${!isScene ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <ListOrdered className="h-3 w-3" /> {tp('Mode d\'emploi')}
              </button>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 text-slate-400 transition hover:bg-card hover:text-slate-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {isScene ? (
            <>
              {/* Situations prédéfinies */}
              <div className="flex flex-wrap gap-1">
                {SCENE_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold transition ${presetId === p.id ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-indigo-200 bg-card text-indigo-700 hover:bg-indigo-50'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {activePreset && (
                <p className="rounded-lg bg-card px-2.5 py-1.5 text-[10.5px] font-semibold leading-4 text-indigo-700">
                  {tp('L\'IA analyse votre produit et met en scène :')} {activePreset.hint} — {tp('sans texte ni voix')}
                </p>
              )}
              <textarea
                rows={2}
                value={scenePrompt}
                onChange={(e) => setScenePrompt(e.target.value)}
                placeholder={presetId
                  ? tp('Précisions (optionnel) : type de personne, lieu, ambiance…')
                  : tp('Décrivez la situation : « une femme applique la crème et sourit devant le miroir »…')}
                className="min-h-[46px] w-full resize-y rounded-lg border border-indigo-200 bg-card px-2.5 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-[10.5px] font-bold text-slate-500">{tp('Durée :')}</span>
                {[6, 10].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDurationSec(d)}
                    className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold transition ${durationSec === d ? 'border-indigo-500 bg-indigo-100 text-indigo-800' : 'border-slate-200 bg-card text-slate-500 hover:border-indigo-300'}`}
                  >
                    {d} s
                  </button>
                ))}
                {durationSec === 10 && <span className="text-[10px] text-amber-600">{tp('(coût ×2)')}</span>}
              </div>
            </>
          ) : (
            <>
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white">{i + 1}</span>
                  <input
                    value={s}
                    onChange={(e) => setStep(i, e.target.value)}
                    placeholder={i === 0 ? tp('Ex : Appliquer une noisette de crème sur le visage') : tp(`Étape ${i + 1}…`)}
                    className="flex-1 rounded-lg border border-indigo-200 bg-card px-2.5 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  {steps.length > 2 && (
                    <button type="button" onClick={() => removeStep(i)} className="rounded p-1 text-slate-300 transition hover:text-red-500">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {steps.length < 4 && (
                <button type="button" onClick={addStep} className="inline-flex items-center gap-1 text-[10.5px] font-bold text-indigo-600 hover:text-indigo-800">
                  <Plus className="h-3 w-3" /> {tp('Ajouter une étape')}
                </button>
              )}
            </>
          )}

          {/* Photo du produit — commune aux deux modes */}
          <div className="flex flex-wrap items-center gap-1.5 border-t border-indigo-100 pt-2">
            <span className="text-[10.5px] font-bold text-slate-500">{tp('Photo du produit :')}</span>
            {referenceOptions.filter((o) => o?.url).map((o) => (
              <button
                key={o.url}
                type="button"
                onClick={() => setRefUrl(refUrl === o.url ? '' : o.url)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold transition ${refUrl === o.url ? 'border-indigo-500 bg-indigo-100 text-indigo-800' : 'border-slate-200 bg-card text-slate-500 hover:border-indigo-300'}`}
              >
                <ImageIcon className="h-2.5 w-2.5" />
                {o.label}
              </button>
            ))}
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-card px-2 py-0.5 text-[10.5px] font-bold text-slate-500 transition hover:border-indigo-300">
              {refUploading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Upload className="h-2.5 w-2.5" />}
              {tp('Uploader')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadReference(e.target.files?.[0])} />
            </label>
            {refUrl && <img src={refUrl} alt="" className="h-6 w-6 rounded-md border border-indigo-200 object-cover" />}
          </div>
          <p className="text-[10px] leading-4 text-slate-400">
            {isScene
              ? tp('Avec la photo, la vidéo part de votre vrai produit (recommandé). Sans photo, l\'IA imagine la scène.')
              : tp('Avec la photo du produit, chaque étape garde le même produit et le même style (recommandé).')}
          </p>

          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
          <button
            type="button"
            disabled={isScene ? (!presetId && scenePrompt.trim().length < 8) : filledSteps.length < 2}
            onClick={run}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-700 disabled:opacity-40"
          >
            <Sparkles className="h-3 w-3" />
            {isScene ? tp('Générer le GIF animé') : `${tp('Générer le GIF')} (${filledSteps.length} ${tp('images')})`}
          </button>
        </>
      )}
    </div>
  );
};

export default AiGifPromptBox;
