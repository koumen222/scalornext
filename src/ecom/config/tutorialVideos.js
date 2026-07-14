/**
 * Catalogue des vidéos tutorielles Scalor.
 *
 * ➜ Pour activer une vidéo : hébergez-la sur YouTube (non répertoriée suffit)
 *   et collez son ID dans `youtubeId` (ex. https://youtu.be/AbC123xYz → 'AbC123xYz').
 *   Tant que `youtubeId` est vide, la carte affiche « Bientôt disponible ».
 *
 * `featured: true` → mise en avant sur l'écran de fin de création de boutique.
 * Utilisé aussi comme base pour une future page d'aide vidéo.
 */

export const TUTORIAL_VIDEOS = [
  {
    key: 'add-product',
    title: 'Ajouter un nouveau produit',
    desc: 'Créer un produit : photos, prix, variantes et stock.',
    youtubeId: '',
    featured: true,
  },
  {
    key: 'generate-product-page',
    title: "Générer sa page produit avec l'IA",
    desc: 'Obtenir une page de vente complète en un clic, puis la personnaliser dans le builder.',
    youtubeId: '',
    featured: true,
  },
  {
    key: 'page-builder',
    title: 'Personnaliser sa page (builder)',
    desc: 'Sections, design, textes et images : modifier chaque bloc de la page produit.',
    youtubeId: '',
  },
  {
    key: 'homepage',
    title: "Page d'accueil de la boutique",
    desc: "Régénérer et ajuster la page d'accueil créée par l'IA.",
    youtubeId: '',
  },
  {
    key: 'orders',
    title: 'Gérer ses commandes',
    desc: 'Suivi des commandes, statuts, confirmation et livraison.',
    youtubeId: '',
  },
  {
    key: 'delivery',
    title: 'Configurer la livraison',
    desc: 'Zones, tarifs par ville et paiement à la livraison.',
    youtubeId: '',
  },
  {
    key: 'upsells',
    title: 'Upsells et offres',
    desc: "Augmenter le panier moyen : bumps, upsells et offres de sortie.",
    youtubeId: '',
  },
  {
    key: 'creatives',
    title: 'Générer des visuels publicitaires',
    desc: "Créer des créas prêtes pour Facebook/TikTok avec l'IA.",
    youtubeId: '',
  },
  {
    key: 'whatsapp',
    title: 'Vendre avec WhatsApp',
    desc: 'Connecter WhatsApp et automatiser les conversations clients.',
    youtubeId: '',
  },
];

export const FEATURED_TUTORIALS = TUTORIAL_VIDEOS.filter((v) => v.featured);
export const OTHER_TUTORIALS = TUTORIAL_VIDEOS.filter((v) => !v.featured);
