import ecomApi from './ecommApi.js';

/**
 * Creative Center — service API centralisé.
 * Regroupe les 3 moteurs de génération et la bibliothèque :
 *   • Texte  → DeepSeek        (POST /ai/creative-text)          [synchrone]
 *   • Image  → GPT Image       (POST /ai/creative-generator)     [job async]
 *   • Vidéo  → Grok / Kie AI   (POST /ai/creative-video)         [job async]
 *   • Galerie / Crédits        (endpoints existants réutilisés)
 *
 * Le backend (api.scalor.net) n'est PAS modifié : ce module ne fait que
 * définir le contrat d'appel côté front. Les endpoints image + galerie +
 * crédits existent déjà ; texte + vidéo suivent la même convention REST.
 */

// ─── Providers (affichage / badges) ────────────────────────────────────────
export const CREATIVE_PROVIDERS = {
  text: { id: 'deepseek', label: 'DeepSeek', kind: 'text' },
  image: { id: 'gpt-image-2', label: 'GPT Image 2', kind: 'image' },
  video: { id: 'grok', label: 'Grok · Kie AI', kind: 'video' },
  voice: { id: 'fish-audio', label: 'Fish Audio', kind: 'voice' },
};

// ─── Crédits ────────────────────────────────────────────────────────────────
const credits = {
  get: () => ecomApi.get('/billing/creative-credits'),
  buy: (payload) => ecomApi.post('/billing/buy-creative', payload),
  status: (token) => ecomApi.get(`/billing/generation-status/${token}`),
  history: () => ecomApi.get('/billing/history'),
  recover: () => ecomApi.post('/billing/recover-credits'),
  /** Grille tarifaire (crédits par fonctionnalité) → { pricePerCreditFcfa, features } */
  pricing: () => ecomApi.get('/billing/creative-pricing', { timeout: 15000 }),
};

// ─── Texte — DeepSeek via l'endpoint copywriting existant ───────────────────
// Réutilise /builder-ai/generate-text (déjà en production, back DeepSeek).
// Contrat : { purpose, context, instruction, maxWords, format } → { success, text }.
// Le studio orchestre 1 appel (formats longs) ou N appels parallèles (variantes).
const text = {
  /** @param {{purpose:string, context:string, instruction:string, maxWords?:number, format?:string}} payload */
  generateOne: (payload) =>
    ecomApi.post('/builder-ai/generate-text', payload, { timeout: 120000 }),

  // Persistance galerie texte (optionnelle — sans effet tant que la route backend n'existe pas)
  save: (payload) => ecomApi.post('/ai/creative-text/save', payload),
};

// ─── Image — GPT Image (job async, endpoint existant) ───────────────────────
const image = {
  /** @param {FormData} formData productImage?, logoImage?, url?, description?, visualTemplate, quality, formats */
  generate: (formData, config = {}) =>
    ecomApi.post('/ai/creative-generator', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
      ...config,
    }),

  job: (jobId) => ecomApi.get(`/ai/creative-generator/jobs/${jobId}`, { timeout: 15000 }),

  /** Génération/édition d'image simple via gpt-image (sourceUrl = référence
   *  exacte, ex. photo produit) → { success, url }. Utilisé par l'Avatar
   *  parlant pour créer le personnage produit en main. */
  simple: (payload) => ecomApi.post('/builder-ai/generate-image', payload, { timeout: 150000 }),
};

// ─── Vidéo — Grok Imagine via kie.ai (endpoint existant /builder-ai/generate-gif) ──
// Mode 'scene' = image-to-video : à partir d'une photo produit, réalise un clip
// court MUET (sans texte incrusté). Synchrone — peut prendre 1 à 3 minutes.
// Payload : { mode:'scene', scenario, prompt, sourceUrl, subject, productContext, durationSec }
// Réponse : { success, url (gif), videoUrl (mp4) }
const video = {
  generateScene: (payload) =>
    ecomApi.post('/builder-ai/generate-gif', payload, { timeout: 600000 }),
};

