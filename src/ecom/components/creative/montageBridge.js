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
