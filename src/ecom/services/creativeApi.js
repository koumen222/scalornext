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
};

// ─── Crédits ────────────────────────────────────────────────────────────────
const credits = {
  get: () => ecomApi.get('/billing/creative-credits'),
  buy: (payload) => ecomApi.post('/billing/buy-creative', payload),
  status: (token) => ecomApi.get(`/billing/generation-status/${token}`),
  history: () => ecomApi.get('/billing/history'),
  recover: () => ecomApi.post('/billing/recover-credits'),
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

const creativeApi = { credits, text, image, video, gallery, launch, montage, media, providers: CREATIVE_PROVIDERS };

export { credits as creativeCreditsApi, text as creativeTextApi, image as creativeImageApi, video as creativeVideoApi, gallery as creativeGalleryApi, launch as creativeLaunchApi, montage as creativeMontageApi, media as creativeMediaApi };
export default creativeApi;
