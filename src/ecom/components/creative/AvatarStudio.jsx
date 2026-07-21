import React, { useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Film, Mic, Loader2, Download, Wand2, RefreshCw, User, Hand, Armchair, AlertCircle, CheckCircle2 } from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { featureCost, getInsufficientCredits, CostChip } from './creativeShared.jsx';

/**
 * AvatarStudio — « Avatar parlant » : une image (ou une vidéo) + un texte (ou
 * un audio) → le personnage parle, avec des mouvements simples de tête et de
 * mains. Pipeline serveur : TTS Fish → clip i2v (bouche neutre) → MuseTalk.
 */

// Voix off : catalogue unifié (voix Scalor priorisées + tout Fish Audio).
import { VoiceSelect, VoicePreviewButton, DEFAULT_VOICE_ID } from './voiceCatalog.jsx';
// Brief marketing partagé : produit → angle → hook → script (auto/manuel).
import MarketingBrief from './MarketingBrief.jsx';

const MOTIONS = [
  { id: 'presenter', label: tp('Présentateur'), icon: User, hint: tp('Tête + gestes légers') },
  { id: 'hands', label: tp('Gestes marqués'), icon: Hand, hint: tp('Mains expressives') },
  { id: 'calm', label: tp('Calme'), icon: Armchair, hint: tp('Hochements discrets') },
];

const STEP_LABELS = {
  start: tp('Préparation…'),
  voice: tp('Génération de la voix…'),
  motion: tp('Animation du personnage (tête, mains)…'),
  lipsync: tp('Synchronisation des lèvres (MuseTalk)…'),
  infinitetalk: tp('Génération Premium (gestes + lèvres pilotés par la voix)…'),
  omni: tp('Génération Cinéma OmniHuman (1080p)…'),
  done: tp('Terminé'),
};

