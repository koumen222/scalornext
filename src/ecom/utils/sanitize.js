import sanitize from 'sanitize-html';

// ─── Configuration du sanitizer ───────────────────────────────────────────────
// Autorise les balises HTML basiques pour le contenu riche (descriptions, emails, pages)
const RICH_CONFIG = {
  allowedTags: [
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
  allowedAttributes: {
    '*': [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'target', 'rel', 'width', 'height', 'loading',
      'colspan', 'rowspan', 'align', 'valign',
      // Attributs nécessaires aux embeds (YouTube, Vimeo…) et aux médias
      'allow', 'allowfullscreen', 'frameborder', 'scrolling', 'referrerpolicy',
      'controls', 'controlslist', 'autoplay', 'muted', 'loop', 'playsinline',
      'poster', 'preload', 'type', 'srcset', 'sizes', 'media', 'kind', 'srclang', 'label',
      'aria-label', 'role', 'disabled'
    ],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https', 'data'],
    source: ['http', 'https', 'data'],
  },
  allowProtocolRelative: true,
  // <style> est volontairement autorisé pour les blocs personnalisés des marchands.
  // <script> ne figure pas dans allowedTags et reste donc supprimé.
  allowVulnerableTags: true,
};

// Config stricte : texte seulement, aucune balise HTML
const PLAIN_TEXT_CONFIG = {
  allowedTags: [],
  allowedAttributes: {},
};

// Config pour les pages de boutique (autorise plus de style inline)
const STOREFRONT_CONFIG = {
  ...RICH_CONFIG,
  allowedAttributes: {
    '*': [
      ...RICH_CONFIG.allowedAttributes['*'],
      'data-id', 'data-type', 'data-section',
    ],
  },
};

/**
 * Nettoie du HTML riche (descriptions produits, emails, pages)
 * @param {string} html - HTML potentiellement dangereux
 * @returns {string} - HTML sécurisé
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return sanitize(html, RICH_CONFIG);
}

/**
 * Nettoie une chaîne en supprimant tout HTML (texte brut uniquement)
 * @param {string} text
 * @returns {string}
 */
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return sanitize(text, PLAIN_TEXT_CONFIG);
}

/**
 * Nettoie du HTML pour les pages de boutique publique
 * @param {string} html
 * @returns {string}
 */
export function sanitizeStorefront(html) {
  if (!html || typeof html !== 'string') return '';
  return sanitize(html, STOREFRONT_CONFIG);
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
