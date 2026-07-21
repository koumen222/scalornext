// Relais léger Lancement → Montage : transmet un brouillon de montage (scènes,
// images, voix off) de façon fiable, indépendamment du cycle de vie React
// (le changement d'onglet peut remonter les composants et perdre un état local).
let pending = null;

export function stashMontageDraft(draft) {
  pending = draft ? { ...draft, _ts: Date.now() } : null;
}

// Consommation à usage unique : renvoie le brouillon puis le vide.
export function consumeMontageDraft() {
  const d = pending;
  pending = null;
  return d;
}

export function hasMontageDraft() {
  return !!pending;
}

// ── Dernier RENDU de montage : persisté en localStorage pour que la page
//    /ecom/creatives?tab=montage l'affiche tel quel, même après un changement
//    d'onglet ou un rechargement (l'état React du studio est démonté sinon). ──
const RESULT_KEY = 'scalor:lastMontageResult';

export function stashMontageResult(payload) {
  try { localStorage.setItem(RESULT_KEY, JSON.stringify({ ...payload, ts: Date.now() })); } catch { /* SSR / quota */ }
}

export function readMontageResult(maxAgeMs = 24 * 3600 * 1000) {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.url || Date.now() - (data.ts || 0) > maxAgeMs) return null;
    return data;
  } catch { return null; }
}

export function clearMontageResult() {
  try { localStorage.removeItem(RESULT_KEY); } catch { /* SSR */ }
}

// ── Réouverture d'un LANCEMENT enregistré dans le studio Lancement :
//    « Mes lancements » → clic → le studio restaure produit, angles, scripts,
//    réglages — prêt à générer les scripts d'autres hooks. ──
let pendingLaunch = null;

export function stashLaunchResume(record) {
  pendingLaunch = record ? { ...record, _ts: Date.now() } : null;
}

export function consumeLaunchResume() {
  const l = pendingLaunch;
  pendingLaunch = null;
  return l;
}

// ── Ré-édition d'un projet de montage (depuis la galerie) ──
let pendingProject = null;

export function stashMontageProject(project) {
  pendingProject = project ? { ...project, _ts: Date.now() } : null;
}

export function consumeMontageProject() {
  const p = pendingProject;
  pendingProject = null;
  return p;
}