// ─── Galerie unifiée (images + vidéos + textes) ─────────────────────────────
const gallery = {
  /** @param {{page?:number, limit?:number, type?:'all'|'image'|'video'|'text'|'audio'}} params */
  list: (params = {}) =>
    ecomApi.get('/ai/creative-generator/gallery', { params }),

  remove: (id) => ecomApi.delete(`/ai/creative-generator/gallery/${id}`),

  /** Enregistre un contenu (texte/audio/image/vidéo) dans la galerie. */
  save: (payload) => ecomApi.post('/ai/creative-generator/asset', payload),
  saveMany: (items) => ecomApi.post('/ai/creative-generator/assets', { items }),
};

// ─── Lancement produit — kit marketing + voix-off (endpoints /builder-ai) ────
const launch = {
  /** @param {{productName, description?, url?, language?, tone?, angleCount?, scriptCount?}} p */
  kit: (payload) => ecomApi.post('/builder-ai/launch-kit', payload, { timeout: 180000 }),
  /** @param {{text, referenceId?}} p → { success, url } */
  voiceover: (payload) => ecomApi.post('/builder-ai/voiceover', payload, { timeout: 130000 }),
};

// ─── Voix — synthèse vocale (Fish Audio, endpoint /builder-ai/voiceover) ─────
// Moteur TTS du Studio Voix. Contrat garanti côté backend : { text, referenceId }.
// Les champs de réglage (speed, language, stability, similarity, style, format)
// sont transmis en option ; le backend les ignore tant qu'ils ne sont pas gérés,
// sans casser la génération. Réponse : { success, url } (fichier MP3 distant).
const voice = {
  /** @param {{text:string, referenceId?:string, speed?:number, language?:string,
   *           stability?:number, similarity?:number, style?:number, format?:string}} payload */
  generate: (payload) =>
    ecomApi.post('/builder-ai/voiceover', payload, { timeout: 130000 }),

  /** Catalogue de voix Fish Audio (proxy backend).
   *  @param {{q?:string, language?:string, sort?:'score'|'task_count'|'created_at',
   *           self?:boolean, page?:number, pageSize?:number}} params
   *  → { success, total, page, pageSize, voices:[{ id, title, languages, tags, cover, sampleUrl, ... }] } */
  list: (params = {}) =>
    ecomApi.get('/builder-ai/voices', { params, timeout: 25000 }),
};

// ─── Montage vidéo créatif (timeline) — assemblage clips + voix off (job async) ──
// create() rend { jobId }; on interroge job(id) jusqu'à status 'done' (url MP4) ou 'error'.
const montage = {
  /** @param {{format:'9:16'|'1:1'|'16:9', subtitles?:boolean, musicUrl?:string, musicVolume?:number,
   *           scenes:[{videoUrl, audioUrl?, durationSec?, subtitleText?}]}} spec */
  create: (spec) => ecomApi.post('/builder-ai/montage', spec, { timeout: 30000 }),
  // 404 accepté comme réponse normale du poll (job pas encore visible / perdu) :
  // pas d'exception, pas de log d'erreur console — le studio gère le cas lui-même.
  job: (jobId) => ecomApi.get(`/builder-ai/montage/jobs/${jobId}`, {
    timeout: 15000,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
  }),
  /** Fonds sonores prédéfinis → { success, presets:[{id,label,url}] } */
  presets: () => ecomApi.get('/builder-ai/music-presets', { timeout: 60000 }),
  /** Directeur de montage IA : toutes les décisions d'expert → { success, plan } */
  director: (payload) => ecomApi.post('/builder-ai/montage-director', payload, { timeout: 90000 }),
  /** « Générer une scène » : instruction libre (« un CTA », « un hook »…) →
   *  { success, scene:{ role, voiceText, subtitleText, clipPrompt, media, showProduct } } */
  sceneBrief: (payload) => ecomApi.post('/builder-ai/scene-brief', payload, { timeout: 90000 }),
};

