import DOMPurify from 'dompurify';

// ─── Configuration DOMPurify ──────────────────────────────────────────────────
// Autorise les balises HTML basiques pour le contenu riche (descriptions, emails, pages)
const RICH_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's', 'strike',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
    'a', 'span', 'div', 'section', 'article', 'header', 'footer',
    'img', 'figure', 'figcaption', 'picture',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'sub', 'sup', 'small', 'mark',
    // Code inséré par le marchand : embeds vidéo/iframe, médias, styles.
    // Les <script> et attributs on* restent supprimés (défaut DOMPurify).
    'iframe', 'video', 'audio', 'source', 'track', 'style', 'button'
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'style',
    'target', 'rel', 'width', 'height', 'loading',
    'colspan', 'rowspan', 'align', 'valign',
    // Attributs nécessaires aux embeds (YouTube, Vimeo…) et aux médias
    'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'referrerpolicy',
    'controls', 'controlslist', 'autoplay', 'muted', 'loop', 'playsinline',
    'poster', 'preload', 'type', 'srcset', 'sizes', 'media', 'kind', 'srclang', 'label',
    'aria-label', 'role', 'disabled'
  ],
  ALLOW_DATA_ATTR: false,
  // Forcer rel="noopener noreferrer" sur les liens externes
  ADD_ATTR: ['rel'],
  // Sans FORCE_BODY, le parseur HTML remonte les <style> en <head>
  // et ils sont perdus (seul le body est retourné).
  FORCE_BODY: true,
};

// Config stricte : texte seulement, aucune balise HTML
const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
};

// Config pour les pages de boutique (autorise plus de style inline)
const STOREFRONT_CONFIG = {
  ...RICH_CONFIG,
  ALLOWED_ATTR: [...RICH_CONFIG.ALLOWED_ATTR, 'data-id', 'data-type', 'data-section'],
};

/**
 * Nettoie du HTML riche (descriptions produits, emails, pages)
 * @param {string} html - HTML potentiellement dangereux
 * @returns {string} - HTML sécurisé
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, RICH_CONFIG);
}

/**
 * Nettoie une chaîne en supprimant tout HTML (texte brut uniquement)
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return DOMPurify.sanitize(text, PLAIN_TEXT_CONFIG);
}

/**
 * Nettoie du HTML pour les pages de boutique publique
 * @param {string} html
 * @returns {string}
 */
export function sanitizeStorefront(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, STOREFRONT_CONFIG);
}

/**
 * Helper pour utiliser avec dangerouslySetInnerHTML
 * Usage: <div {...safeHtml(content)} />
 */
export function safeHtml(html, mode = 'rich') {
  const sanitized = mode === 'storefront'
    ? sanitizeStorefront(html)
    : mode === 'text'
    ? sanitizeText(html)
    : sanitizeHtml(html);
  return { __html: sanitized };
}