const AvatarStudio = ({ importedProduct = null, onImport = null, onClearImport = null, credits = null, onCreditsChange = null, onNeedCredits = null }) => {
  const [srcKind, setSrcKind] = useState('create'); // 'create' | 'image' | 'video'
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  // Mode « Créer avec l'IA » : photo du produit + description du personnage →
  // l'IA compose l'avatar PRODUIT EN MAIN, qui devient l'image du pipeline.
  const [productPhotoUrl, setProductPhotoUrl] = useState('');
  const [avatarDesc, setAvatarDesc] = useState('');
  const [creatingAvatar, setCreatingAvatar] = useState(false);
  const [text, setText] = useState('');
  const [voiceRefId, setVoiceRefId] = useState(DEFAULT_VOICE_ID);
  const [audioUrl, setAudioUrl] = useState(''); // audio uploadé (prend le pas sur le texte)
  const [motion, setMotion] = useState('presenter');
  // Qualité : 'standard' (Grok + MuseTalk — rapide, éco) | 'premium'
  // (OmniHuman 1.5 — gestes pilotés par la voix, 1080p, plus coûteux).
  const [tier, setTier] = useState('standard');
  const [job, setJob] = useState(null); // { id, status, step, progress, url, error }
  const [error, setError] = useState('');
  const pollRef = useRef(null);

  // Photo du produit importé proposée comme référence du mode « Créer avec l'IA ».
  useEffect(() => {
    const img = importedProduct?.imageUrl || importedProduct?.image || '';
    if (img && !productPhotoUrl) setProductPhotoUrl(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedProduct]);

  // Brief marketing (produit → angle → hook → script) — même préparation que
  // le Lancement. Le script (12-14 s : coût OmniHuman linéaire à la durée)
  // remplit le texte à prononcer ; modifiable ensuite.
  const [brief, setBrief] = useState(null);
  const applyBrief = (b) => {
    setBrief(b);
    setText(b?.script || '');
    setAudioUrl(''); // nouveau texte → l'ancienne voix ne correspond plus
  };

  // Génère l'image de l'avatar tenant le produit (gpt-image, photo produit en
  // référence EXACTE). L'image devient la source du pipeline (parole + gestes).
  const createAvatarImage = async () => {
    if (!productPhotoUrl || avatarDesc.trim().length < 5) {
      setError(tp('Ajoute la photo du produit et décris ton avatar (ex. « femme camerounaise de 30 ans, élégante, boubou moderne »).'));
      return;
    }
    setCreatingAvatar(true); setError('');
    try {
      const prompt = `A REAL PHOTO taken with a normal smartphone (standard camera app, handheld) — vertical framing for a video ad. THE PERSON: ${avatarDesc.trim().slice(0, 400)}. The person faces the camera in a medium close-up, HOLDING THE EXACT PRODUCT from the reference photo in one hand at chest level — NEVER covering the face. REAL-WORLD SCALE (critical): the product is rendered at its EXACT real physical size relative to the hand (an adult hand is ~18 cm long) — estimate the true size from the packaging type (a spray ≈ 12-15 cm, a cream jar ≈ 7-9 cm, a tub ≈ 12-18 cm) and NEVER enlarge it to make the label readable: a real product held in a hand often looks small, and that is correct. STRICT NEUTRAL composed expression: mouth CLOSED, mouth corners level (no smile), eyes looking straight into the lens, relaxed cheeks. ANTI-AI-LOOK (critical): bright even natural light (window daylight or plain home light), true-to-life colors — NO dark moody cinematic grading, NO oversharpened AI crispness, NO airbrushed plastic skin, NO studio look. Realistic skin with visible pores and small imperfections, ordinary believable person (not a model), casual real clothes, real lived-in background (home or street, modern African urban setting). It must be indistinguishable from a casual phone photo. The product must stay EXACTLY as in the reference photo: same shape, colors, packaging and label. Absolutely no on-screen text, no watermark, no logo overlay.`;
      const { data } = await creativeApi.image.simple({ prompt, sourceUrl: productPhotoUrl, aspectRatio: '9:16' });
      if (!data?.success || !data.url) throw new Error(data?.message || tp('Création de l’avatar impossible'));
      setImageUrl(data.url);
      setVideoUrl('');
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setCreatingAvatar(false); }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const upload = async (file, kind) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await creativeApi.media.upload(fd);
      if (!data?.url) throw new Error(tp('Upload impossible'));
      if (kind === 'image') { setImageUrl(data.url); setVideoUrl(''); setSrcKind('image'); }
      else if (kind === 'video') { setVideoUrl(data.url); setImageUrl(''); setSrcKind('video'); }
      else if (kind === 'audio') setAudioUrl(data.url);
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setUploading(false); }
  };

  const running = job && job.status === 'running';
  const canGenerate = !running && !uploading && !creatingAvatar
    && (srcKind === 'video' ? videoUrl : imageUrl) // 'create' et 'image' → l'image de l'avatar
    && (audioUrl || text.trim().length >= 2);

  const generate = async () => {
    if (!canGenerate) return;
    if (typeof credits === 'number' && credits < featureCost('lipsync')) { onNeedCredits?.(); return; }
    setError('');
    setJob({ status: 'running', step: 'start', progress: 2, url: '' });
    try {
      const { data } = await creativeApi.lipsync.create({
        imageUrl: srcKind !== 'video' ? imageUrl : '',
        videoUrl: srcKind === 'video' ? videoUrl : '',
        audioUrl,
        text: audioUrl ? '' : text.trim(),
        voiceRefId,
        motion,
        tier: srcKind === 'video' ? 'standard' : tier, // Premium = image uniquement
      });
      if (!data?.success || !data.jobId) throw new Error(data?.message || tp('Lancement impossible'));
      if (typeof data.creditsRemaining === 'number') onCreditsChange?.(data.creditsRemaining);
      const jobId = data.jobId;
      let misses = 0;
      pollRef.current = setInterval(async () => {
        try {
          const r = await creativeApi.lipsync.job(jobId);
          if (r.status === 404) {
            misses += 1;
            if (misses >= 5) { clearInterval(pollRef.current); setJob({ status: 'error', error: tp('Job perdu — relance la génération.') }); }
            return;
          }
          misses = 0;
          const j = r.data;
          setJob({ id: jobId, status: j.status, step: j.step, progress: j.progress, url: j.url, error: j.error });
          if (j.status !== 'running') clearInterval(pollRef.current);
        } catch { /* réseau : on retentera au tick suivant */ }
      }, 3000);
    } catch (e) {
      setJob(null);
      if (getInsufficientCredits(e)) onNeedCredits?.();
      setError(e?.response?.data?.message || e.message);
    }
  };

  const reset = () => { if (pollRef.current) clearInterval(pollRef.current); setJob(null); setError(''); };

  const inputCls = 'w-full rounded-xl border border-border px-3 py-2.5 text-[13px] outline-none focus:border-primary/40';
  const cardCls = 'rounded-2xl border border-border bg-card p-4';

  return (
    <div className="space-y-4">
      <div className={cardCls}>
        <p className="text-[15px] font-bold text-foreground">{tp('Avatar parlant')}</p>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">{tp('Importe ton produit : l’IA crée l’avatar produit en main, écrit son script de vente et le fait parler avec la voix de ton choix.')}</p>
      </div>

      {/* Produit importé : source de l'avatar ET du script */}
      {importedProduct ? (
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10/60 px-4 py-3">
          {(importedProduct.imageUrl || importedProduct.image) && (
            <img src={importedProduct.imageUrl || importedProduct.image} alt="" className="h-12 w-12 rounded-xl object-cover border border-white shadow-sm shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-primary">{tp('Produit importé')}</p>
            <p className="text-[13px] font-semibold text-foreground truncate">{importedProduct.name}</p>
            <p className="text-[11px] text-muted-foreground">{tp('L’avatar tiendra ce produit et son script sera écrit à partir de sa fiche.')}</p>
          </div>
          {onClearImport && (
            <button type="button" onClick={onClearImport} className="shrink-0 h-8 px-3 rounded-lg border border-border bg-card text-[11.5px] font-semibold text-muted-foreground hover:bg-background">{tp('Retirer')}</button>
          )}
        </div>
      ) : (
        onImport && (
          <button type="button" onClick={onImport}
            className="w-full rounded-2xl border-2 border-dashed border-border px-4 py-3 text-left hover:border-primary/30 transition flex items-center gap-3">
            <span className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Upload size={16} className="text-primary" /></span>
            <span>
              <span className="block text-[13px] font-semibold text-foreground">{tp('Importer un produit')}</span>
              <span className="block text-[11.5px] text-muted-foreground">{tp('Nom, description et photo alimentent l’avatar et son script automatiquement.')}</span>
            </span>
          </button>
        )
      )}

      {/* 1. Le personnage */}
      <div className={cardCls}>
        <p className="text-[13px] font-bold text-foreground mb-2">1 · {tp('Le personnage')}</p>
        <div className="inline-flex rounded-lg overflow-hidden border border-border mb-3">
          <button type="button" onClick={() => setSrcKind('create')} className={`px-3 h-8 text-[12px] font-bold transition ${srcKind === 'create' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-background'}`}>{tp('Créer avec l’IA')}</button>
          <button type="button" onClick={() => setSrcKind('image')} className={`px-3 h-8 text-[12px] font-bold transition ${srcKind === 'image' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-background'}`}>{tp('Mon image')}</button>
          <button type="button" onClick={() => setSrcKind('video')} className={`px-3 h-8 text-[12px] font-bold transition ${srcKind === 'video' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-background'}`}>{tp('Vidéo')}</button>
        </div>

        {/* Mode « Créer avec l'IA » : produit + description → avatar produit en main */}
        {srcKind === 'create' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-border text-[12.5px] font-semibold text-foreground cursor-pointer hover:bg-background">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                {productPhotoUrl ? tp('Changer la photo du produit') : tp('Photo du produit que tu vends')}
                <input type="file" accept="image/*" className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; e.target.value = '';
                    if (!f) return;
                    setUploading(true); setError('');
                    try {
                      const fd = new FormData(); fd.append('file', f);
                      const { data } = await creativeApi.media.upload(fd);
                      if (data?.url) setProductPhotoUrl(data.url);
                    } catch (err) { setError(err?.response?.data?.message || err.message); }
                    finally { setUploading(false); }
                  }} />
              </label>
              {productPhotoUrl && <img src={productPhotoUrl} alt="" className="h-20 w-20 rounded-xl object-cover border border-border" />}
            </div>
            {/* Archétypes calibrés sur les références validées — remplissent la
                description, modifiable ensuite. */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                [tp('Client · créateur'), tp('homme camerounais de 35 ans, chemise simple, chez lui dans un salon réel, expression détendue')],
                [tp('Docteur · expert'), tp('médecin africain de 35-45 ans en blouse blanche avec stéthoscope, dans un vrai cabinet médical, air bienveillant')],
                [tp('Vendeuse boutique'), tp('commerçante africaine de 30 ans accueillante, dans sa petite boutique réelle avec des étagères de produits')],
              ].map(([label, desc]) => (
                <button key={label} type="button" onClick={() => setAvatarDesc(desc)}
                  className="h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition">
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={avatarDesc}
              onChange={(e) => setAvatarDesc(e.target.value)}
              rows={2}
              placeholder={tp('Décris ton avatar — ex. « femme camerounaise de 30 ans, élégante, boubou moderne, coiffure naturelle »')}
              className={`${inputCls} resize-y`}
            />
            <div className="flex items-center gap-3">
              <button type="button" onClick={createAvatarImage} disabled={creatingAvatar || !productPhotoUrl || avatarDesc.trim().length < 5}
                className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-2 hover:bg-primary-700 transition disabled:opacity-40">
                {creatingAvatar ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                {imageUrl ? tp('Régénérer l’avatar') : tp('Créer mon avatar (produit en main)')}
              </button>
              {imageUrl && !creatingAvatar && <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary"><CheckCircle2 size={14} /> {tp('Avatar prêt — continue en dessous')}</span>}
            </div>
            {imageUrl && <img src={imageUrl} alt="" className="h-44 rounded-xl object-cover border border-border" />}
          </div>
        )}

        {srcKind !== 'create' && (
          <div className="flex items-start gap-3">
            <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-border text-[12.5px] font-semibold text-foreground cursor-pointer hover:bg-background">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : (srcKind === 'image' ? <ImageIcon size={14} /> : <Film size={14} />)}
              {srcKind === 'image' ? tp('Uploader une image (visage net)') : tp('Uploader une vidéo (personne qui bouge)')}
              <input type="file" accept={srcKind === 'image' ? 'image/*' : 'video/*'} className="hidden"
                onChange={(e) => { upload(e.target.files?.[0], srcKind); e.target.value = ''; }} />
            </label>
            {srcKind === 'image' && imageUrl && <img src={imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover border border-border" />}
            {srcKind === 'video' && videoUrl && <video src={videoUrl} className="h-20 rounded-xl border border-border" muted />}
          </div>
        )}
        {srcKind !== 'video' && (
          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{tp('Mouvements')}</p>
            <div className="flex flex-wrap gap-1.5">
              {MOTIONS.map((m) => {
                const Icon = m.icon;
                return (
                  <button key={m.id} type="button" onClick={() => setMotion(m.id)}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-[12px] font-bold transition ${motion === m.id ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-background'}`}>
                    <Icon size={14} /> {m.label}
                    <span className="font-normal text-[10.5px] text-muted-foreground">{m.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. Ce qu'il dit — même préparation que le Lancement : produit →
             angle marketing → hook → script (auto ou manuel), avant la voix. */}
      <div className={cardCls}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[13px] font-bold text-foreground">2 · {tp('Ce qu’il dit')}</p>
        </div>
        {!audioUrl ? (
          <>
            <div className="mb-3">
              <MarketingBrief family="avatar" importedProduct={importedProduct}
                productImageUrl={productPhotoUrl || importedProduct?.imageUrl || ''}
                value={brief} onChange={applyBrief} onNeedProduct={onImport} />
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
              placeholder={tp('Écris le texte que le personnage doit dire — ou génère-le ci-dessus depuis le produit (angle → hook → script)…')} className={`${inputCls} resize-y`} />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <VoiceSelect value={voiceRefId} onChange={setVoiceRefId}
                className="h-9 max-w-[280px] rounded-xl border border-border px-2.5 text-[12.5px] outline-none focus:border-primary/40" />
              <VoicePreviewButton voiceId={voiceRefId} />
              <span className="text-[11.5px] text-muted-foreground">{tp('ou')}</span>
              <label className="inline-flex items-center gap-2 h-9 px-3 rounded-xl border border-border text-[12.5px] font-semibold text-foreground cursor-pointer hover:bg-background">
                <Mic size={14} /> {tp('Uploader un audio')}
                <input type="file" accept="audio/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0], 'audio'); e.target.value = ''; }} />
              </label>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <audio src={audioUrl} controls className="h-9 flex-1" />
            <button type="button" onClick={() => setAudioUrl('')} className="h-9 px-3 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:bg-background">{tp('Retirer')}</button>
          </div>
        )}
      </div>

      {/* 3. Qualité de génération — trois niveaux */}
      <div className={cardCls}>
        <p className="text-[13px] font-bold text-foreground mb-2">3 · {tp('Qualité')}</p>
        <div className="grid sm:grid-cols-3 gap-2">
          <button type="button" onClick={() => setTier('standard')}
            className={`text-left rounded-xl border p-3 transition ${tier === 'standard' ? 'border-primary/30 bg-primary/10/60 ring-2 ring-primary/20' : 'border-border hover:border-gray-300'}`}>
            <p className="text-[13px] font-bold text-foreground">{tp('Standard')} <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-black text-muted-foreground">{tp('ÉCO')}</span></p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{tp('Rapide et économique. Gestes en boucle + lèvres synchronisées. Pour tester en volume.')}</p>
          </button>
          <button type="button" onClick={() => srcKind !== 'video' && setTier('premium')} disabled={srcKind === 'video'}
            className={`text-left rounded-xl border p-3 transition ${tier === 'premium' && srcKind !== 'video' ? 'border-primary/30 bg-primary/10/60 ring-2 ring-primary/20' : 'border-border hover:border-gray-300'} ${srcKind === 'video' ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <p className="text-[13px] font-bold text-foreground">{tp('Premium')} <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9.5px] font-black text-white">⭐</span></p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{tp('Gestes, tête et lèvres pilotés par la voix (InfiniteTalk 720p). Excellent rendu, prix doux. Génération plus longue (5-12 min).')}</p>
          </button>
          <button type="button" onClick={() => srcKind !== 'video' && setTier('cinema')} disabled={srcKind === 'video'}
            className={`text-left rounded-xl border p-3 transition ${tier === 'cinema' && srcKind !== 'video' ? 'border-primary/30 bg-primary/10/60 ring-2 ring-primary/20' : 'border-border hover:border-gray-300'} ${srcKind === 'video' ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <p className="text-[13px] font-bold text-foreground">{tp('Cinéma')} <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[9.5px] font-black text-white">💎</span></p>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">{tp('OmniHuman 1.5 : lecture sémantique de la voix, 1080p. Le plus cher — script court (≤ 15 s) recommandé.')}</p>
          </button>
        </div>
        {srcKind === 'video' && <p className="text-[10.5px] text-primary mt-1.5">{tp('Premium et Cinéma partent d’une image — en mode Vidéo, le Standard s’applique.')}</p>}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* 3. Génération / résultat */}
      {!job && (
        <button type="button" onClick={generate} disabled={!canGenerate}
          className="h-11 px-5 rounded-xl bg-primary text-white text-[13.5px] font-bold inline-flex items-center gap-2 hover:bg-primary-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
          <Wand2 size={16} /> {tp('Faire parler le personnage')} <CostChip cost={featureCost('lipsync')} />
        </button>
      )}

      {job && job.status === 'running' && (
        <div className={cardCls}>
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">{STEP_LABELS[job.step] || tp('Génération…')}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${job.progress || 2}%` }} />
              </div>
            </div>
            <span className="text-[12px] font-bold text-muted-foreground tabular-nums">{job.progress || 2}%</span>
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">{tier === 'premium' ? tp('Compte 5 à 12 minutes : InfiniteTalk génère gestes et lèvres en une passe.') : tier === 'cinema' ? tp('Compte 2 à 6 minutes : OmniHuman génère la vidéo 1080p en une passe.') : tp('Compte 2 à 4 minutes : animation du personnage puis synchronisation des lèvres.')}</p>
        </div>
      )}

      {job && job.status === 'error' && (
        <div className={cardCls}>
          <div className="flex items-start gap-2 text-[12.5px] text-red-700"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {job.error || tp('Génération impossible')}</div>
          <button type="button" onClick={reset} className="mt-3 h-9 px-4 rounded-xl border border-border text-[12.5px] font-semibold text-foreground hover:bg-background inline-flex items-center gap-1.5"><RefreshCw size={13} /> {tp('Réessayer')}</button>
        </div>
      )}

      {job && job.status === 'done' && job.url && (
        <div className={cardCls}>
          <video src={job.url} controls autoPlay className="w-full max-h-[60vh] rounded-xl bg-black" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a href={job.url} target="_blank" rel="noreferrer" download
              className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-2 hover:bg-primary-700 transition">
              <Download size={15} /> {tp('Télécharger')}
            </a>
            <button type="button" onClick={reset} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-foreground hover:bg-background inline-flex items-center gap-1.5">
              <RefreshCw size={14} /> {tp('Nouvel avatar')}
            </button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5"><Upload size={11} /> {tp('Conseil : image nette du visage, de face, BOUCHE FERMÉE et expression neutre (pas de sourire) — un visage qui sourit sur la photo donnera un avatar qui sourit en parlant.')}</p>
    </div>
  );
};

export default AvatarStudio;
