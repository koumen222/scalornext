import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import {
  Video, Film, Upload, X, Loader2, Download, ExternalLink, AlertCircle,
  CheckCircle, PlaySquare, Star, Box, Sparkles, MessageCircle, Megaphone, Wand2, Info, Clapperboard, RotateCcw, UserRound, Mic,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { storeProductsApi } from '../../services/storeApi.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, Field, downloadFile, ImportProductBar, stripHtml, LoadingBar, featureCost, getInsufficientCredits } from './creativeShared.jsx';
import Wizard from './Wizard.jsx';
import AvatarStudio from './AvatarStudio.jsx';
import SpotAssembler from './SpotAssembler.jsx';
import { buildMontageScenes } from './launchToMontage.js';
import { VoiceSelect, VoicePreviewButton, DEFAULT_VOICE_ID } from './voiceCatalog.jsx';

const A = ACCENTS.video;

// Trois familles de créatives — chacune a SA config et SON pipeline :
//   ugc    → wizard personnage + animation + voix (Veo 3.1), scénarios face
//            caméra, avec la préparation angle → hook → script du Lancement
//   avatar → AvatarStudio embarqué (lip sync Standard/Premium/Cinéma, voix
//            Fish, script écrit depuis le produit importé)
//   spot   → LE processus du Lancement assemblé : angles → hooks → script
//            scéné complet → montage automatique (SpotAssembler)
const FAMILIES = [
  { id: 'ugc',    label: tp('UGC'),            icon: MessageCircle, desc: tp('Créateur face caméra : témoignage, démo, unboxing') },
  { id: 'avatar', label: tp('Avatar parlant'), icon: UserRound,     desc: tp('Un avatar tient ton produit et le vend en parlant') },
  { id: 'spot',   label: tp('Spot pub'),       icon: Megaphone,     desc: tp('Angle → hook → script scéné → montage automatique') },
];

const SCENARIOS = [
  { id: 'ugc_testimonial', label: tp('UGC Témoignage'),  icon: MessageCircle, desc: tp('Face caméra authentique') },
  { id: 'action',          label: tp('UGC Démonstration'), icon: PlaySquare, desc: tp('Utilisation naturelle du produit') },
  { id: 'unboxing',        label: tp('UGC Unboxing'),     icon: Box,           desc: tp('Découverte et première réaction') },
];

const SCENARIOS_BY_FAMILY = {
  ugc: ['ugc_testimonial', 'action', 'unboxing'],
};

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

const VideoStudio = ({ importedProduct, onImport, onClearImport, onSendToMontage, credits, onCreditsChange, onNeedCredits }) => {
  const [family, setFamily] = useState('ugc');
  // Script scéné choisi (processus lancement : angle → hook → script complet).
  const [ugcScript, setUgcScript] = useState(null);
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
  // Profil du créateur UGC : l'utilisateur précise la personne (genre, âge,
  // peau, description libre) et/ou fournit une photo de référence — pour une
  // image de personnage PRÉCISE, naturelle et de bonne qualité.
  const [charGender, setCharGender] = useState('');
  const [charAge, setCharAge] = useState('');
  const [charSkin, setCharSkin] = useState('');
  const [charRole, setCharRole] = useState('');
  const [charDesc, setCharDesc] = useState('');
  const [charRefUrl, setCharRefUrl] = useState('');
  const [uploadingRef, setUploadingRef] = useState(false);
  const charRefInputRef = useRef(null);
  // Voix off de la vidéo (tous les plans + plans parlants OmniHuman).
  const [ugcVoiceId, setUgcVoiceId] = useState(DEFAULT_VOICE_ID);
  // Mode de parole UGC :
  //  · 'lipsync' — avec avatar : hook/CTA lip-syncés (OmniHuman), voix Fish partout
  //  · 'veo'     — SANS lip sync : chaque scène est un clip parlé ~10 s (Kling V3 Turbo) où le
  //                créateur PARLE en français (voix native), monté par ffmpeg
  const [ugcTalk, setUgcTalk] = useState('lipsync');
  // Moteur des scènes parlées (mode sans lip sync) : clips de durées
  // différentes → le découpage du script s'adapte au moteur.
  //   grok  → Grok Imagine 1.5, 6 s (~15 mots/scène)
  //   kling → Kling V3 Turbo, 10 s (~26 mots/scène)
  //   veo   → Veo 3.1, 8 s (~20 mots/scène)
  const [ugcEngine, setUgcEngine] = useState('grok');
  const TALK_ENGINES = {
    // wordsPerSeg ≈ clipSec × 2,9 mots/s : un texte DENSE force un débit
    // rapide — il parle vite, sans traîner ni laisser de silence.
    grok: { label: 'Grok Imagine 1.5', clipSec: 6, wordsPerSeg: 17 },
    kling: { label: 'Kling V3 Turbo', clipSec: 10, wordsPerSeg: 28 },
    veo: { label: 'Veo 3.1', clipSec: 8, wordsPerSeg: 22 },
  };
  // B-rolls : inserts d'images (éco) qui ILLUSTRENT certains points par-dessus
  // le créateur qui parle — la voix continue, comme les vrais UGC TikTok.
  const [ugcBrolls, setUgcBrolls] = useState(false);
  // Nombre de b-rolls (1-4) et MOTS-CLÉS : « collagène, douleur » → l'insert
  // apparaît sur la scène où le mot est prononcé, calé à l'endroit du mot.
  // Sans mots-clés : répartition auto sur les scènes du milieu.
  const [ugcBrollCount, setUgcBrollCount] = useState(2);
  const [ugcBrollKeywords, setUgcBrollKeywords] = useState('');
  // Réglages de génération : musique de fond (presets), nombre de scènes
  // (auto ou 3-8), résolution des scènes parlées (480p éco / 720p).
  const [ugcMusicId, setUgcMusicId] = useState('');
  const [musicPresets, setMusicPresets] = useState([]);
  const [ugcSceneCount, setUgcSceneCount] = useState('auto'); // 'auto' | 3..8
  const [ugcRes, setUgcRes] = useState('480p');
  // Job de génération UGC — déclaré ICI (avant les effets de persistance qui
  // le lisent) : { phase: scenes|review|render|done|error, done, total, progress, url, error }
  const [ugcJob, setUgcJob] = useState(null);
  // Scènes générées, en REVUE avant assemblage (régénérables / supprimables).
  const [ugcScenes, setUgcScenes] = useState([]);

  // Presets musicaux (mêmes fonds sonores que le montage) — best-effort.
  useEffect(() => {
    if (family !== 'ugc' || musicPresets.length) return;
    creativeApi.montage.presets()
      .then((r) => setMusicPresets(Array.isArray(r?.data?.presets) ? r.data.presets : []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family]);

  // ── PERSISTANCE PAR PRODUIT : le brouillon (script, créateur, réglages,
  //    dernière vidéo) est attaché AU PRODUIT. Changer de produit repart
  //    propre (ou recharge le brouillon de CE produit) — plus jamais les
  //    données d'un ancien produit sur le nouveau. ──
  const ugcDraftKey = `scalor:ugcDraft:v2:${importedProduct?.id || 'none'}`;
  const skipSaveRef = useRef(true);
  useEffect(() => {
    // Changement de produit : remise à zéro AVANT restauration éventuelle.
    setUgcScript(null); setCharacterImage(''); setCharGender(''); setCharAge('');
    setCharSkin(''); setCharRole(''); setCharDesc(''); setCharRefUrl(''); setUgcJob(null); setUgcScenes([]);
    skipSaveRef.current = true; // le save de CE cycle (états pas encore appliqués) est sauté
    try {
      const raw = localStorage.getItem(ugcDraftKey);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d || Date.now() - (d.ts || 0) > 48 * 3600 * 1000) return; // brouillon > 48 h : ignoré
      if (d.ugcScript) setUgcScript(d.ugcScript);
      if (d.charGender) setCharGender(d.charGender);
      if (d.charAge) setCharAge(d.charAge);
      if (d.charSkin) setCharSkin(d.charSkin);
      if (d.charRole) setCharRole(d.charRole);
      if (d.charDesc) setCharDesc(d.charDesc);
      if (d.charRefUrl) setCharRefUrl(d.charRefUrl);
      if (d.characterImage) setCharacterImage(d.characterImage);
      if (d.ugcTalk) setUgcTalk(d.ugcTalk);
      if (d.ugcEngine) setUgcEngine(d.ugcEngine);
      if (d.ugcRes) setUgcRes(d.ugcRes);
      if (d.ugcSceneCount != null) setUgcSceneCount(d.ugcSceneCount);
      if (d.ugcMusicId) setUgcMusicId(d.ugcMusicId);
      if (typeof d.ugcBrolls === 'boolean') setUgcBrolls(d.ugcBrolls);
      if (d.ugcVoiceId) setUgcVoiceId(d.ugcVoiceId);
      if (Array.isArray(d.ugcScenes) && d.ugcScenes.length) { setUgcScenes(d.ugcScenes.map((s) => ({ ...s, busy: false }))); setUgcJob({ phase: 'review', done: 0, total: d.ugcScenes.length, progress: 0, url: '', error: '' }); }
      if (d.lastVideoUrl) setUgcJob({ phase: 'done', done: 0, total: 0, progress: 100, url: d.lastVideoUrl, error: '' });
    } catch { /* brouillon illisible : on repart propre */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ugcDraftKey]);
  useEffect(() => {
    if (skipSaveRef.current) { skipSaveRef.current = false; return; } // cycle de restauration
    try {
      localStorage.setItem(ugcDraftKey, JSON.stringify({
        ts: Date.now(),
        ugcScript, charGender, charAge, charSkin, charRole, charDesc, charRefUrl,
        characterImage, ugcTalk, ugcEngine, ugcRes, ugcSceneCount, ugcMusicId,
        ugcBrolls, ugcVoiceId,
        ugcScenes: ugcScenes.length ? ugcScenes.map((s) => ({ ...s, busy: undefined })) : undefined,
        lastVideoUrl: ugcJob?.phase === 'done' ? ugcJob.url : undefined,
      }));
    } catch { /* stockage plein : tant pis, best-effort */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ugcScript, charGender, charAge, charSkin, charRole, charDesc, charRefUrl,
    characterImage, ugcTalk, ugcEngine, ugcRes, ugcSceneCount, ugcMusicId,
    ugcBrolls, ugcVoiceId, ugcJob, ugcScenes]);

  // ── MODIFIER l'image du personnage par instruction (édition i2i) : la
  //    retouche demandée est appliquée, TOUT le reste reste identique. Une
  //    version précédente est gardée pour revenir en arrière. ──
  const [charEditPrompt, setCharEditPrompt] = useState('');
  const [editingChar, setEditingChar] = useState(false);
  const [prevCharacterImage, setPrevCharacterImage] = useState('');
  const editCharacterImage = async () => {
    const instruction = charEditPrompt.trim();
    if (!instruction || !characterImage || editingChar) return;
    setEditingChar(true); setError('');
    try {
      const prompt = `Edit this exact photo. KEEP EVERYTHING IDENTICAL — same person, same face, same skin tone, same pose, same clothes, same background, same lighting, same product — EXCEPT apply ONLY this requested change: "${instruction}". The result must stay a realistic casual smartphone photo (natural skin texture, true-to-life colors, no beauty-filter, no studio look). Vertical 9:16 framing. No text anywhere.`;
      const { data } = await creativeApi.image.simple({ prompt, sourceUrl: characterImage, aspectRatio: '9:16' });
      if (!data?.success || !data.url) throw new Error(data?.message || tp('Modification impossible — réessaye'));
      setPrevCharacterImage(characterImage);
      setCharacterImage(data.url);
      setCharEditPrompt('');
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setEditingChar(false); }
  };

  // Repartir de ZÉRO sur ce produit (brouillon effacé) — choix explicite.
  const resetUgcDraft = () => {
    try { localStorage.removeItem(ugcDraftKey); } catch { /* — */ }
    setUgcScript(null); setCharacterImage(''); setCharGender(''); setCharAge('');
    setCharSkin(''); setCharRole(''); setCharDesc(''); setCharRefUrl(''); setUgcJob(null); setUgcScenes([]); setError('');
  };
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

  // Changement de famille : scénario cohérent + on repart d'un état propre.
  const selectFamily = (id) => {
    if (id === family) return;
    setFamily(id); setError(''); setResult(null);
    setCharacterImage(''); setVideoPreview(''); // le personnage/clip d'un autre format n'est pas réutilisable
    setUgcScript(null); setVoiceoverText(''); // le script est écrit POUR un format
    const allowed = SCENARIOS_BY_FAMILY[id];
    if (allowed && !allowed.includes(scenario)) setScenario(allowed[0]);
  };

  // Script choisi (processus lancement) : le hook sert de contexte visuel au
  // personnage (le réalisateur illustre la phrase d'ouverture).
  const pickUgcScript = (s) => {
    setUgcScript(s);
    setVoiceoverText(String(s?.hook || '').trim());
  };

  // ── GÉNÉRATION UGC AUTONOME — plus AUCUN passage par le Studio Montage.
  //    « Générer la vidéo » enchaîne tout ICI : chaque scène (clips parlés Veo
  //    ou lip sync OmniHuman + rushs + voix Fish), puis l'assemblage ffmpeg
  //    (règles UGC : cuts simples, sous-titres créateur) — la vidéo finale
  //    s'affiche dans ce studio et part dans la galerie.
  //    (L'état ugcJob est déclaré plus haut, avant les effets de persistance.) ──
  const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

  // Découpe le SCRIPT COMPLET en segments PARLÉS calibrés sur le MOTEUR
  // (mots/scène = durée du clip × débit rapide) : une vidéo UGC fait 30-45 s.
  // Chaque segment = une scène où le créateur parle SANS interruption, la
  // phrase remplit exactement le clip — aucun moment de silence.
  const splitScriptForTalking = (script) => {
    const eng = TALK_ENGINES[ugcEngine] || TALK_ENGINES.grok;
    const text = String(script?.script || '').replace(/\s+/g, ' ').trim();
    if (!text) return [];
    const words = (s) => s.split(/\s+/).filter(Boolean).length;
    // Nombre de scènes IMPOSÉ par l'utilisateur : la cible mots/scène est
    // recalculée (texte total ÷ scènes) — le débit s'adapte.
    const wanted = ugcSceneCount !== 'auto' ? Math.max(3, Math.min(8, Number(ugcSceneCount))) : null;
    const perSeg = wanted ? Math.max(10, Math.ceil(words(text) / wanted)) : eng.wordsPerSeg;
    const sentences = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
    const segs = [];
    let cur = '';
    for (const s of sentences) {
      if (cur && words(cur) + words(s) > perSeg) { segs.push(cur.trim()); cur = s; }
      else cur = cur ? `${cur} ${s}` : s;
    }
    if (cur.trim()) segs.push(cur.trim());
    // Cap : ~45 s de vidéo ET 8 SCÈNES MAXI (règle dure). Fusion douce
    // d'abord (respecte le débit), puis fusion FORCÉE si on dépasse encore 8 —
    // mieux vaut un débit très rapide qu'une vidéo à 10 scènes.
    const maxScenes = wanted || Math.min(8, Math.max(3, Math.floor(45 / eng.clipSec)));
    const smallestPair = () => {
      let bi = 0; let best = Infinity;
      for (let i = 0; i < segs.length - 1; i += 1) {
        const w = words(segs[i]) + words(segs[i + 1]);
        if (w < best) { best = w; bi = i; }
      }
      return { bi, best };
    };
    // Fusion DOUCE : vers la cible, sans dépasser le débit possible.
    while (segs.length > maxScenes) {
      const { bi, best } = smallestPair();
      if (!wanted && best > perSeg + 4) break;
      segs.splice(bi, 2, `${segs[bi]} ${segs[bi + 1]}`);
    }
    // Règle DURE : jamais plus de 8 scènes, quitte à densifier le texte.
    while (segs.length > 8) {
      const { bi } = smallestPair();
      segs.splice(bi, 2, `${segs[bi]} ${segs[bi + 1]}`);
    }
    return segs.map((seg) => ({
      voiceText: seg, subtitleText: seg, showProduct: true,
      durationSec: eng.clipSec,
    }));
  };

  const pollLipsyncJob = async (jobId, maxMs = 14 * 60 * 1000) => {
    const deadline = Date.now() + maxMs;
    for (;;) {
      if (Date.now() > deadline) throw new Error(tp('Plan parlant trop long (timeout) — réessaye'));
      await sleepMs(5000);
      let j = null;
      try { const r = await creativeApi.lipsync.job(jobId); j = r.data; } catch { continue; }
      if (j?.status === 'done' && j.url) return j.url;
      if (j?.status === 'error') throw new Error(j.error || tp('Plan parlant impossible'));
    }
  };

  const generateUgcVideo = async () => {
    if (ugcJob && ugcJob.phase !== 'error' && ugcJob.phase !== 'done') return; // déjà en cours
    if (!ugcScript) { setError(tp('Choisis d’abord un script (étape Angles & scripts).')); return; }
    const creatorImg = characterImage || charRefUrl;
    if (!creatorImg) { setError(tp('Génère d’abord ton créateur (étape Personnage).')); return; }
    // Mode parlé : le script est redécoupé en 3-4 segments de ~10 s (30-45 s
    // au total). Mode lip sync : les plans du storyboard (voix off + rushs).
    const scenes = ugcTalk === 'veo' ? splitScriptForTalking(ugcScript) : buildMontageScenes(ugcScript);
    if (!scenes.length) { setError(tp('Ce script n’a pas de scènes exploitables.')); return; }
    // Garde tarifaire : chaque scène coûte featureCost('video') crédits (+ montage à l'assemblage).
    const estimatedCost = featureCost('video') * scenes.length;
    if (typeof credits === 'number' && credits < estimatedCost) {
      setError(`${tp('Crédits insuffisants pour ce parcours')} : ${estimatedCost} ${tp('requis pour')} ${scenes.length} ${tp('scènes')}, ${credits} ${tp('disponible(s)')}.`);
      onNeedCredits?.();
      return;
    }
    const prodImg = importedProduct?.imageUrl || remoteImageUrl || '';
    setError('');
    setUgcJob({ phase: 'scenes', done: 0, total: scenes.length, progress: 0, url: '', error: '' });
    try {
      const prepared = new Array(scenes.length);
      // ── PLAN DES B-ROLLS : par MOT-CLÉ (l'insert tombe sur la scène où le
      //    mot est prononcé, calé à sa position dans la phrase) ou réparti
      //    automatiquement sur les scènes du milieu. Nombre choisi (1-4). ──
      const brollPlan = new Map(); // sceneIndex → { keyword, ratio }
      if (ugcBrolls && ugcTalk === 'veo' && scenes.length > 2) {
        const maxB = Math.max(1, Math.min(4, Number(ugcBrollCount) || 2));
        const kws = ugcBrollKeywords.split(',').map((k) => k.trim()).filter((k) => k.length >= 2);
        if (kws.length) {
          for (const kw of kws) {
            if (brollPlan.size >= maxB) break;
            const kl = kw.toLowerCase();
            for (let i = 1; i < scenes.length - 1; i += 1) {
              if (brollPlan.has(i)) continue;
              const lw = String(scenes[i].voiceText || '').toLowerCase();
              const pos = lw.indexOf(kl);
              if (pos >= 0) { brollPlan.set(i, { keyword: kw, ratio: pos / Math.max(1, lw.length) }); break; }
            }
          }
        }
        // Complément auto jusqu'au nombre demandé (scènes du milieu libres).
        for (let i = 1; i < scenes.length - 1 && brollPlan.size < maxB; i += 1) {
          if (!brollPlan.has(i)) brollPlan.set(i, { keyword: '', ratio: 0.3 });
        }
      }
      const oneScene = async (i) => {
        const sc = scenes[i];
        const line = String(sc.voiceText || sc.subtitleText || '').trim();
        if (ugcTalk === 'veo') {
          // Scène parlée nativement : clip Kling V3 Turbo ~10 s, le créateur DIT la phrase.
          const { data } = await creativeApi.video.generateScene({
            mode: 'scene', stage: 'video', scenario: 'ugc_testimonial',
            speakText: line, voiceoverText: line,
            talkEngine: ugcEngine, // grok | kling | veo — moteur choisi
            talkResolution: ugcRes, // 480p (éco) | 720p
            // AUCUN brief visuel : il parle face caméra, sans mise en scène
            // (le backend verrouille position/gestes en mode parlé).
            prompt: '',
            preparedImageUrl: creatorImg,
            characterDesc: buildCharacterDesc(), characterRefUrl: creatorImg,
            sourceUrl: sc.showProduct !== false ? (prodImg || null) : null,
            showProduct: sc.showProduct !== false,
            // Durée = temps de parole du segment (5-12 s) : il parle pendant
            // TOUT le clip, aucun silence.
            subject, productContext, durationSec: sc.durationSec || 10,
          });
          if (!data?.success || !data.videoUrl) throw new Error(data?.message || tp('Génération de la scène impossible'));
          prepared[i] = { videoUrl: data.videoUrl, useClipAudio: true, audioUrl: null, durationSec: sc.durationSec || 10, subtitleText: sc.subtitleText || line, transitionOut: 'fade' };
          // B-ROLL (option) : clip VIDÉO 3 s (produit EN ACTION, vertical,
          // PLEIN ÉCRAN) par-dessus la parole — la voix continue. Planifié par
          // MOT-CLÉ (calé au moment où le mot est dit) ou auto. Le brief =
          // le mot-clé + la phrase exacte → insert ultra précis et cohérent.
          const bp = brollPlan.get(i);
          if (bp) {
            try {
              const clipSec = sc.durationSec || 10;
              const { data: bd } = await creativeApi.video.generateScene({
                mode: 'scene', stage: 'video', scenario: '', broll: true,
                prompt: bp.keyword ? `${tp('Illustration LITTÉRALE et précise de')} : « ${bp.keyword} »` : '',
                voiceoverText: line, // le réalisateur illustre cette phrase
                sourceUrl: prodImg || null, showProduct: true,
                subject, productContext, durationSec: 3,
              });
              if (bd?.success && bd.videoUrl) {
                // Fenêtre calée sur la POSITION du mot-clé dans la phrase.
                const bStart = Math.max(0.8, Math.min((sc.durationSec || 10) - 3.4, Math.round(clipSec * (bp.ratio || 0.3) * 100) / 100));
                prepared[i].overlays = [{
                  videoUrl: bd.videoUrl, xPct: 50, yPct: 50, wPct: 100, // PLEIN ÉCRAN
                  startSec: bStart,
                  endSec: Math.min(clipSec - 0.4, bStart + 3), // fenêtre de 3 s
                }];
              }
            } catch { /* b-roll best-effort : la scène parle sans insert */ }
          }
          return;
        }
        // Mode lip sync : la voix Fish du plan d'abord (elle pilote les lèvres).
        let audioUrl = '';
        if (line.length >= 2) {
          const r = await creativeApi.launch.voiceover({ text: line, referenceId: ugcVoiceId || undefined });
          if (!r.data?.success || !r.data.url) throw new Error(r.data?.message || tp('Voix du plan impossible'));
          audioUrl = r.data.url;
        }
        const isTalk = (i === 0 || i === scenes.length - 1 || sc.role === 'hook' || sc.role === 'cta') && !!audioUrl;
        if (isTalk) {
          // Hook / CTA : le créateur parle réellement (OmniHuman) ; le montage
          // mixe LE MÊME audio → lèvres synchrones.
          const { data } = await creativeApi.lipsync.create({ imageUrl: creatorImg, audioUrl, tier: 'cinema' });
          if (!data?.success || !data.jobId) throw new Error(data?.message || tp('Lancement du plan parlant impossible'));
          const url = await pollLipsyncJob(data.jobId);
          prepared[i] = { videoUrl: url, audioUrl, durationSec: Math.max(2, Number(sc.durationSec) || 5), subtitleText: sc.subtitleText || line, transitionOut: 'fade' };
          return;
        }
        // Rush (b-roll) : visuel de la scène + voix off du plan.
        const asImage = sc.genMode === 'image';
        const { data } = await creativeApi.video.generateScene({
          mode: 'scene', scenario: 'ugc_testimonial',
          ...(asImage ? { stage: 'character' } : { stage: 'video' }),
          prompt: (sc.clipPrompt || line).trim(), voiceoverText: line,
          characterDesc: buildCharacterDesc(), characterRefUrl: creatorImg,
          sourceUrl: sc.showProduct !== false ? (prodImg || null) : null,
          showProduct: sc.showProduct !== false,
          subject, productContext, durationSec: Math.max(3, Math.min(6, Math.round(sc.durationSec || 5))),
        });
        const visual = asImage ? { imageUrl: data?.startImage || '' } : { videoUrl: data?.videoUrl || '' };
        if (!data?.success || (!visual.imageUrl && !visual.videoUrl)) throw new Error(data?.message || tp('Génération de la scène impossible'));
        prepared[i] = { ...visual, audioUrl: audioUrl || null, durationSec: Math.max(2, Number(sc.durationSec) || 5), subtitleText: sc.subtitleText || line, kenBurns: sc.kenBurns || undefined, transitionOut: 'fade' };
      };
      // Pool de 2 scènes en parallèle, 1 retry par scène.
      let doneCount = 0;
      const queue = scenes.map((_, i) => i);
      await Promise.all(Array.from({ length: Math.min(2, queue.length) }, async () => {
        while (queue.length) {
          const i = queue.shift();
          try { await oneScene(i); } catch { await oneScene(i); }
          doneCount += 1;
          setUgcJob((j) => (j ? { ...j, done: doneCount } : j));
        }
      }));
      // ── REVUE : les scènes sont prêtes — l'utilisateur vérifie, régénère
      //    ou supprime AVANT l'assemblage. Rien n'est perdu (persisté). ──
      setUgcScenes(prepared.map((p, i) => (p ? { ...p, line: String(scenes[i]?.voiceText || '').trim(), busy: false } : null)).filter(Boolean));
      setUgcJob((j) => (j ? { ...j, phase: 'review' } : j));
      try { const cr = await creativeApi.credits.get(); onCreditsChange?.(cr.data?.credits ?? credits); } catch { /* noop */ }
    } catch (e) {
      if (getInsufficientCredits(e)) onNeedCredits?.();
      setUgcJob((j) => (j ? { ...j, phase: 'error', error: e?.response?.data?.message || e.message } : j));
    }
  };

  // ── RÉGÉNÉRER une scène (mode parlé) : même phrase, nouveau clip — avec
  //    les MODIFICATIONS précisées par l'utilisateur (« moins de gestes »,
  //    « il sourit », « parle plus vite »…), appliquées en plus des verrous. ──
  const [ugcSceneTweaks, setUgcSceneTweaks] = useState({}); // { index: instruction }
  const regenerateUgcScene = async (i) => {
    const src = ugcScenes[i];
    if (!src || src.busy) return;
    const creatorImg = characterImage || charRefUrl;
    const tweak = String(ugcSceneTweaks[i] || '').trim();
    setUgcScenes((l) => l.map((s, j) => (j === i ? { ...s, busy: true } : s)));
    try {
      const { data } = await creativeApi.video.generateScene({
        mode: 'scene', stage: 'video', scenario: 'ugc_testimonial',
        speakText: src.line, voiceoverText: src.line,
        talkEngine: ugcEngine, talkResolution: ugcRes, prompt: '',
        sceneTweak: tweak, // les modifications demandées pour CETTE prise
        preparedImageUrl: creatorImg,
        characterDesc: buildCharacterDesc(), characterRefUrl: creatorImg,
        sourceUrl: importedProduct?.imageUrl || remoteImageUrl || null, showProduct: true,
        subject, productContext, durationSec: src.durationSec || 10,
      });
      if (!data?.success || !data.videoUrl) throw new Error(data?.message || tp('Régénération impossible'));
      setUgcScenes((l) => l.map((s, j) => (j === i ? { ...s, videoUrl: data.videoUrl, busy: false } : s)));
      setUgcSceneTweaks((t) => ({ ...t, [i]: '' })); // modif appliquée
      if (typeof data.creditsRemaining === 'number') onCreditsChange?.(data.creditsRemaining);
    } catch (e) {
      if (getInsufficientCredits(e)) onNeedCredits?.();
      setError(e?.response?.data?.message || e.message);
      setUgcScenes((l) => l.map((s, j) => (j === i ? { ...s, busy: false } : s)));
    }
  };

  // ── ASSEMBLER les scènes validées (revue) → vidéo finale. ──
  const assembleUgcFinal = async () => {
    const list = ugcScenes.filter(Boolean);
    if (!list.length) { setError(tp('Aucune scène à assembler.')); return; }
    setUgcJob({ phase: 'render', done: 0, total: list.length, progress: 3, url: '', error: '' });
    try {
      const musicPreset = musicPresets.find((p) => p.id === ugcMusicId);
      const { data: mres } = await creativeApi.montage.create({
        format: '9:16', subtitles: true,
        captionMode: 'dynamic', captionStyle: 'box_black', captionAnim: 'pop',
        captionPosition: 'middle', captionCase: 'upper', captionFont: 'sans',
        transition: 'fade',
        // Musique de fond choisie — volume discret, la voix domine toujours.
        musicUrl: musicPreset?.url || null, musicVolume: 0.28, narrationUrl: null,
        scenes: list.map((p) => ({ ...p, line: undefined, busy: undefined, volume: 1, trimStart: 0 })),
      });
      if (!mres?.jobId) throw new Error(mres?.message || tp('Assemblage impossible'));
      const deadline = Date.now() + 20 * 60 * 1000;
      for (;;) {
        if (Date.now() > deadline) throw new Error(tp('Assemblage trop long — réessaye'));
        await sleepMs(4000);
        let jd = null;
        try { const r = await creativeApi.montage.job(mres.jobId); jd = r.data; } catch { continue; }
        if (jd?.status === 'done' && jd.url) {
          setUgcJob((j) => (j ? { ...j, phase: 'done', progress: 100, url: jd.url } : j));
          // Sauvegarde automatique dans la galerie création (best-effort).
          try {
            await creativeApi.gallery.save({
              type: 'video', videoUrl: jd.url,
              label: `UGC — ${String(ugcScript?.hook || subject || '').slice(0, 160)}`,
              productName: subject || undefined,
              meta: { kind: 'ugc_video', source: 'video_studio', angleTitle: ugcScript?.angleTitle || '', talk: ugcTalk },
            });
          } catch { /* best-effort */ }
          return;
        }
        if (jd?.status === 'error') throw new Error(jd.error || tp('Assemblage échoué'));
        if (typeof jd?.progress === 'number') setUgcJob((j) => (j ? { ...j, progress: jd.progress } : j));
      }
    } catch (e) {
      if (getInsufficientCredits(e)) onNeedCredits?.();
      setUgcJob((j) => (j ? { ...j, phase: 'error', error: e?.response?.data?.message || e.message } : j));
    }
  };

  // Rôles types — calibrés sur les références validées : client chez lui,
  // expert/docteur en cabinet, vendeur dans sa boutique.
  const CHAR_ROLES = {
    client: tp('personne ordinaire crédible, chez elle dans un intérieur simple et réel, tient le produit à hauteur de poitrine'),
    docteur: tp('médecin en blouse blanche avec stéthoscope, dans un vrai cabinet médical (bureau, classeurs, fenêtre), tient le produit bien lisible'),
    vendeur: tp('commerçant accueillant dans sa petite boutique réelle (étagères de produits), produit en main'),
  };

  // Description composée du créateur (rôle + chips + texte libre) → envoyée au
  // réalisateur backend qui l'impose dans l'image du personnage.
  const buildCharacterDesc = () => [
    charGender, charAge ? `${charAge} ans` : '', charSkin,
    CHAR_ROLES[charRole] || '', charDesc.trim(),
  ].filter(Boolean).join(', ');

  const uploadCharRef = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError(tp('Sélectionnez une image')); return; }
    setUploadingRef(true); setError('');
    try {
      const up = await storeProductsApi.uploadImages([file]);
      const url = up.data?.data?.[0]?.url || '';
      if (!url) throw new Error(tp('Échec du téléversement de la photo.'));
      setCharRefUrl(url);
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setUploadingRef(false); }
  };

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
    if (typeof credits === 'number' && credits < featureCost('video')) { onNeedCredits?.(); return; }
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
      if (typeof data.creditsRemaining === 'number') onCreditsChange?.(data.creditsRemaining);
    } catch (err) {
      if (getInsufficientCredits(err)) onNeedCredits?.();
      setError(err.response?.data?.message || err.message || tp('Erreur lors du rendu'));
    } finally { stopStepTicker(); setLoading(false); }
  }, [canGenerate, remoteImageUrl, sourceFile, scenario, description, voiceoverText, subject, productContext, duration, credits, onCreditsChange, onNeedCredits]);

  const generateStage = async (stage) => {
    if (!canGenerate && !remoteImageUrl) return false;
    setLoading(true); setError('');
    try {
      const sourceUrl = await resolveSourceUrl();
      if (!sourceUrl) throw new Error(tp('Échec du téléversement de la photo.'));
      const res = await creativeApi.video.generateScene({
        mode: 'scene', stage, scenario, prompt: description.trim(), voiceoverText: voiceoverText.trim(),
        sourceUrl,
        // stage 'character' : JAMAIS d'image préparée — regénérer doit toujours
        // regénérer (sinon le backend court-circuite et renvoie l'existante,
        // et les nouveaux réglages rôle/genre/âge/peau sont ignorés).
        preparedImageUrl: stage === 'character' ? '' : characterImage,
        preparedVideoUrl: videoPreview,
        subject, productContext, durationSec: duration,
        characterDesc: buildCharacterDesc(), characterRefUrl: charRefUrl,
      });
      const data = res.data || {};
      if (!data.success) throw new Error(data.message || tp('Génération impossible, réessayez'));
      if (stage === 'character') setCharacterImage(data.startImage || '');
      if (stage === 'video') setVideoPreview(data.videoUrl || '');
      if (stage === 'voice') setResult({ videoUrl: data.videoUrl, gifUrl: '' });
      if (typeof data.creditsRemaining === 'number') onCreditsChange?.(data.creditsRemaining);
      return true;
    } catch (err) {
      if (getInsufficientCredits(err)) onNeedCredits?.();
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
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <img src={imagePreview} alt="produit" className="w-full h-48 object-contain bg-background" />
              <button onClick={removeImage} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-card/90 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-red-500 shadow-sm"><X size={15} /></button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full h-44 rounded-2xl border-2 border-dashed border-border hover:border-primary/30 hover:bg-primary/10/30 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <div className="w-11 h-11 rounded-2xl bg-background flex items-center justify-center"><Upload size={18} /></div>
              <span className="text-[13px] font-medium text-muted-foreground">{tp('Importer une photo')}</span>
              <span className="text-[11px]">{tp('ou importez un produit de la boutique')}</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </div>
      ),
    },
    {
      title: tp('Format créatif'), subtitle: tp('Quel type de vidéo UGC générer ?'), valid: true,
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-2xl">
          {SCENARIOS.filter(s => (SCENARIOS_BY_FAMILY[family] || SCENARIOS_BY_FAMILY.ugc).includes(s.id)).map(s => {
            const Icon = s.icon; const active = scenario === s.id;
            return (
              <button key={s.id} onClick={() => setScenario(s.id)}
                className={`text-left rounded-xl border p-3 transition-all ${active ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-card border-border hover:border-gray-300'}`}>
                <Icon size={16} className={active ? A.text : 'text-muted-foreground'} />
                <div className={`text-[12.5px] font-semibold mt-1.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</div>
                <p className="text-[10.5px] text-muted-foreground leading-tight">{s.desc}</p>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: tp('Personnage'), subtitle: tp('D’abord TON créateur : le script sera écrit pour lui (un docteur ne parle pas comme un client).'), valid: !!characterImage,
      content: (
        <div className="max-w-xl space-y-4">
          {/* Profil du créateur : chips précises + description libre + photo. */}
          <div className="rounded-2xl border border-border bg-card p-3.5 space-y-3">
            {/* Rôle du personnage — les 3 archétypes des références validées. */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11.5px] font-semibold text-muted-foreground w-12 shrink-0">{tp('Rôle')}</span>
              {[['client', tp('Client · créateur')], ['docteur', tp('Docteur · expert')], ['vendeur', tp('Vendeur boutique')]].map(([id, label]) => (
                <button key={id} type="button" disabled={loading}
                  onClick={() => setCharRole(charRole === id ? '' : id)}
                  className={`h-8 px-3 rounded-lg border text-[12px] font-medium transition-all ${charRole === id ? `${A.bg} border-transparent ring-2 ${A.ring} text-foreground` : 'bg-card border-border text-muted-foreground hover:border-gray-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            {[
              [tp('Genre'), charGender, setCharGender, [tp('femme'), tp('homme')]],
              [tp('Âge'), charAge, setCharAge, ['18-25', '25-35', '35-50', '50+']],
              [tp('Peau'), charSkin, setCharSkin, [tp('peau noire'), tp('peau métisse'), tp('peau claire')]],
            ].map(([label, val, setVal, opts]) => (
              <div key={label} className="flex items-center gap-2 flex-wrap">
                <span className="text-[11.5px] font-semibold text-muted-foreground w-12 shrink-0">{label}</span>
                {opts.map((o) => (
                  <button key={o} type="button" disabled={loading}
                    onClick={() => setVal(val === o ? '' : o)}
                    className={`h-8 px-3 rounded-lg border text-[12px] font-medium transition-all ${val === o ? `${A.bg} border-transparent ring-2 ${A.ring} text-foreground` : 'bg-card border-border text-muted-foreground hover:border-gray-300'}`}>
                    {o}
                  </button>
                ))}
              </div>
            ))}
            <input value={charDesc} onChange={(e) => setCharDesc(e.target.value)} disabled={loading}
              placeholder={tp('Précisions libres : style, tenue, coiffure, décor… (optionnel)')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-[13px] outline-none focus:border-primary/40 transition" />
            <div className="flex items-center gap-2 flex-wrap">
              {charRefUrl ? (
                <div className="flex items-center gap-2">
                  <img src={charRefUrl} alt="" className="h-11 w-11 rounded-xl object-cover border border-border" />
                  <button type="button" onClick={() => setCharRefUrl('')} className="h-8 px-3 rounded-lg border border-border text-[11.5px] font-semibold text-muted-foreground hover:bg-background">{tp('Retirer la photo')}</button>
                </div>
              ) : (
                <button type="button" disabled={uploadingRef || loading} onClick={() => charRefInputRef.current?.click()}
                  className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-dashed border-gray-300 text-[12px] font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground disabled:opacity-50">
                  {uploadingRef ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />} {tp('Photo de la personne (optionnel)')}
                </button>
              )}
              <span className="text-[10.5px] text-muted-foreground">{tp('Avec photo : même visage et même peau dans l’image générée.')}</span>
              <input ref={charRefInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { uploadCharRef(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </div>

          {characterImage ? (
            <div className="space-y-3">
              <img src={characterImage} alt={tp('Personnage tenant le produit')} className="w-full max-h-[420px] object-contain rounded-2xl bg-background border border-border" />
              {/* MODIFIER l'image : décris la retouche, TOUT LE RESTE est
                  gardé identique (même personne, même pose, même décor). */}
              <div className="rounded-xl border border-border bg-card p-2.5 space-y-2">
                <div className="flex items-start gap-1.5">
                  <input value={charEditPrompt} onChange={(e) => setCharEditPrompt(e.target.value)} disabled={editingChar}
                    onKeyDown={(e) => { if (e.key === 'Enter') editCharacterImage(); }}
                    placeholder={tp('Modifier cette image — ex. « agrandis un peu le produit », « fond de cuisine », « sourire plus léger »…')}
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-2.5 text-[12.5px] outline-none focus:border-primary/40" />
                  <button type="button" onClick={editCharacterImage} disabled={editingChar || !charEditPrompt.trim()}
                    className="shrink-0 h-9 px-3 rounded-lg bg-primary text-white text-[12px] font-bold hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-1.5">
                    <Wand2 size={13} /> {tp('Appliquer')}
                  </button>
                </div>
                {editingChar && <LoadingBar expectedMs={22000} label={tp('Retouche de l’image — tout le reste est conservé…')} />}
                {prevCharacterImage && !editingChar && (
                  <button type="button" onClick={() => { setCharacterImage(prevCharacterImage); setPrevCharacterImage(''); }}
                    className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                    <RotateCcw size={11} /> {tp('Revenir à la version précédente')}
                  </button>
                )}
              </div>
              <button onClick={() => generateStage('character')} disabled={loading} className="h-9 px-4 rounded-xl border border-border text-[13px] font-medium text-muted-foreground hover:bg-background disabled:opacity-50">{tp('Regénérer avec ces réglages')}</button>
            </div>
          ) : loading ? (
            <div className="min-h-[140px] flex flex-col justify-center gap-3 rounded-2xl bg-background border border-border px-5">
              <LoadingBar expectedMs={32000} label={tp('Création du personnage avec votre produit — image naturelle, produit à taille réelle…')} />
            </div>
          ) : (
            <button onClick={() => generateStage('character')} disabled={loading}
              className="h-11 px-5 rounded-xl bg-primary text-white text-[13px] font-semibold hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2">
              <Wand2 size={15} /> {tp('Générer le personnage')}
            </button>
          )}
        </div>
      ),
    },
    {
      // LE processus du Lancement : nombre d'angles au choix, 3 hooks par
      // angle, script publicitaire complet (35-50 s, AIDA/PAS) par hook.
      title: tp('Angles & scripts'), subtitle: tp('Le script est écrit POUR ton créateur : angles → 3 hooks par angle → script complet, modifiable.'), valid: !!ugcScript,
      content: (
        <div className="space-y-3">
          {ugcScript && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10/70 px-3 py-2.5 text-[12.5px] text-primary">
              <CheckCircle size={14} className="shrink-0" />
              <span className="truncate">{tp('Script choisi')} : <strong>{ugcScript.hook || ugcScript.title}</strong> · {ugcScript.durationSec || 45}s</span>
            </div>
          )}
          <SpotAssembler importedProduct={importedProduct} onImport={onImport} onClearImport={onClearImport}
            accent={A} showImportBar={false} onUseScript={pickUgcScript}
            speakerDesc={buildCharacterDesc()} />
        </div>
      ),
    },
    {
      // Fin du parcours UGC — AUTONOME : « Générer la vidéo » fait tout ICI
      // (scènes + assemblage), la vidéo finale s'affiche dans ce studio.
      title: tp('Générer la vidéo'), subtitle: tp('Un clic : chaque scène est générée avec ton créateur, puis la vidéo est assemblée ici.'), valid: true,
      content: (
        <div className="max-w-xl space-y-4">
          {ugcJob?.phase === 'done' && ugcJob.url ? (
            /* ── Vidéo finale ── */
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="flex items-center gap-2 text-[13.5px] font-bold text-foreground"><CheckCircle size={16} className="text-primary" /> {tp('Ta vidéo UGC est prête')}</p>
              <div className="flex justify-center bg-gray-900 rounded-2xl overflow-hidden">
                <video src={ugcJob.url} controls playsInline className="max-h-[480px] w-auto bg-black" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => downloadFile(ugcJob.url, `ugc-${Date.now()}.mp4`)}
                  className="flex-1 h-10 rounded-xl bg-primary text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-2 hover:bg-primary-700">
                  <Download size={14} /> {tp('Télécharger')}
                </button>
                <button type="button" onClick={() => setUgcJob(null)}
                  className="h-10 px-4 rounded-xl border border-border text-foreground text-[12.5px] font-bold hover:bg-background">
                  <RotateCcw size={14} className="inline mr-1.5" />{tp('Refaire')}
                </button>
              </div>
              <p className="text-[10.5px] text-muted-foreground">{tp('Sauvegardée automatiquement dans la galerie création.')}</p>
            </div>
          ) : ugcJob?.phase === 'review' ? (
            /* ── REVUE DES SCÈNES : vérifie, régénère ou supprime, puis assemble. ── */
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[13px] font-bold text-foreground">{tp('Scènes prêtes')} — {ugcScenes.length}</p>
                <p className="text-[11px] text-muted-foreground">{tp('Vérifie chaque scène : régénère ou supprime, puis assemble.')}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {ugcScenes.map((s, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="aspect-[9/16] max-h-64 w-full bg-gray-950 flex items-center justify-center">
                      {s.videoUrl
                        ? <video src={s.videoUrl} controls playsInline className="h-full w-full object-contain" />
                        : s.imageUrl ? <img src={s.imageUrl} alt="" className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="p-2.5 space-y-2">
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        <span className={`inline-block mr-1.5 text-[9px] font-bold uppercase tracking-wide rounded px-1 py-0.5 ${A.bg} ${A.text}`}>{i + 1}</span>
                        {s.line || s.subtitleText}
                      </p>
                      {s.overlays?.length > 0 && <span className="inline-block text-[9.5px] font-bold uppercase tracking-wide bg-primary/10 text-primary rounded px-1.5 py-0.5">{tp('B-roll inclus')}</span>}
                      {s.busy ? (
                        <LoadingBar expectedMs={ugcEngine === 'kling' ? 300000 : 180000} label={tp('Régénération de la scène…')} />
                      ) : (
                        <>
                          {/* Précise les MODIFICATIONS voulues pour cette prise. */}
                          <input value={ugcSceneTweaks[i] || ''}
                            onChange={(e) => setUgcSceneTweaks((t) => ({ ...t, [i]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') regenerateUgcScene(i); }}
                            placeholder={tp('Modifs — ex. « moins de gestes », « il sourit », « parle plus vite »…')}
                            className="w-full h-8 rounded-lg border border-border bg-background px-2 text-[11px] outline-none focus:border-primary/40" />
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => regenerateUgcScene(i)}
                              className="flex-1 h-8 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-background inline-flex items-center justify-center gap-1">
                              <RotateCcw size={11} /> {ugcSceneTweaks[i]?.trim() ? tp('Régénérer avec ces modifs') : tp('Régénérer')}
                            </button>
                            <button type="button" onClick={() => setUgcScenes((l) => l.filter((_, j) => j !== i))}
                              disabled={ugcScenes.length <= 1}
                              className="h-8 px-2.5 rounded-lg border border-red-100 text-[11px] font-semibold text-red-500 hover:bg-red-50 disabled:opacity-40">
                              <X size={11} className="inline" /> {tp('Supprimer')}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={assembleUgcFinal} disabled={ugcScenes.some((s) => s.busy)}
                className="w-full h-11 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center justify-center gap-2 hover:bg-primary-700 disabled:opacity-50">
                <Film size={15} /> {tp('Assembler la vidéo')} ({ugcScenes.length} {tp('scènes')})
              </button>
            </div>
          ) : ugcJob && ugcJob.phase !== 'error' ? (
            /* ── Génération en cours ── */
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                <Loader2 size={16} className="animate-spin text-primary" />
                {ugcJob.phase === 'scenes'
                  ? `${tp('Scènes en cours')} — ${ugcJob.done}/${ugcJob.total}`
                  : `${tp('Assemblage de la vidéo')} — ${ugcJob.progress || 0}%`}
              </p>
              {/* Pastilles par scène : faite ✓ · en cours (pulse) · à venir. */}
              {ugcJob.phase === 'scenes' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.from({ length: ugcJob.total }, (_, i) => (
                    <span key={i}
                      className={`h-7 w-7 rounded-lg text-[11px] font-bold flex items-center justify-center transition-all ${
                        i < ugcJob.done ? 'bg-primary text-white'
                          : i < ugcJob.done + 2 ? 'bg-primary/12 text-primary animate-pulse'
                            : 'bg-muted text-muted-foreground'}`}>
                      {i < ugcJob.done ? '✓' : i + 1}
                    </span>
                  ))}
                </div>
              )}
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all"
                  style={{ width: `${ugcJob.phase === 'scenes' ? Math.round((ugcJob.done / Math.max(1, ugcJob.total)) * 70) : 70 + Math.round((ugcJob.progress || 0) * 0.3)}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {ugcTalk === 'veo'
                  ? tp('Chaque scène est un clip ~10 s où ton créateur parle en français (Kling V3 Turbo). Compte 2 à 6 min par scène — garde cet onglet ouvert.')
                  : tp('Hook et CTA lip-syncés (OmniHuman), rushs + voix off pour le reste. Garde cet onglet ouvert.')}
              </p>
            </div>
          ) : (
            /* ── Réglages + bouton unique ── */
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                {characterImage && <img src={characterImage} alt="" className="h-14 w-14 rounded-xl object-cover border border-border shrink-0" />}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">{ugcScript?.hook || ugcScript?.title || tp('Script choisi')}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ugcScript?.durationSec || 45}s · {ugcScript ? buildMontageScenes(ugcScript).length : 0} {tp('plans')}
                  </p>
                </div>
              </div>
              {/* Le SCRIPT reste modifiable jusqu'au dernier moment — la
                  version éditée est celle qui est tournée. Sauvegarde auto. */}
              {ugcScript && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">{tp('Script — modifiable')}</span>
                  <textarea value={ugcScript.script || ''} rows={5}
                    onChange={(e) => setUgcScript({ ...ugcScript, script: e.target.value })}
                    className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[12.5px] leading-6 outline-none focus:border-primary/40 resize-y" />
                </div>
              )}
              {/* Mode de parole : avatar lip sync OU voix native Veo. */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">{tp('Parole du créateur')}</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['lipsync', tp('Avec avatar (lip sync)'), tp('Hook et CTA lip-syncés (OmniHuman), voix off Fish sur toute la vidéo.')],
                    ['veo', tp('Sans lip sync (Veo parle)'), tp('Chaque scène : clip ~10 s où le créateur parle en FRANÇAIS (Kling V3 Turbo 720p), monté tel quel.')],
                  ].map(([id, label, desc]) => (
                    <button key={id} type="button" onClick={() => setUgcTalk(id)}
                      className={`text-left rounded-xl border p-2.5 transition-all ${ugcTalk === id ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-card border-border hover:border-gray-300'}`}>
                      <span className={`block text-[12px] font-semibold ${ugcTalk === id ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                      <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              {ugcTalk === 'lipsync' ? (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">{tp('Voix off')}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <VoiceSelect value={ugcVoiceId} onChange={setUgcVoiceId}
                    className="h-9 max-w-[280px] rounded-xl border border-border px-2.5 text-[12.5px] outline-none focus:border-primary/40" />
                  <VoicePreviewButton voiceId={ugcVoiceId} />
                </div>
              </div>
              ) : (
              /* Moteur des scènes parlées : le découpage du script s'adapte
                 (durée du clip × débit = mots par scène). */
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">{tp('Moteur des scènes parlées')}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(TALK_ENGINES).map(([id, eng]) => (
                      <button key={id} type="button" onClick={() => setUgcEngine(id)}
                        className={`text-left rounded-xl border p-2 transition-all ${ugcEngine === id ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-card border-border hover:border-gray-300'}`}>
                        <span className={`block text-[11.5px] font-semibold ${ugcEngine === id ? 'text-foreground' : 'text-muted-foreground'}`}>{eng.label}</span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">{eng.clipSec}s / {tp('scène')}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Résolution + nombre de scènes. */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">{tp('Résolution')}</span>
                    <div className="inline-flex bg-muted rounded-xl p-1">
                      {[['480p', tp('480p · éco')], ['720p', '720p']].map(([id, label]) => (
                        <button key={id} type="button" onClick={() => setUgcRes(id)}
                          className={`h-8 px-3 rounded-lg text-[11.5px] font-bold transition-all ${ugcRes === id ? `bg-card shadow-sm ${A.text}` : 'text-muted-foreground'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">{tp('Scènes')}</span>
                    <div className="inline-flex bg-muted rounded-xl p-1 flex-wrap">
                      {['auto', 3, 4, 5, 6, 8].map((n) => (
                        <button key={n} type="button" onClick={() => setUgcSceneCount(n)}
                          className={`h-8 px-2.5 rounded-lg text-[11.5px] font-bold transition-all ${String(ugcSceneCount) === String(n) ? `bg-card shadow-sm ${A.text}` : 'text-muted-foreground'}`}>
                          {n === 'auto' ? tp('Auto') : n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Musique de fond (assemblage) — volume discret. */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground block mb-1.5">{tp('Musique de fond')}</span>
                  <select value={ugcMusicId} onChange={(e) => setUgcMusicId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-card px-2.5 text-[12.5px] outline-none focus:border-primary/40">
                    <option value="">{tp('Sans musique')}</option>
                    {musicPresets.map((p) => <option key={p.id} value={p.id}>{p.label || p.id}</option>)}
                  </select>
                </div>
                {/* B-rolls : inserts d'images qui illustrent pendant qu'il parle. */}
                <button type="button" onClick={() => setUgcBrolls(!ugcBrolls)}
                  className={`w-full text-left rounded-xl border p-2.5 transition-all flex items-center gap-2.5 ${ugcBrolls ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-card border-border hover:border-gray-300'}`}>
                  <span className={`h-5 w-9 rounded-full p-0.5 transition-colors shrink-0 ${ugcBrolls ? 'bg-primary' : 'bg-muted'}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${ugcBrolls ? 'translate-x-4' : ''}`} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-[12px] font-semibold ${ugcBrolls ? 'text-foreground' : 'text-muted-foreground'}`}>{tp('B-rolls d’illustration')}</span>
                    <span className="block text-[10px] text-muted-foreground leading-snug">{tp('Clips verticaux PLEIN ÉCRAN de 3 s (produit en action, 480p) par-dessus la parole — la voix continue en dessous.')}</span>
                  </span>
                </button>
                {ugcBrolls && (
                  <div className="pl-1 space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[11px] font-semibold text-muted-foreground">{tp('Nombre')}</span>
                      <div className="inline-flex bg-muted rounded-xl p-1">
                        {[1, 2, 3, 4].map((n) => (
                          <button key={n} type="button" onClick={() => setUgcBrollCount(n)}
                            className={`h-7 px-2.5 rounded-lg text-[11.5px] font-bold transition-all ${ugcBrollCount === n ? `bg-card shadow-sm ${A.text}` : 'text-muted-foreground'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input value={ugcBrollKeywords} onChange={(e) => setUgcBrollKeywords(e.target.value)}
                      placeholder={tp('Mots-clés (optionnel) : « collagène, douleur, peau » — l’insert tombe quand le mot est dit. Vide = auto.')}
                      className="w-full h-9 rounded-xl border border-border bg-background px-2.5 text-[12px] outline-none focus:border-primary/40" />
                  </div>
                )}
              </div>
              )}
              {ugcJob?.phase === 'error' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-3 py-2.5 text-[12.5px]">
                    <AlertCircle size={14} className="shrink-0" /> {ugcJob.error}
                  </div>
                  {/* Les scènes générées ne sont PAS perdues : retour à la revue. */}
                  {ugcScenes.length > 0 && (
                    <button type="button"
                      onClick={() => setUgcJob({ phase: 'review', done: 0, total: ugcScenes.length, progress: 0, url: '', error: '' })}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-[11.5px] font-semibold text-foreground hover:bg-background">
                      <Film size={12} /> {tp('Revenir aux scènes générées')} ({ugcScenes.length})
                    </button>
                  )}
                </div>
              )}
              <button type="button" onClick={generateUgcVideo}
                className="w-full h-11 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center justify-center gap-2 hover:bg-primary-700">
                <Wand2 size={15} /> {tp('Générer la vidéo')}
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <StudioHeader icon={Video} kind="video" title={tp('Studio Vidéo')}
        subtitle={tp('Générez une créative UGC, un avatar parlant ou un spot publicitaire à partir de votre produit.')} />

      {/* Brouillon restauré pour CE produit : le signaler + sortie explicite. */}
      {family === 'ugc' && (ugcScript || characterImage) && (
        <div className="flex items-center justify-between gap-3 max-w-2xl mb-3 rounded-xl border border-primary/20 bg-primary/10/60 px-3 py-2">
          <p className="text-[11.5px] text-gray-700 min-w-0 truncate">
            {tp('Brouillon repris pour ce produit')}{ugcScript?.hook ? ` — « ${ugcScript.hook} »` : ''}
          </p>
          <button type="button" onClick={resetUgcDraft}
            className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-card text-[11.5px] font-semibold text-foreground hover:bg-background">
            <RotateCcw size={12} /> {tp('Repartir de zéro')}
          </button>
        </div>
      )}

      {/* Famille de créative — chaque famille a sa config et son pipeline. */}
      <div className="grid grid-cols-3 gap-2.5 max-w-2xl mb-5">
        {FAMILIES.map(f => {
          const Icon = f.icon; const active = family === f.id;
          return (
            <button key={f.id} onClick={() => selectFamily(f.id)} disabled={loading}
              className={`text-left rounded-xl border p-3 transition-all disabled:opacity-50 ${active ? `${A.bg} border-transparent ring-2 ${A.ring}` : 'bg-card border-border hover:border-gray-300'}`}>
              <Icon size={16} className={active ? A.text : 'text-muted-foreground'} />
              <div className={`text-[12.5px] font-semibold mt-1.5 ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{f.label}</div>
              <p className="text-[10.5px] text-muted-foreground leading-tight">{f.desc}</p>
            </button>
          );
        })}
      </div>

      {family === 'avatar' ? (
        /* Système Avatar complet : création de l'avatar depuis le produit,
           script produit, voix Fish, qualité Standard/Premium/Cinéma. */
        <AvatarStudio importedProduct={importedProduct} onImport={onImport} onClearImport={onClearImport} />
      ) : family === 'spot' ? (
        /* LE processus du Lancement, assemblé : page produit → angles → hooks
           → script scéné complet → montage (auto ou studio). */
        <SpotAssembler importedProduct={importedProduct} onImport={onImport} onClearImport={onClearImport}
          accent={A} onSendToMontage={onSendToMontage} />
      ) : (
      <>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 mb-4 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </div>
      )}

      {false ? (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-6">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon; const done = currentStep > i + 1; const active = currentStep === i + 1;
              return (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${done ? 'bg-primary text-white' : active ? 'bg-primary/10 text-primary ring-2 ring-primary/20' : 'bg-background text-gray-300'}`}>
                      {done ? <CheckCircle size={18} /> : active ? <Loader2 size={18} className="animate-spin" /> : <StepIcon size={18} />}
                    </div>
                    <span className={`text-[11px] text-center font-medium ${active || done ? 'text-foreground' : 'text-gray-300'}`}>{step.label}</span>
                  </div>
                  {i < STEPS.length - 1 && <div className={`h-px flex-1 mb-6 ${done ? 'bg-primary/15' : 'bg-muted'}`} />}
                </React.Fragment>
              );
            })}
          </div>
          <div className="mx-auto rounded-2xl bg-background animate-pulse w-56 aspect-square" />
          <p className="text-center text-[12px] text-muted-foreground mt-4">{tp('Le rendu vidéo peut prendre 1 à 3 minutes, gardez cet onglet ouvert.')}</p>
        </div>
      ) : result && mediaUrl ? (
        <div className="bg-card rounded-3xl border border-border shadow-sm p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground"><CheckCircle size={17} className="text-primary" /> {tp('Clip généré')}</p>
            <div className="flex items-center gap-2">
              <Link to="/ecom/creatives?tab=galerie" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:opacity-80">{tp('Galerie')} <ExternalLink size={13} /></Link>
              <button onClick={reset} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-muted-foreground text-[13px] font-medium hover:bg-background"><RotateCcw size={13} /> {tp('Recommencer')}</button>
            </div>
          </div>
          <div className="flex justify-center bg-gray-900 rounded-2xl overflow-hidden">
            {isVideo
              ? <video src={result.videoUrl} controls loop playsInline poster={result.gifUrl || undefined} className="max-h-[560px] w-auto bg-black" />
              : <img src={result.gifUrl} alt="clip" className="max-h-[560px] w-auto bg-black" />}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => downloadFile(mediaUrl, `clip-${scenario}-${Date.now()}.${isVideo ? 'mp4' : 'gif'}`)} className="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-semibold flex items-center justify-center gap-2 hover:bg-primary-700">
              <Download size={15} /> {tp('Télécharger')} {isVideo ? 'MP4' : 'GIF'}
            </button>
            <button onClick={generate} className="h-11 px-4 rounded-xl border border-border text-muted-foreground text-[13px] font-medium hover:bg-background">{tp('Refaire')}</button>
          </div>
        </div>
      ) : (
        <Wizard key={family} accent={A} steps={steps} finalLabel={tp('Générer la vidéo')} busyLabel={tp('Génération en cours…')}
          onBeforeNext={() => true /* personnage par bouton ; la vidéo se génère ICI, sans Studio Montage */}
          onFinish={generateUgcVideo} loading={loading} />
      )}
      </>
      )}
    </div>
  );
};

export default VideoStudio;
