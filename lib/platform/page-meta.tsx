'use client';

/**
 * PlatformPageMeta — port 1:1 de App.jsx (PLATFORM_TITLE_RULES + setDocumentMeta).
 * Met à jour document.title/OG côté client à chaque navigation, comme la SPA.
 * Monté une fois dans PlatformProviders (les pages publiques ont en plus leurs
 * metadata Next côté serveur, avec des valeurs identiques).
 */

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { matchPath } from '@/lib/router-compat';
import { setDocumentMeta as setDocumentMetaJs } from '@/src/ecom/utils/pageMeta.js';

const setDocumentMeta = setDocumentMetaJs as (meta: Record<string, any>) => void;

const DEFAULT_PLATFORM_DESCRIPTION =
  'Scalor — Growth. Structure. Intelligence. The Operating System for African Ecommerce.';

// Reprises telles quelles d'App.jsx
const PLATFORM_TITLE_RULES: Array<{ path: string; title: string }> = [
  { path: '/provider', title: 'Provider' },
  { path: '/ecom/provider', title: 'Provider' },
  { path: '/ecom/landing', title: 'Accueil' },
  { path: '/ecom/why-scalor', title: 'Pourquoi Scalor ?' },
  { path: '/ecom/tarifs', title: 'Tarifs' },
  { path: '/ecom/privacy', title: 'Confidentialité' },
  { path: '/ecom/terms', title: "Conditions d'utilisation" },
  { path: '/ecom/login', title: 'Connexion' },
  { path: '/ecom/register', title: 'Inscription' },
  { path: '/ecom/forgot-password', title: 'Mot de passe oublié' },
  { path: '/ecom/reset-password', title: 'Réinitialisation du mot de passe' },
  { path: '/ecom/setup-admin', title: 'Configuration admin' },
  { path: '/ecom/workspace-setup', title: 'Configuration workspace' },
  { path: '/ecom/invite/:token', title: 'Invitation' },
  { path: '/ecom/dashboard/admin', title: 'Dashboard Admin' },
  { path: '/ecom/dashboard/closeuse', title: 'Dashboard Closeuse' },
  { path: '/ecom/dashboard/compta', title: 'Dashboard Compta' },
  { path: '/ecom/centre-controle', title: 'Centre de contrôle' },
  { path: '/ecom/products/new', title: 'Nouveau produit' },
  { path: '/ecom/products/:id/edit', title: 'Modifier le produit' },
  { path: '/ecom/products/:id', title: 'Détail produit' },
  { path: '/ecom/products', title: 'Produits' },
  { path: '/ecom/orders/:id', title: 'Détail commande' },
  { path: '/ecom/orders', title: 'Commandes' },
  { path: '/ecom/import', title: 'Import commandes' },
  { path: '/ecom/clients/new', title: 'Nouveau client' },
  { path: '/ecom/clients/:id/edit', title: 'Modifier le client' },
  { path: '/ecom/clients', title: 'Clients' },
  { path: '/ecom/stats/rapports', title: 'Rapports' },
  { path: '/ecom/reports/new', title: 'Nouveau rapport' },
  { path: '/ecom/reports/insights', title: 'Insights Rapports' },
  { path: '/ecom/reports/product/:productId', title: 'Rapport produit' },
  { path: '/ecom/reports/:id/edit', title: 'Modifier le rapport' },
  { path: '/ecom/reports/:id', title: 'Détail rapport' },
  { path: '/ecom/reports', title: 'Rapports' },
  { path: '/ecom/sourcing/stats', title: 'Statistiques sourcing' },
  { path: '/ecom/sourcing/:id', title: 'Détail fournisseur' },
  { path: '/ecom/sourcing', title: 'Sourcing' },
  { path: '/ecom/stock/orders/new', title: 'Nouvel ordre de stock' },
  { path: '/ecom/stock/orders/:id', title: 'Détail ordre de stock' },
  { path: '/ecom/stock/orders', title: 'Ordres de stock' },
  { path: '/ecom/stock-locations', title: 'Emplacements de stock' },
  { path: '/ecom/stock', title: 'Stock' },
  { path: '/ecom/transactions/new', title: 'Nouvelle transaction' },
  { path: '/ecom/transactions/:id', title: 'Détail transaction' },
  { path: '/ecom/transactions', title: 'Transactions' },
  { path: '/ecom/campaigns/new', title: 'Nouvelle campagne' },
  { path: '/ecom/campaigns/:id/edit', title: 'Modifier la campagne' },
  { path: '/ecom/campaigns/:id', title: 'Détail campagne' },
  { path: '/ecom/campaigns', title: 'Campagnes' },
  { path: '/ecom/stats', title: 'Statistiques' },
  { path: '/ecom/whatsapp-postulation', title: 'Postulation WhatsApp' },
  { path: '/ecom/whatsapp/service', title: 'Service WhatsApp' },
  { path: '/ecom/whatsapp/instances', title: 'Instances WhatsApp' },
  { path: '/ecom/whatsapp/agent-config', title: 'Configuration agent WhatsApp' },
  { path: '/ecom/whatsapp/conversations/:agentId', title: 'Conversations Rita' },
  { path: '/ecom/whatsapp/conversations', title: 'Conversations Rita' },
  { path: '/ecom/integrations/shopify', title: 'Intégration Shopify' },
  { path: '/ecom/billing/success', title: 'Paiement réussi' },
  { path: '/ecom/billing/generation-success', title: 'Crédits ajoutés' },
  { path: '/ecom/billing', title: 'Facturation' },
  { path: '/ecom/assignments', title: 'Affectations' },
  { path: '/ecom/users/team/performance', title: 'Performance équipe' },
  { path: '/ecom/users', title: 'Utilisateurs' },
  { path: '/ecom/profile', title: 'Profil' },
  { path: '/ecom/settings', title: 'Paramètres' },
  { path: '/ecom/goals', title: 'Objectifs' },
  { path: '/ecom/product-research', title: 'Recherche produits' },
  { path: '/ecom/suppliers', title: 'Fournisseurs' },
  { path: '/ecom/product-finder/:id/edit', title: 'Modifier Product Finder' },
  { path: '/ecom/product-finder', title: 'Product Finder' },
  { path: '/ecom/stats-rapports', title: 'Stats Rapports' },
  { path: '/ecom/chat', title: 'Chat équipe' },
  { path: '/ecom/marketing', title: 'Marketing' },
  { path: '/ecom/marketing/analytics', title: 'Analytics Email' },
  { path: '/ecom/marketing/campaigns/:id/results', title: 'Résultats campagne email' },
  { path: '/ecom/affiliates', title: 'Programme affiliation' },
  { path: '/affiliate/login', title: 'Connexion affilié' },
  { path: '/affiliate/register', title: 'Inscription affilié' },
  { path: '/affiliate/dashboard', title: 'Dashboard affilié' },
  { path: '/affiliate/links', title: 'Mes liens affilié' },
  { path: '/affiliate/conversions', title: 'Conversions affilié' },
  { path: '/affiliate/commissions', title: 'Commissions affilié' },
  { path: '/ecom/super-admin/users/:id', title: 'Détail utilisateur' },
  { path: '/ecom/super-admin/users', title: 'Utilisateurs super admin' },
  { path: '/ecom/super-admin/workspaces', title: 'Workspaces super admin' },
  { path: '/ecom/super-admin/analytics', title: 'Analytics super admin' },
  { path: '/ecom/super-admin/feature-analytics', title: 'Features super admin' },
  { path: '/ecom/super-admin/product-page-history', title: 'Historique pages produit' },
  { path: '/ecom/super-admin/activity', title: 'Activité super admin' },
  { path: '/ecom/super-admin/boutique-stats', title: 'Stats boutique' },
  { path: '/ecom/super-admin/settings', title: 'Paramètres super admin' },
  { path: '/ecom/super-admin/whatsapp-postulations', title: 'Postulations WhatsApp' },
  { path: '/ecom/super-admin/whatsapp-logs', title: 'Logs WhatsApp' },
  { path: '/ecom/super-admin/push', title: 'Push Center' },
  { path: '/ecom/super-admin/support', title: 'Support super admin' },
  { path: '/ecom/super-admin/billing', title: 'Facturation super admin' },
  { path: '/ecom/super-admin', title: 'Dashboard super admin' },
  { path: '/ecom/boutique/analyses', title: 'Analyses de données' },
  { path: '/ecom/boutique/wizard', title: 'Création boutique' },
  { path: '/ecom/boutique/products/new', title: 'Nouveau produit boutique' },
  { path: '/ecom/boutique/products/:id/edit', title: 'Modifier produit boutique' },
  { path: '/ecom/boutique/products', title: 'Produits boutique' },
  { path: '/ecom/boutique/orders', title: 'Commandes boutique' },
  { path: '/ecom/boutique/pixel', title: 'Pixel boutique' },
  { path: '/ecom/boutique/payments', title: 'Paiements boutique' },
  { path: '/ecom/boutique/domains', title: 'Domaines boutique' },
  { path: '/ecom/boutique/delivery-zones', title: 'Zones de livraison' },
  { path: '/ecom/boutique/page-builder', title: 'Page Builder' },
  { path: '/ecom/boutique/settings', title: 'Paramètres boutique' },
  { path: '/ecom/boutique/product-settings', title: 'Paramètres page produit' },
  { path: '/ecom/boutique/theme', title: 'Thème page produit' },
  { path: '/ecom/boutique', title: 'Boutique' },
  { path: '/ecom/developer', title: 'Développeur' },
  { path: '/ecom/agent-ia', title: 'Agents IA' },
  { path: '/ecom/agent-onboarding', title: 'Onboarding agent' },
  { path: '/ecom/rita-flows', title: 'Rita Flows' },
  { path: '/ecom/livreur/available', title: 'Disponibilité livreur' },
  { path: '/ecom/livreur/deliveries', title: 'Livraisons livreur' },
  { path: '/ecom/livreur/delivery/:id', title: 'Détail livraison' },
  { path: '/ecom/livreur/history', title: 'Historique livreur' },
  { path: '/ecom/livreur/earnings', title: 'Revenus livreur' },
  { path: '/ecom/livreur/revenus', title: 'Revenus livreur' },
  { path: '/ecom/livreur-management', title: 'Gestion livreurs' },
  { path: '/ecom/livreur', title: 'Dashboard livreur' },
];

// iso getPlatformDocumentTitle (App.jsx)
function getPlatformDocumentTitle(pathname: string): string | null {
  if (!pathname || pathname.startsWith('/store/')) return null;
  const matchedRule = PLATFORM_TITLE_RULES.find((rule) =>
    matchPath({ path: rule.path, end: true }, pathname)
  );
  if (matchedRule) return `${matchedRule.title} — Scalor`;
  if (pathname === '/' || pathname === '/ecom') return 'Scalor';
  return pathname.startsWith('/ecom/') ? 'Scalor — Plateforme e-commerce' : 'Scalor';
}

export default function PlatformPageMeta() {
  const pathname = usePathname();

  useEffect(() => {
    const title = getPlatformDocumentTitle(pathname);
    if (!title) return;
    setDocumentMeta({
      title,
      description: DEFAULT_PLATFORM_DESCRIPTION,
      image: 'https://scalor.net/icon.png',
      icon: '/icon.png',
      siteName: 'Scalor',
      appTitle: 'Scalor',
      type: 'website',
    });
  }, [pathname]);

  return null;
}
