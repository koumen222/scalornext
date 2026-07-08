'use client';

/**
 * i18n de la PLATEFORME (admin/dashboard) — fr (défaut) / en / es.
 * Moteur : i18next + react-i18next (+ détection localStorage/navigateur).
 *
 * Pattern gettext : LA CHAÎNE FRANÇAISE EST LA CLÉ.
 *   const t = usePlatformT();
 *   t('Commandes')                → 'Orders' / 'Pedidos' / 'Commandes'
 *   t('Essai {plan}', { plan })   → interpolation {var}
 * Chaîne absente du dictionnaire → renvoyée telle quelle (fallback fr).
 * Seuls les dictionnaires en/es (fin de fichier) sont à maintenir.
 *
 * Changement de langue : setPlatformLang('en') — react-i18next re-rend
 * automatiquement tous les composants qui utilisent usePlatformT().
 * Différent de i18n/storefront.js (langue de la BOUTIQUE côté visiteurs).
 */

import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { commonEn, commonEs } from './platform-common.js';
import { generatedEn, generatedEs } from './platform-generated.js';

export const PLATFORM_LANGUAGES = [
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
];

const STORAGE_KEY = 'scalorPlatformLang';

function normalize(value) {
  const raw = String(value || '').trim().toLowerCase().slice(0, 2);
  return ['fr', 'en', 'es'].includes(raw) ? raw : 'fr';
}

// ── Initialisation (une seule fois, côté client comme SSR) ───────────────────
if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {}, // dictionnaires ajoutés plus bas (addResourceBundle)
      // SSR/hydratation : premier rendu TOUJOURS en fr (comme le serveur),
      // la langue sauvegardée est appliquée après montage via applyStoredPlatformLang().
      lng: 'fr',
      fallbackLng: 'fr',
      supportedLngs: ['fr', 'en', 'es'],
      // Clés = phrases françaises complètes : pas de séparateurs de namespace/nesting
      keySeparator: false,
      nsSeparator: false,
      // Interpolation {var} (simple accolade, cohérent avec i18n/storefront.js)
      interpolation: { prefix: '{', suffix: '}', escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: STORAGE_KEY,
        caches: ['localStorage'],
      },
      react: { useSuspense: false },
      returnEmptyString: false,
      parseMissingKeyHandler: (key) => key, // fr = la clé elle-même
      debug: false,
    });
}

export function getPlatformLang() {
  return normalize(i18n.resolvedLanguage || i18n.language);
}

