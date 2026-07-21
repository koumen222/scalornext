import React, { useState } from 'react';
import { Sparkles, Loader2, Wand2, X, Upload, Image as ImageIcon } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { storeProductsApi } from '../services/storeApi.js';
import { tp } from '../i18n/platform.js';

/**
 * AiImagePromptBox — génération / édition d'image par IA (GPT Image) pour les builders.
 * Repliée : bouton « Générer par IA ». Dépliée : champ de description +
 * « Créer » (texte → image) et « Modifier l'image » (édition de l'image actuelle).
 * Pendant la génération : état de chargement propre (shimmer + étapes).
 *
 * Props :
 *  - value        : URL de l'image actuelle ('' si aucune)
 *  - onGenerated  : (url) => void — appelée avec l'URL R2 publiée
 *  - aspectRatio  : ratio par défaut des créations ('4:3' par défaut)
 *  - compact      : rendu resserré (listes d'images)
 */

const LOADING_STEPS = ['Analyse de la demande…', 'Génération de l\'image…', 'Optimisation et mise en ligne…'];

// Styles prédéfinis — un clic ajoute la direction artistique au prompt
const STYLE_PRESETS = [
  { id: 'illustration', label: 'Illustration du produit', text: (s) => `photo produit e-commerce professionnelle${s ? ` de ${s}` : ''}, produit en vedette au centre, fond épuré élégant, éclairage studio soigné` },
  { id: 'affiche', label: 'Affiche publicitaire', text: (s) => `affiche publicitaire percutante${s ? ` pour ${s}` : ''}, composition dynamique, couleurs vives et contrastées, produit héros, style pub premium` },
  { id: 'studio', label: 'Studio fond blanc', text: (s) => `packshot studio${s ? ` de ${s}` : ''} sur fond blanc pur, ombre douce réaliste, netteté parfaite, style catalogue` },
  { id: 'lifestyle', label: 'Mise en scène', text: (s) => `${s ? `${s} ` : 'produit '}utilisé en situation réelle, mise en scène lifestyle chaleureuse, lumière naturelle, ambiance authentique africaine moderne` },
  { id: 'ingredients', label: 'Ingrédients naturels', text: (s) => `${s ? `${s} ` : 'produit '}entouré de ses ingrédients naturels disposés artistiquement, fond texturé doux, style éditorial beauté` },
  { id: 'promo', label: 'Bannière promo', text: (s) => `bannière promotionnelle e-commerce${s ? ` pour ${s}` : ''}, badge de réduction visible, sentiment d'urgence, fond coloré énergique` },
];