// ─── Clonage de page produit concurrent (scrape + réécriture + images IA) ────
const clone = {
  /** @param {{url:string, maxImages?:number}} payload → { jobId } */
  create: (payload) => ecomApi.post('/builder-ai/clone-product-page', payload, { timeout: 30000 }),
  job: (jobId) => ecomApi.get(`/builder-ai/clone-product-page/jobs/${jobId}`, {
    timeout: 15000,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
  }),
  /** Persiste l'aperçu (édité) en StoreProduct (brouillon). → { productId, slug } */
  save: (product) => ecomApi.post('/builder-ai/clone-product-page/save', { product }, { timeout: 30000 }),
};

// ─── Avatar parlant (image/vidéo + voix → lip sync MuseTalk) ─────────────────
const lipsync = {
  /** @param {{imageUrl?:string, videoUrl?:string, audioUrl?:string, text?:string,
   *           voiceRefId?:string, motion?:'presenter'|'hands'|'calm', motionPrompt?:string}} payload */
  create: (payload) => ecomApi.post('/builder-ai/lipsync', payload, { timeout: 30000 }),
  job: (jobId) => ecomApi.get(`/builder-ai/lipsync/jobs/${jobId}`, {
    timeout: 15000,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
  }),
  /** Monologue de l'avatar généré depuis le produit (nom/description/photo)
   *  → { success, script } — hook → bénéfice → preuve → CTA commande+livraison. */
  script: (payload) => ecomApi.post('/builder-ai/avatar-script', payload, { timeout: 90000 }),
};

// ─── Traduction / doublage vidéo (upload marchand, job async) ────────────────
// create() rend { jobId } ; on interroge job(id) jusqu'à status 'done'
// (videoUrl MP4 doublé + srtUrl sous-titres) ou 'error'.
// Backend : POST /video-translation/translate, GET /video-translation/:jobId.
const translation = {
  /** Langues cibles + voix disponibles → { languages:[{code,name}], voices:[{id,label}] } */
  options: () => ecomApi.get('/video-translation/meta/options', { timeout: 15000 }),

  /** @param {FormData} formData  video, targetLang, voice, keepOriginalAudio, burnSubtitles → { jobId } */
  create: (formData, config = {}) =>
    ecomApi.post('/video-translation/translate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000,
      ...config,
    }),

  // 404 accepté comme réponse normale du poll (job pas encore visible / expiré).
  job: (jobId) => ecomApi.get(`/video-translation/${jobId}`, {
    timeout: 15000,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
  }),
};

// ─── Upload générique (clip vidéo / voix / musique) → { success, url, mime } ──
const media = {
  /** @param {FormData} formData  champ 'file' */
  upload: (formData, config = {}) =>
    ecomApi.post('/builder-ai/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      ...config,
    }),
};

// ─── Montage automatique IA (outil Montage Auto, séparé du Creative Center) ──
// start() rend { jobId } ; on interroge job(id) jusqu'à status 'done'
// (outputs [{format,url,durationSec}] + srtUrl) ou 'error'.
// Backend : POST /auto-montage/start, GET /auto-montage/jobs/:jobId.
const autoMontage = {
  /** Formats, styles de sous-titres, modes b-roll, coût crédits. */
  options: () => ecomApi.get('/auto-montage/meta/options', { timeout: 15000 }),

  /** @param {FormData} formData  video (+ music), formats, captionStyle, brollCount, brollMode, removeSilences → { jobId } */
  start: (formData, config = {}) =>
    ecomApi.post('/auto-montage/start', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 0,
      ...config,
    }),

  // 404 accepté comme réponse normale du poll (job pas encore visible / expiré).
  job: (jobId) => ecomApi.get(`/auto-montage/jobs/${jobId}`, {
    timeout: 15000,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
  }),
};

const creativeApi = { credits, text, image, video, voice, gallery, launch, montage, lipsync, clone, translation, media, autoMontage, providers: CREATIVE_PROVIDERS };

export { credits as creativeCreditsApi, text as creativeTextApi, image as creativeImageApi, video as creativeVideoApi, voice as creativeVoiceApi, gallery as creativeGalleryApi, launch as creativeLaunchApi, montage as creativeMontageApi, translation as creativeTranslationApi, media as creativeMediaApi, autoMontage as autoMontageApi };
export default creativeApi;