export function setPlatformLang(lang) {
  const next = normalize(lang);
  i18n.changeLanguage(next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  try { document.documentElement.lang = next; } catch {}
  // Pas de reload : les layouts re-montent le contenu via key={langue},
  // ce qui réévalue aussi toutes les chaînes tp() hors hooks.
}

/**
 * tp(frenchString, vars) — traduction SANS hook (module-level), utilisée par le
 * codemod i18n sur l'ensemble des pages admin. Au changement de langue, les
 * layouts re-montent le contenu (key={langue}) → toutes les chaînes tp() se réévaluent.
 */
export function tp(key, vars) {
  return i18n.t(key, vars);
}

/**
 * À appeler une fois après montage (useEffect) : applique la langue sauvegardée.
 * Le rendu initial reste en fr pour matcher le HTML serveur (pas de mismatch d'hydratation).
 */
export function applyStoredPlatformLang() {
  try {
    const saved = normalize(localStorage.getItem(STORAGE_KEY) || 'fr');
    if (saved !== getPlatformLang()) i18n.changeLanguage(saved);
    document.documentElement.lang = saved;
  } catch {}
}

/** Hook principal : t() re-rendu automatiquement au changement de langue. */
export function usePlatformT() {
  const { t } = useTranslation();
  return t;
}

/** Langue courante, réactive. */
export function usePlatformLang() {
  const { i18n: instance } = useTranslation();
  return normalize(instance.resolvedLanguage || instance.language);
}

/** t() hors composant React (utilitaires, fonctions pures). */
export function getPlatformT() {
  return (key, vars) => i18n.t(key, vars);
}

export default i18n;

// ─── Dictionnaires en/es — clé = chaîne française exacte ─────────────────────

const en = {
  // Navigation (EcomLayout)
  'Accueil': 'Home',
  'Centre de contrôle': 'Control center',
  'Pilotage': 'Control',
  'Commandes': 'Orders',
  'Cmd': 'Orders',
  'Clients': 'Customers',
  'Produits': 'Products',
  'Sourcing': 'Sourcing',
  'Ma Boutique': 'My Store',
  'Boutique': 'Store',
  'Commissions': 'Commissions',
  'Courses dispo': 'Available runs',
  'Dispo': 'Available',
  'Mes livraisons': 'My deliveries',
  'En cours': 'In progress',
  'Historique': 'History',
  'Histo': 'History',
  'Revenus livreur': 'Courier earnings',
  'Revenus': 'Earnings',
  'Montant encaissé': 'Amount collected',
  'Encaissé': 'Collected',
  'Rapports': 'Reports',
  'Objectifs': 'Goals',
  'Buts': 'Goals',
  'Recherche Produits': 'Product research',
  'Recherche': 'Research',
  'Finances': 'Finances',
  'Gestion de stock': 'Inventory',
  'Stock': 'Stock',
  'Marketing': 'Marketing',
  'Créatives Images': 'Image creatives',
  'Créatives': 'Creatives',
  'Mes Visuels': 'My visuals',
  'Visuels': 'Visuals',
  'Service WhatsApp': 'WhatsApp service',
  'Commercial IA': 'AI sales agent',
  'Équipe': 'Team',
  'Affectations': 'Assignments',
  'API Développeur': 'Developer API',
  'Dev API': 'Dev API',
  'Formation': 'Training',
  'Abonnement': 'Subscription',
  'Plan': 'Plan',
  'Paramètres': 'Settings',
  'Réglages': 'Settings',
  // Super admin nav
  'Dashboard': 'Dashboard',
  'Service Client': 'Customer service',
  'Service': 'Service',
  'Push Center': 'Push Center',
  'Serveur mail': 'Mail server',
  'Mail': 'Mail',
  'Utilisateurs': 'Users',
  'Espaces': 'Workspaces',
  'Analytics': 'Analytics',
  'Features': 'Features',
  'Pages IA': 'AI Pages',
  'Facturation': 'Billing',
  'Gestion des plans': 'Plan management',
  'Plans': 'Plans',
  'Codes promo': 'Promo codes',
  'Promo': 'Promo',
  'Email Analytics': 'Email Analytics',
  'Email': 'Email',
  'Affiliation': 'Affiliates',
  'Affiliés': 'Affiliates',
  'WhatsApp': 'WhatsApp',
  'Support': 'Support',
  'Logs WhatsApp': 'WhatsApp logs',
  'WA Logs': 'WA logs',
  'Activité': 'Activity',
  // Rôles / plans / header
  'Admin': 'Admin',
  'Closeuse': 'Sales agent',
  'Comptabilité': 'Accounting',
  'Livreur': 'Courier',
  'Gratuit': 'Free',
  'Essai {plan}': '{plan} trial',
  'Upgrade': 'Upgrade',
  'Menu': 'Menu',
  'Messages': 'Messages',
  'Ouvrir les notifications': 'Open notifications',
  'Ouvrir le menu': 'Open menu',
  'Nouvelle notification': 'New notification',
  'Mon profil': 'My profile',
  'Déconnexion': 'Log out',
  'Se déconnecter': 'Log out',
  'Langue': 'Language',
  'Boutique bloquée': 'Store blocked',
  'Vous avez atteint la limite de {n} commandes / mois du plan Gratuit.': 'You have reached the {n} orders / month limit of the Free plan.',
  'Support rapide de notre équipe': 'Fast support from our team',
  'Astuces pour booster vos ventes': 'Tips to boost your sales',
  // Titres de pages (getPageTitle)
  'Nouveau produit boutique': 'New store product',
  'Modifier le produit boutique': 'Edit store product',
  'Produits boutique': 'Store products',
  'Commandes boutique': 'Store orders',
  'Configuration boutique': 'Store setup',
  'Nouveau produit': 'New product',
  'Modifier le produit': 'Edit product',
  'Détail du produit': 'Product detail',
  'Stats produit': 'Product stats',
  'Nouveau rapport': 'New report',
  'Modifier le rapport': 'Edit report',
  'Détail du rapport': 'Report detail',
  'Nouvelle commande': 'New order',
  'Modifier commande': 'Edit order',
  'Nouvelle transaction': 'New transaction',
  'Modifier la transaction': 'Edit transaction',
  'Détail de la commande': 'Order detail',
  'Détail du client': 'Customer detail',
  'Nouvel objectif': 'New goal',
  'Modifier l’objectif': 'Edit goal',
  "Modifier l'objectif": 'Edit goal',
  'Nouveau membre': 'New member',
  'Super Admin': 'Super Admin',
  // Dashboard admin
  'Bonjour': 'Good morning',
  'Bon après-midi': 'Good afternoon',
  'Bonsoir': 'Good evening',
  "Voici un aperçu de votre activité aujourd'hui.": "Here's an overview of your activity today.",
  "Chiffre d'affaires": 'Revenue',
  'Bénéfice net': 'Net profit',
  'Taux de livraison': 'Delivery rate',
  'Commandes livrées': 'Delivered orders',
  'Ajouter un article à votre boutique': 'Add an item to your store',
  'Créer une commande manuelle': 'Create a manual order',
  'Ajouter stock': 'Add stock',
  "Mettre à jour l'inventaire": 'Update inventory',
  "Aujourd'hui": 'Today',
  '7 derniers jours': 'Last 7 days',
  '30 derniers jours': 'Last 30 days',
  '90 derniers jours': 'Last 90 days',
  '365 derniers jours': 'Last 365 days',
  '7 jours': '7 days',
  '30 jours': '30 days',
  '90 jours': '90 days',
  '1 an': '1 year',
  'Personnaliser': 'Custom',
  'Sélectionner une période': 'Select a period',
  'Top produits': 'Top products',
  'Par nombre de ventes livrées': 'By delivered sales count',
  'Aucune donnée de vente disponible': 'No sales data available',
  'Créez des rapports pour faire remonter les produits leaders.': 'Create reports to surface your top products.',
  'Alertes stock': 'Stock alerts',
  'Produits nécessitant réapprovisionnement': 'Products needing restock',
  'Stock actuel': 'Current stock',
  'Critique': 'Critical',
  'Élevée': 'High',
  'À surveiller': 'Watch',
  'Niveau de stock': 'Stock level',
  'Produit inconnu': 'Unknown product',
  'Volume livré': 'Delivered volume',
  // Module Boutique — layout
  'Retour à Scalor': 'Back to Scalor',
  'Module Boutique': 'Store module',
  'Voir ma boutique': 'View my store',
  'Plus': 'More',
  "Plus d'options": 'More options',
  'Analyses': 'Analytics',
  'Tous les produits': 'All products',
  'Catégories': 'Categories',
  'Theme Builder': 'Theme Builder',
  'Pixel & Tracking': 'Pixel & Tracking',
  'Paiements': 'Payments',
  'Livraison': 'Delivery',
  'Domaines': 'Domains',
  'Thème & Design': 'Theme & Design',
  'Mise en page': 'Layout',
  'Couleurs': 'Colors',
  'Typographie': 'Typography',
  'Boutons & Styles': 'Buttons & Styles',
  'Éléments': 'Elements',
  'Aperçu': 'Preview',
  'Manager de formulaire': 'Form manager',
  'Créateur de formulaire': 'Form builder',
  'Offres de quantité': 'Quantity offers',
  'Upsells & Downsells': 'Upsells & Downsells',
  'Intégrations et messagerie': 'Integrations & messaging',
  'Analytique': 'Analytics',
  'Forfait': 'Plan',
  'Dashboard Boutique': 'Store Dashboard',
  'Analyses de données': 'Data analytics',
  'Modifier produit': 'Edit product',
  'Thème & Apparence': 'Theme & Appearance',
  'Pages': 'Pages',
  'Zones de livraison': 'Delivery zones',
  'Paramètres EasySell': 'EasySell settings',
  'Paramètres Page Produit': 'Product page settings',
  'Générateur de Créas': 'Creative generator',
  'Paramètres & Branding': 'Settings & Branding',
  // Dashboard Boutique
  'Visiteurs': 'Visitors',
  "{n} aujourd'hui": '{n} today',
  '{n} FCFA / commande': '{n} FCFA / order',
  '{n} livrées': '{n} delivered',
  '{n} pages vues': '{n} page views',
  'Visites': 'Visits',
  'Thème': 'Theme',
  'Campagne': 'Campaign',
  "Vue d'ensemble": 'Overview',
  'Afficher': 'Show',
  'Masquer': 'Hide',
  'Produits les plus visités': 'Most visited products',
  'Produits les plus vendus': 'Best-selling products',
  'Produits par revenu': 'Products by revenue',
  'Sans nom': 'Unnamed',
  'Communauté': 'Community',
  "Connectez-vous avec des créateurs, apprenez de nouvelles compétences et aidez à façonner l'avenir de Scalor.": 'Connect with creators, learn new skills and help shape the future of Scalor.',
  'Rejoignez-nous sur Youtube': 'Join us on Youtube',
  'Découvrez des vidéos pratiques pour apprendre à utiliser Scalor': 'Watch hands-on videos to learn how to use Scalor',
  'Rejoignez notre Hub': 'Join our Hub',
  "Rejoignez la communauté d'entraide des créateurs Scalor": 'Join the Scalor creators support community',
  'Partagez vos suggestions': 'Share your suggestions',
  'Vos suggestions nous aident à améliorer Scalor': 'Your suggestions help us improve Scalor',
  'Rejoignez-nous sur WhatsApp': 'Join us on WhatsApp',
  'Rejoignez notre canal WhatsApp': 'Join our WhatsApp channel',
  'Hier': 'Yesterday',
  'Trimestre à ce jour': 'Quarter to date',
  'Derniers': 'Last',
  'Trimestres': 'Quarters',
  'Date de début': 'Start date',
  'Date de fin': 'End date',
  'Annuler': 'Cancel',
  'Appliquer': 'Apply',
  'Janvier': 'January',
  'Février': 'February',
  'Mars': 'March',
  'Avril': 'April',
  'Mai': 'May',
  'Juin': 'June',
  'Juillet': 'July',
  'Août': 'August',
  'Septembre': 'September',
  'Octobre': 'October',
  'Novembre': 'November',
  'Décembre': 'December',
};

const es = {
  'Accueil': 'Inicio',
  'Centre de contrôle': 'Centro de control',
  'Pilotage': 'Control',
  'Commandes': 'Pedidos',
  'Cmd': 'Pedidos',
  'Clients': 'Clientes',
  'Produits': 'Productos',
  'Sourcing': 'Sourcing',
  'Ma Boutique': 'Mi Tienda',
  'Boutique': 'Tienda',
  'Commissions': 'Comisiones',
  'Courses dispo': 'Entregas disponibles',
  'Dispo': 'Disponibles',
  'Mes livraisons': 'Mis entregas',
  'En cours': 'En curso',
  'Historique': 'Historial',
  'Histo': 'Historial',
  'Revenus livreur': 'Ingresos repartidor',
  'Revenus': 'Ingresos',
  'Montant encaissé': 'Importe cobrado',
  'Encaissé': 'Cobrado',
  'Rapports': 'Informes',
  'Objectifs': 'Objetivos',
  'Buts': 'Metas',
  'Recherche Produits': 'Búsqueda de productos',
  'Recherche': 'Búsqueda',
  'Finances': 'Finanzas',
  'Gestion de stock': 'Inventario',
  'Stock': 'Stock',
  'Marketing': 'Marketing',
  'Créatives Images': 'Creatividades',
  'Créatives': 'Creatividades',
  'Mes Visuels': 'Mis visuales',
  'Visuels': 'Visuales',
  'Service WhatsApp': 'Servicio WhatsApp',
  'Commercial IA': 'Agente de ventas IA',
  'Équipe': 'Equipo',
  'Affectations': 'Asignaciones',
  'API Développeur': 'API de desarrollador',
  'Dev API': 'API Dev',
  'Formation': 'Formación',
  'Abonnement': 'Suscripción',
  'Plan': 'Plan',
  'Paramètres': 'Ajustes',
  'Réglages': 'Ajustes',
  'Dashboard': 'Panel',
  'Service Client': 'Atención al cliente',
  'Service': 'Servicio',
  'Push Center': 'Centro Push',
  'Serveur mail': 'Servidor de correo',
  'Mail': 'Correo',
  'Utilisateurs': 'Usuarios',
  'Espaces': 'Espacios',
  'Analytics': 'Analítica',
  'Features': 'Funciones',
  'Pages IA': 'Páginas IA',
  'Facturation': 'Facturación',
  'Gestion des plans': 'Gestión de planes',
  'Plans': 'Planes',
  'Codes promo': 'Códigos promo',
  'Promo': 'Promo',
  'Email Analytics': 'Analítica de email',
  'Email': 'Email',
  'Affiliation': 'Afiliados',
  'Affiliés': 'Afiliados',
  'WhatsApp': 'WhatsApp',
  'Support': 'Soporte',
  'Logs WhatsApp': 'Registros WhatsApp',
  'WA Logs': 'Logs WA',
  'Activité': 'Actividad',
  'Admin': 'Admin',
  'Closeuse': 'Agente de ventas',
  'Comptabilité': 'Contabilidad',
  'Livreur': 'Repartidor',
  'Gratuit': 'Gratis',
  'Essai {plan}': 'Prueba {plan}',
  'Upgrade': 'Mejorar',
  'Menu': 'Menú',
  'Messages': 'Mensajes',
  'Ouvrir les notifications': 'Abrir notificaciones',
  'Ouvrir le menu': 'Abrir menú',
  'Nouvelle notification': 'Nueva notificación',
  'Mon profil': 'Mi perfil',
  'Déconnexion': 'Cerrar sesión',
  'Se déconnecter': 'Cerrar sesión',
  'Langue': 'Idioma',
  'Boutique bloquée': 'Tienda bloqueada',
  'Vous avez atteint la limite de {n} commandes / mois du plan Gratuit.': 'Has alcanzado el límite de {n} pedidos / mes del plan Gratis.',
  'Support rapide de notre équipe': 'Soporte rápido de nuestro equipo',
  'Astuces pour booster vos ventes': 'Consejos para impulsar tus ventas',
  'Nouveau produit boutique': 'Nuevo producto de tienda',
  'Modifier le produit boutique': 'Editar producto de tienda',
  'Produits boutique': 'Productos de tienda',
  'Commandes boutique': 'Pedidos de tienda',
  'Configuration boutique': 'Configuración de tienda',
  'Nouveau produit': 'Nuevo producto',
  'Modifier le produit': 'Editar producto',
  'Détail du produit': 'Detalle del producto',
  'Stats produit': 'Estadísticas del producto',
  'Nouveau rapport': 'Nuevo informe',
  'Modifier le rapport': 'Editar informe',
  'Détail du rapport': 'Detalle del informe',
  'Nouvelle commande': 'Nuevo pedido',
  'Modifier commande': 'Editar pedido',
  'Nouvelle transaction': 'Nueva transacción',
  'Modifier la transaction': 'Editar transacción',
  'Détail de la commande': 'Detalle del pedido',
  'Détail du client': 'Detalle del cliente',
  'Nouvel objectif': 'Nuevo objetivo',
  "Modifier l'objectif": 'Editar objetivo',
  'Nouveau membre': 'Nuevo miembro',
  'Super Admin': 'Súper Admin',
  // Dashboard admin
  'Bonjour': 'Buenos días',
  'Bon après-midi': 'Buenas tardes',
  'Bonsoir': 'Buenas noches',
  "Voici un aperçu de votre activité aujourd'hui.": 'Aquí tienes un resumen de tu actividad de hoy.',
  "Chiffre d'affaires": 'Facturación',
  'Bénéfice net': 'Beneficio neto',
  'Taux de livraison': 'Tasa de entrega',
  'Commandes livrées': 'Pedidos entregados',
  'Ajouter un article à votre boutique': 'Añade un artículo a tu tienda',
  'Créer une commande manuelle': 'Crear un pedido manual',
  'Ajouter stock': 'Añadir stock',
  "Mettre à jour l'inventaire": 'Actualizar inventario',
  "Aujourd'hui": 'Hoy',
  '7 derniers jours': 'Últimos 7 días',
  '30 derniers jours': 'Últimos 30 días',
  '90 derniers jours': 'Últimos 90 días',
  '365 derniers jours': 'Últimos 365 días',
  '7 jours': '7 días',
  '30 jours': '30 días',
  '90 jours': '90 días',
  '1 an': '1 año',
  'Personnaliser': 'Personalizar',
  'Sélectionner une période': 'Seleccionar un período',
  'Top produits': 'Top productos',
  'Par nombre de ventes livrées': 'Por ventas entregadas',
  'Aucune donnée de vente disponible': 'Sin datos de ventas disponibles',
  'Créez des rapports pour faire remonter les produits leaders.': 'Crea informes para destacar tus productos líderes.',
  'Alertes stock': 'Alertas de stock',
  'Produits nécessitant réapprovisionnement': 'Productos que necesitan reposición',
  'Stock actuel': 'Stock actual',
  'Critique': 'Crítico',
  'Élevée': 'Alta',
  'À surveiller': 'Vigilar',
  'Niveau de stock': 'Nivel de stock',
  'Produit inconnu': 'Producto desconocido',
  'Volume livré': 'Volumen entregado',
  // Module Boutique — layout
  'Retour à Scalor': 'Volver a Scalor',
  'Module Boutique': 'Módulo Tienda',
  'Voir ma boutique': 'Ver mi tienda',
  'Plus': 'Más',
  "Plus d'options": 'Más opciones',
  'Analyses': 'Analítica',
  'Tous les produits': 'Todos los productos',
  'Catégories': 'Categorías',
  'Theme Builder': 'Theme Builder',
  'Pixel & Tracking': 'Píxel y Tracking',
  'Paiements': 'Pagos',
  'Livraison': 'Entrega',
  'Domaines': 'Dominios',
  'Thème & Design': 'Tema y Diseño',
  'Mise en page': 'Maquetación',
  'Couleurs': 'Colores',
  'Typographie': 'Tipografía',
  'Boutons & Styles': 'Botones y Estilos',
  'Éléments': 'Elementos',
  'Aperçu': 'Vista previa',
  'Manager de formulaire': 'Gestor de formularios',
  'Créateur de formulaire': 'Creador de formularios',
  'Offres de quantité': 'Ofertas por cantidad',
  'Upsells & Downsells': 'Upsells y Downsells',
  'Intégrations et messagerie': 'Integraciones y mensajería',
  'Analytique': 'Analítica',
  'Forfait': 'Plan',
  'Dashboard Boutique': 'Panel de Tienda',
  'Analyses de données': 'Análisis de datos',
  'Modifier produit': 'Editar producto',
  'Thème & Apparence': 'Tema y Apariencia',
  'Pages': 'Páginas',
  'Zones de livraison': 'Zonas de entrega',
  'Paramètres EasySell': 'Ajustes EasySell',
  'Paramètres Page Produit': 'Ajustes de página de producto',
  'Générateur de Créas': 'Generador de creatividades',
  'Paramètres & Branding': 'Ajustes y Branding',
  // Dashboard Boutique
  'Visiteurs': 'Visitantes',
  "{n} aujourd'hui": '{n} hoy',
  '{n} FCFA / commande': '{n} FCFA / pedido',
  '{n} livrées': '{n} entregados',
  '{n} pages vues': '{n} páginas vistas',
  'Visites': 'Visitas',
  'Thème': 'Tema',
  'Campagne': 'Campaña',
  "Vue d'ensemble": 'Vista general',
  'Afficher': 'Mostrar',
  'Masquer': 'Ocultar',
  'Produits les plus visités': 'Productos más visitados',
  'Produits les plus vendus': 'Productos más vendidos',
  'Produits par revenu': 'Productos por ingresos',
  'Sans nom': 'Sin nombre',
  'Communauté': 'Comunidad',
  "Connectez-vous avec des créateurs, apprenez de nouvelles compétences et aidez à façonner l'avenir de Scalor.": 'Conecta con creadores, aprende nuevas habilidades y ayuda a dar forma al futuro de Scalor.',
  'Rejoignez-nous sur Youtube': 'Únete en Youtube',
  'Découvrez des vidéos pratiques pour apprendre à utiliser Scalor': 'Descubre vídeos prácticos para aprender a usar Scalor',
  'Rejoignez notre Hub': 'Únete a nuestro Hub',
  "Rejoignez la communauté d'entraide des créateurs Scalor": 'Únete a la comunidad de creadores de Scalor',
  'Partagez vos suggestions': 'Comparte tus sugerencias',
  'Vos suggestions nous aident à améliorer Scalor': 'Tus sugerencias nos ayudan a mejorar Scalor',
  'Rejoignez-nous sur WhatsApp': 'Únete en WhatsApp',
  'Rejoignez notre canal WhatsApp': 'Únete a nuestro canal de WhatsApp',
  'Hier': 'Ayer',
  'Trimestre à ce jour': 'Trimestre hasta hoy',
  'Derniers': 'Últimos',
  'Trimestres': 'Trimestres',
  'Date de début': 'Fecha de inicio',
  'Date de fin': 'Fecha de fin',
  'Annuler': 'Cancelar',
  'Appliquer': 'Aplicar',
  'Janvier': 'Enero',
  'Février': 'Febrero',
  'Mars': 'Marzo',
  'Avril': 'Abril',
  'Mai': 'Mayo',
  'Juin': 'Junio',
  'Juillet': 'Julio',
  'Août': 'Agosto',
  'Septembre': 'Septiembre',
  'Octobre': 'Octubre',
  'Novembre': 'Noviembre',
  'Décembre': 'Diciembre',
};

// Bundle fr auto-généré (clé = valeur) : garantit l'interpolation {var} en français
// (les clés absentes de tout bundle passent par parseMissingKeyHandler SANS interpolation).
const fr = Object.fromEntries([...Object.keys(generatedEn), ...Object.keys(commonEn), ...Object.keys(en)].map((key) => [key, key]));

i18n.addResourceBundle('fr', 'translation', fr, true, true);
i18n.addResourceBundle('en', 'translation', { ...generatedEn, ...commonEn, ...en }, true, true);
i18n.addResourceBundle('es', 'translation', { ...generatedEs, ...commonEs, ...es }, true, true);