const AiImagePromptBox = ({ value = '', onGenerated, aspectRatio = '4:3', compact = false, referenceOptions = [], subject = '', context = '', label = '' }) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState('');
  // Image de référence (exemple) : option fournie ou upload — génération image-to-image
  const [refUrl, setRefUrl] = useState('');
  const [refUploading, setRefUploading] = useState(false);
  const [presetId, setPresetId] = useState('');

  const uploadReference = async (file) => {
    if (!file) return;
    setRefUploading(true);
    setError('');
    try {
      const res = await storeProductsApi.uploadImages([file]);
      const url = res?.data?.data?.[0]?.url || res?.data?.urls?.[0];
      if (url) setRefUrl(url);
      else setError(tp('Upload de l\'exemple impossible'));
    } catch {
      setError(tp('Upload de l\'exemple impossible'));
    } finally {
      setRefUploading(false);
    }
  };

  const run = async (editCurrent) => {
    const preset = STYLE_PRESETS.find((s) => s.id === presetId);
    const intent = [prompt.trim(), preset ? preset.text(String(subject || '').trim()) : ''].filter(Boolean).join(' — ');
    // À la CRÉATION, on ancre l'image sur les infos de la page (produit, titre, description).
    const ctx = (!editCurrent && context) ? String(context).trim().slice(0, 900) : '';
    const text = [intent, ctx ? `Base-toi fidèlement sur ce produit : ${ctx}` : ''].filter(Boolean).join('. ');
    if (!text || loading) return;
    setLoading(true);
    setError('');
    setStepIdx(0);
    const ticker = setInterval(() => setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1)), 6000);
    try {
      const { data } = await ecomApi.post('/builder-ai/generate-image', {
        prompt: text,
        // Priorité : édition de l'image actuelle > image d'exemple > texte seul
        sourceUrl: editCurrent ? value : (refUrl || null),
        aspectRatio,
      }, { timeout: 180000 });
      if (data?.success && data.url) {
        onGenerated?.(data.url);
        setPrompt('');
        setOpen(false);
      } else {
        setError(data?.message || tp('Génération impossible, réessayez'));
      }
    } catch (err) {
      setError(err?.response?.data?.message || tp('Génération impossible, réessayez'));
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setError(''); }}
        className={`inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 transition ${compact ? 'text-[11px]' : 'text-[11px] mt-1'}`}
      >
        <Sparkles className="h-3 w-3" />
        {label || (value ? tp('Modifier / générer par IA') : tp('Générer par IA'))}
      </button>
    );
  }

  return (
    <div className={`rounded-xl border border-indigo-200 bg-indigo-50/50 ${compact ? 'p-2' : 'p-2.5'} space-y-2`}>
      {loading ? (
        /* ── État de chargement propre : shimmer + étapes ── */
        <div className="space-y-2">
          <div className="relative h-20 overflow-hidden rounded-lg bg-slate-200">
            {value && <img src={value} alt="" className="h-full w-full object-cover opacity-40" />}
            <div className="ai-img-shimmer absolute inset-0" />
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[12px] font-bold text-slate-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
              {LOADING_STEPS[stepIdx]}
            </div>
          </div>
          <p className="text-center text-[10.5px] text-slate-400">{tp('Image IA — environ 15 à 40 secondes')}</p>
          <style>{`
            @keyframes ai-img-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            .ai-img-shimmer { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent); animation: ai-img-shimmer 1.4s ease-in-out infinite; }
          `}</style>
        </div>
      ) : (
        <>
          {/* Styles prédéfinis */}
          <div className="flex flex-wrap gap-1">
            {STYLE_PRESETS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setPresetId(presetId === s.id ? '' : s.id)}
                className={`rounded-full border px-2 py-0.5 text-[10.5px] font-bold transition ${presetId === s.id ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-indigo-200 bg-card text-indigo-700 hover:bg-indigo-50'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-1.5">
            <textarea
              autoFocus
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(false); } }}
              placeholder={tp('Décrivez l\'image : « crème sur fond beige avec fleurs d\'hibiscus »…')}
              className="min-h-[46px] flex-1 resize-y rounded-lg border border-indigo-200 bg-card px-2.5 py-1.5 text-[12px] outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-card hover:text-slate-700"
              title={tp('Fermer')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {/* Image d'exemple (optionnelle) : partir d'une image fournie */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10.5px] font-bold text-slate-500">{tp('Exemple (optionnel) :')}</span>
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
              {tp('Uploader un exemple')}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadReference(e.target.files?.[0])} />
            </label>
            {refUrl && (
              <span className="inline-flex items-center gap-1">
                <img src={refUrl} alt="" className="h-6 w-6 rounded-md border border-indigo-200 object-cover" />
                <button type="button" onClick={() => setRefUrl('')} className="rounded p-0.5 text-slate-400 hover:text-red-500" title={tp('Retirer l\'exemple')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={!prompt.trim() && !presetId}
              onClick={() => run(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-700 disabled:opacity-40"
            >
              <Sparkles className="h-3 w-3" />
              {refUrl ? tp('Créer à partir de l\'exemple') : tp('Créer une image')}
            </button>
            {value && (
              <button
                type="button"
                disabled={!prompt.trim() && !presetId}
                onClick={() => run(true)}
                title={tp('Applique votre demande à l\'image actuelle')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-card px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-40"
              >
                <Wand2 className="h-3 w-3" />
                {tp('Modifier l\'image actuelle')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AiImagePromptBox;
