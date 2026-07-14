import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import {
  Video, Film, Upload, X, Loader2, Download, ExternalLink, AlertCircle,
  CheckCircle, PlaySquare, Star, Box, Sparkles, MessageCircle, Megaphone, Wand2, Info, Clapperboard, RotateCcw, UserRound, Mic,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { storeProductsApi } from '../../services/storeApi.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, Field, downloadFile, ImportProductBar, stripHtml } from './creativeShared.jsx';
import Wizard from './Wizard.jsx';

const A = ACCENTS.video;

const SCENARIOS = [
  { id: 'ugc_testimonial', label: tp('UGC Témoignage'),  icon: MessageCircle, desc: tp('Face caméra authentique') },
  { id: 'action',          label: tp('UGC Démonstration'), icon: PlaySquare, desc: tp('Utilisation naturelle du produit') },
  { id: 'unboxing',        label: tp('UGC Unboxing'),     icon: Box,           desc: tp('Découverte et première réaction') },
  { id: 'product_spot',    label: tp('Spot Produit'),     icon: Megaphone,     desc: tp('Rendu publicitaire premium') },
  { id: 'before_after',    label: tp('Avant / Après'),    icon: Sparkles,      desc: tp('Problème puis transformation') },
  { id: 'lifestyle',       label: tp('Spot Lifestyle'),   icon: Star,          desc: tp('Produit intégré au quotidien') },
];

// Règle produit : une scène dure entre 5 et 6 s.
const DURATIONS = [
  { id: 5, label: '5s' },
  { id: 6, label: '6s' },
];

const STEPS = [
  { icon: Wand2, label: tp('Analyse de la photo…') },
  { icon: UserRound, label: tp('Création du personnage avec le produit…') },
  { icon: Clapperboard, label: tp('Animation de la scène…') },
  { icon: Mic, label: tp('Voix et finalisation…') },
];

const VideoStudio = ({ importedProduct, onImport, onClearImport }) => {
  const [sourceFile, setSourceFile] = useState(null);
  const [remoteImageUrl, setRemoteImageUrl] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [description, setDescription] = useState('');
  const [voiceoverText, setVoiceoverText] = useState('');
  const [scenario, setScenario] = useState('action');
  const [duration, setDuration] = useState(6);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [characterImage, setCharacterImage] = useState('');
  const [videoPreview, setVideoPreview] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const stepTimers = useRef([]);

  const subject = importedProduct?.name || '';
  const productContext = importedProduct?.description ? stripHtml(importedProduct.description).slice(0, 1500) : '';

  useEffect(() => {
    if (!importedProduct?.id) return;
    setRemoteImageUrl(importedProduct.imageUrl || null);
    setImagePreview(importedProduct.imageUrl || null);
    setSourceFile(null); setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedProduct?.id]);

  useEffect(() => () => stepTimers.current.forEach(clearTimeout), []);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tp('Sélectionnez une image')); return; }
    if (file.size > 10 * 1024 * 1024) { setError(tp('Image trop lourde (max 10 MB)')); return; }
    setSourceFile(file); setRemoteImageUrl(null); setImagePreview(URL.createObjectURL(file)); setError('');
  };
  const removeImage = () => {
    setSourceFile(null); setRemoteImageUrl(null);
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canGenerate = !!(sourceFile || remoteImageUrl);

  const resolveSourceUrl = async () => {
    if (remoteImageUrl) return remoteImageUrl;
    if (!sourceFile) return null;
    const up = await storeProductsApi.uploadImages([sourceFile]);
    const url = up.data?.data?.[0]?.url || null;
    if (url) setRemoteImageUrl(url);
    return url;
  };

  const startStepTicker = () => {
    setCurrentStep(1);
    stepTimers.current.push(setTimeout(() => setCurrentStep(2), 5000));
    stepTimers.current.push(setTimeout(() => setCurrentStep(3), 18000));
    stepTimers.current.push(setTimeout(() => setCurrentStep(4), 35000));
  };
  const stopStepTicker = () => { stepTimers.current.forEach(clearTimeout); stepTimers.current = []; setCurrentStep(0); };

  const generate = useCallback(async () => {
    if (!canGenerate) { setError(tp('Ajoutez une image du produit (importez un produit ou téléversez une photo).')); return; }
    setLoading(true); setError(''); setResult(null); startStepTicker();
    try {
      let sourceUrl = remoteImageUrl;
      if (!sourceUrl && sourceFile) {
        const up = await storeProductsApi.uploadImages([sourceFile]);
        sourceUrl = up.data?.data?.[0]?.url || null;
        if (!sourceUrl) throw new Error(tp('Échec du téléversement de la photo.'));
      }
      const res = await creativeApi.video.generateScene({
        mode: 'scene', scenario, prompt: description.trim(), voiceoverText: voiceoverText.trim(), sourceUrl, subject, productContext, durationSec: duration,
      });
      const data = res.data || {};
      const videoUrl = data.videoUrl || '';
      const gifUrl = typeof data.url === 'string' ? data.url : '';
      if (!data.success || (!videoUrl && !gifUrl)) throw new Error(data.message || tp('Génération impossible, réessayez'));
      setResult({ videoUrl, gifUrl });
    } catch (err) {
      setError(err.response?.data?.message || err.message || tp('Erreur lors du rendu'));
    } finally { stopStepTicker(); setLoading(false); }
  }, [canGenerate, remoteImageUrl, sourceFile, scenario, description, voiceoverText, subject, productContext, duration]);

  const generateStage = async (stage) => {
    if (!canGenerate && !remoteImageUrl) return false;
    setLoading(true); setError('');
    try {
      const sourceUrl = await resolveSourceUrl();
      if (!sourceUrl) throw new Error(tp('Échec du téléversement de la photo.'));
      const res = await creativeApi.video.generateScene({
        mode: 'scene', stage, scenario, prompt: description.trim(), voiceoverText: voiceoverText.trim(),
        sourceUrl, preparedImageUrl: characterImage, preparedVideoUrl: videoPreview,
        subject, productContext, durationSec: duration,
      });
      const data = res.data || {};
      if (!data.success) throw new Error(data.message || tp('Génération impossible, réessayez'));
      if (stage === 'character') setCharacterImage(data.startImage || '');
      if (stage === 'video') setVideoPreview(data.videoUrl || '');
      if (stage === 'voice') setResult({ videoUrl: data.videoUrl, gifUrl: '' });
      return true;
    } catch (err) {
      setError(err.response?.data?.message || err.message || tp('Erreur lors du rendu'));
      return false;
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setError(''); };
  const mediaUrl = result?.videoUrl || result?.gifUrl;
  const isVideo = !!result?.videoUrl;

  const steps = [
    {
      title: tp('Photo'), subtitle: tp('La photo du produit à animer.'), valid: canGenerate,
      content: (
        <div className="space-y-4 max-w-xl">
          <ImportProductBar product={importedProduct} onImport={onImport} onClear={onClearImport} accent={A} />
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200">
              <img src={imagePreview} alt="produit" className="w-full h-48 object-contain bg-gray-50" />
              <button onClick={removeImage} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-white/90 backdrop-blur flex items-center justify-center text-gray-500 hover:text-red-500 shadow-sm"><X size={15} /></button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full h-44 rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-colors flex flex-col items-center justify-center gap-2 text-gray-400">
              <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center"><Upload size={18} /></div>
              <span className="text-[13px] font-medium text-gray-500">{tp('Importer une photo')}</span>
              <span className="text-[11px]">{tp('ou importez un produit de la boutique')}</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </div>
      ),
    },
    {
      title: tp('Format créatif'), subtitle: tp('Quel type de vidéo générer ?'), valid: true,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-2xl">
          {SCENARIOS.map(s => {
            const Icon = s.icon; const active = scenario === s.id;
            return (
              <button key={s.id} onClick={() => setScenario(s.id)}
                className={`text-left rounded-xl border p-3 transition-all ${active ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                <Icon size={16} className={active ? A.text : 'text-gray-400'} />
                <div className={`text-[12.5px] font-semibold mt-1.5 ${active ? 'text-gray-900' : 'text-gray-600'}`}>{s.label}</div>
                <p className="text-[10.5px] text-gray-400 leading-tight">{s.desc}</p>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: tp('Personnage'), subtitle: tp('Validez le personnage avec votre produit avant de l’animer.'), valid: !!characterImage,
      content: characterImage ? (
        <div className="max-w-md space-y-3">
          <img src={characterImage} alt={tp('Personnage tenant le produit')} className="w-full max-h-[420px] object-contain rounded-2xl bg-gray-50 border border-gray-200" />
          <button onClick={() => generateStage('character')} disabled={loading} className="h-9 px-4 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">{tp('Regénérer le personnage')}</button>
        </div>
      ) : loading ? (
        <div className="min-h-[240px] flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-50 border border-gray-100">
          <Loader2 size={24} className="animate-spin text-scalor-copper" />
          <p className="text-sm font-medium text-gray-600">{tp('Création du personnage avec votre produit…')}</p>
          <p className="text-xs text-gray-400">{tp('Cette étape peut prendre quelques instants.')}</p>
        </div>
      ) : <p className="text-sm text-gray-400">{tp('Le personnage sera généré après validation du format.')}</p>,
    },
    {
      title: tp('Aperçu vidéo'), subtitle: tp('Validez l’animation avant d’ajouter la voix.'), valid: !!videoPreview,
      content: videoPreview ? (
        <div className="max-w-md space-y-3">
          <video src={videoPreview} controls loop playsInline className="w-full max-h-[420px] rounded-2xl bg-black" />
          <button onClick={() => generateStage('video')} disabled={loading} className="h-9 px-4 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">{tp('Regénérer la vidéo')}</button>
        </div>
      ) : loading ? (
        <div className="min-h-[240px] flex flex-col items-center justify-center gap-3 rounded-2xl bg-gray-950">
          <Loader2 size={24} className="animate-spin text-orange-400" />
          <p className="text-sm font-medium text-white">{tp('Animation de la scène en cours…')}</p>
          <p className="text-xs text-gray-400">{tp('Vous pouvez suivre cette étape sans quitter la page.')}</p>
        </div>
      ) : <p className="text-sm text-gray-400">{tp('La vidéo sera générée après validation du personnage.')}</p>,
    },
    {
      title: tp('Détails'), subtitle: tp('Précisez et choisissez la durée, puis générez.'), valid: true,
      content: (
        <div className="space-y-5 max-w-md">
          <Field label={tp('Précisions')} hint={tp('optionnel')}>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder={tp('Geste précis, ambiance, détail à montrer…')}
              className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition resize-none" />
          </Field>
          <Field label={tp('Texte de la voix')} hint={tp('optionnel — généré automatiquement si vide')}>
            <textarea value={voiceoverText} onChange={e => setVoiceoverText(e.target.value)} rows={2} placeholder={tp('Ex. : Depuis que je l’utilise, ma routine a complètement changé.')}
              className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-50 transition resize-none" />
          </Field>
          <div>
            <span className="text-[13px] font-semibold text-gray-700 block mb-2">{tp('Durée')}</span>
            <div className="inline-flex bg-gray-100 rounded-xl p-1">
              {DURATIONS.map(d => (
                <button key={d.id} onClick={() => setDuration(d.id)}
                  className={`h-9 px-5 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 transition-all ${duration === d.id ? 'bg-white shadow-sm text-scalor-copper' : 'text-gray-400'}`}>
                  {d.label}{d.badge && <span className="text-[10px] text-amber-600 font-bold">{d.badge}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-2 text-[11px] text-gray-400 leading-snug">
            <Info size={13} className="shrink-0 mt-0.5" />
            {tp('Clip avec voix, sans texte incrusté. Le rendu prend 1 à 3 minutes.')}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div>
      <StudioHeader icon={Video} kind="video" title={tp('Studio Vidéo')}
        subtitle={tp('Générez une créative UGC ou un spot publicitaire à partir de votre produit.')} />

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {false ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon; const done = currentStep > i + 1; const active = currentStep === i + 1;
              return (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${done ? 'bg-scalor-copper text-white' : active ? 'bg-orange-50 text-scalor-copper ring-2 ring-orange-100' : 'bg-gray-50 text-gray-300'}`}>
                      {done ? <CheckCircle size={18} /> : active ? <Loader2 size={18} className="animate-spin" /> : <StepIcon size={18} />}
                    </div>
                    <span className={`text-[11px] text-center font-medium ${active || done ? 'text-gray-700' : 'text-gray-300'}`}>{step.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`h-px flex-1 mb-6 ${done ? 'bg-orange-200' : 'bg-gray-100'}`} />}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mx-auto rounded-2xl bg-gray-50 animate-pulse w-56 aspect-square" />
          <p className="text-center text-[12px] text-gray-400 mt-4">{tp('Le rendu vidéo peut prendre 1 à 3 minutes, gardez cet onglet ouvert.')}</p>
        </div>
      ) : result && mediaUrl ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-gray-800"><CheckCircle size={17} className="text-scalor-copper" /> {tp('Clip généré')}</p>
            <div className="flex items-center gap-2">
              <Link to="/ecom/creatives?tab=galerie" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-scalor-copper hover:opacity-80">{tp('Galerie')} <ExternalLink size={13} /></Link>
              <button onClick={reset} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-gray-600 text-[13px] font-medium hover:bg-gray-50"><RotateCcw size={13} /> {tp('Recommencer')}</button>
            </div>
          </div>
          <div className="flex justify-center bg-gray-900 rounded-2xl overflow-hidden">
            {isVideo
              ? <video src={result.videoUrl} controls loop playsInline poster={result.gifUrl || undefined} className="max-h-[560px] w-auto bg-black" />
              : <img src={result.gifUrl} alt="clip" className="max-h-[560px] w-auto bg-black" />}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => downloadFile(mediaUrl, `clip-${scenario}-${Date.now()}.${isVideo ? 'mp4' : 'gif'}`)} className="flex-1 h-11 rounded-xl bg-scalor-copper text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-scalor-copper-dark">
              <Download size={15} /> {tp('Télécharger')} {isVideo ? 'MP4' : 'GIF'}
            </button>
            <button onClick={generate} className="h-11 px-4 rounded-xl border border-gray-200 text-gray-600 text-[13px] font-medium hover:bg-gray-50">{tp('Refaire')}</button>
          </div>
        </div>
      ) : (
        <Wizard accent={A} steps={steps} finalLabel={tp('Ajouter la voix')} busyLabel={tp('Génération en cours…')}
          onBeforeNext={(stepIndex) => stepIndex === 1 ? generateStage('character') : stepIndex === 2 ? generateStage('video') : true}
          onFinish={() => generateStage('voice')} loading={loading} />
      )}
    </div>
  );
};

export default VideoStudio;
