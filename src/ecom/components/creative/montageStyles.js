import { tp } from '../../i18n/platform.js';

// Transitions disponibles (doivent correspondre aux ids validés côté moteur ffmpeg).
// 'dynamic' : le moteur varie automatiquement la transition à chaque jonction.
export const TRANSITIONS = [
  { id: 'dynamic', label: tp('Dynamique (auto)') },
  { id: 'fade', label: tp('Fondu') },
  { id: 'fadeblack', label: tp('Fondu noir') },
  { id: 'slideleft', label: tp('Glissé ←') },
  { id: 'slideright', label: tp('Glissé →') },
  { id: 'slideup', label: tp('Glissé ↑') },
  { id: 'slidedown', label: tp('Glissé ↓') },
  { id: 'wipeleft', label: tp('Balayage ←') },
  { id: 'wiperight', label: tp('Balayage →') },
  { id: 'circleopen', label: tp('Cercle') },
  { id: 'circleclose', label: tp('Cercle inv.') },
  { id: 'radial', label: tp('Radial') },
  { id: 'dissolve', label: tp('Dissolution') },
  { id: 'pixelize', label: tp('Pixelisé') },
  { id: 'smoothleft', label: tp('Fondu glissé') },
  { id: 'none', label: tp('Coupe') },
];
export const transLabel = (id) => (TRANSITIONS.find((t) => t.id === id) || TRANSITIONS[0]).label;

// Modèles de sous-titres (ids alignés avec CAPTION_STYLES du moteur). Les couleurs
// servent uniquement à l'aperçu des pastilles côté UI.
export const CAPTION_STYLES = [
  { id: 'classic', label: tp('Classique'), text: '#FFFFFF', bg: 'transparent', ring: '#111827' },
  { id: 'yellow', label: tp('Jaune'), text: '#FFE000', bg: 'transparent', ring: '#111827' },
  { id: 'duo_yellow', label: tp('Blanc + jaune'), text: '#FFE000', bg: 'transparent', ring: '#111827' },
  { id: 'cyan', label: tp('Cyan'), text: '#22D3EE', bg: 'transparent', ring: '#111827' },
  { id: 'pink', label: tp('Rose'), text: '#FF69B4', bg: 'transparent', ring: '#111827' },
  { id: 'green', label: tp('Vert'), text: '#0F6B4F', bg: 'transparent', ring: '#111827' },
  { id: 'boxed', label: tp('Blanc gras'), text: '#FFFFFF', bg: 'transparent', ring: '#111827' },
  { id: 'boxed_yellow', label: tp('Jaune gras'), text: '#FFE000', bg: 'transparent', ring: '#111827' },
  { id: 'neon', label: tp('Néon cyan'), text: '#67E8F9', bg: 'transparent', ring: '#0891B2' },
  { id: 'neon_pink', label: tp('Néon rose'), text: '#F9A8D4', bg: 'transparent', ring: '#DB2777' },
  { id: 'neon_violet', label: tp('Néon violet'), text: '#C4B5FD', bg: 'transparent', ring: '#7C3AED' },
  { id: 'box_black', label: tp('Boîte noire'), text: '#FFFFFF', bg: '#111111', ring: '#111827' },
  { id: 'box_white', label: tp('Boîte blanche'), text: '#111111', bg: '#FFFFFF', ring: '#9CA3AF' },
  { id: 'box_red', label: tp('Boîte rouge'), text: '#FFFFFF', bg: '#DC2626', ring: '#991B1B' },
];
export const captionColor = (id) => (CAPTION_STYLES.find((s) => s.id === id) || CAPTION_STYLES[0]);

// Positions verticales des sous-titres (rendu moteur : alignement ASS).
export const CAPTION_POSITIONS = [
  { id: 'top', label: tp('Haut') },
  { id: 'middle', label: tp('Centré') },
  { id: 'bottom', label: tp('Bas') },
];

// Polices embarquées côté moteur (assets/fonts). css = approximation d'aperçu.
export const CAPTION_FONTS = [
  { id: 'sans', label: tp('Moderne (Sans)'), css: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'condensed', label: tp('Condensée'), css: '"Arial Narrow", ui-sans-serif, sans-serif' },
  { id: 'serif', label: tp('Élégante (Serif)'), css: 'Georgia, ui-serif, serif' },
  { id: 'serif2', label: tp('Journal (Serif fine)'), css: '"Times New Roman", ui-serif, serif' },
  { id: 'mono', label: tp('Machine (Mono)'), css: 'ui-monospace, Menlo, monospace' },
];
export const captionFontCss = (id) => (CAPTION_FONTS.find((f) => f.id === id) || CAPTION_FONTS[0]).css;

// Accents visuels (annotations d'expert) — ids alignés avec le moteur ffmpeg.
// Chaque accent correspond à une situation : croix/alerte sur le problème,
// coche sur le bénéfice validé, étoile sur la preuve sociale, cercle/flèche
// pour pointer un détail, cœur sur l'émotion.
export const ACCENT_SHAPES = [
  { id: 'ring', label: tp('Cercle'), ch: '◯', color: '#E12338' },
  { id: 'arrow', label: tp('Flèche'), ch: '→', color: '#0F6B4F' },
  { id: 'check', label: tp('Coche'), ch: '✔', color: '#0F6B4F' },
  { id: 'cross', label: tp('Croix'), ch: '✘', color: '#EF4444' },
  { id: 'star', label: tp('Étoile'), ch: '★', color: '#0F6B4F' },
  { id: 'warning', label: tp('Alerte'), ch: '⚠', color: '#0F6B4F' },
  { id: 'heart', label: tp('Cœur'), ch: '♥', color: '#0F6B4F' },
];
export const accentShape = (id) => ACCENT_SHAPES.find((a) => a.id === id) || null;

// Animations de sous-titres (façon CapCut).
export const CAPTION_ANIMS = [
  { id: 'pop', label: tp('Pop') },
  { id: 'fade', label: tp('Fondu') },
  { id: 'zoom', label: tp('Zoom') },
  { id: 'bounce', label: tp('Rebond') },
  { id: 'typewriter', label: tp('Machine à écrire') },
  { id: 'reveal', label: tp('Révélation') },
];
