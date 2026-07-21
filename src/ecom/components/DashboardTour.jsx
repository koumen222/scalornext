'use client';

import React from 'react';
import GuidedTour from './GuidedTour.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// Visite guidée du dashboard admin — jouée UNE fois au premier accès (desktop).
// Ancrée sur les liens de la sidebar : aucun risque de casser si un item est
// masqué (l'étape est simplement sautée).
// Relance possible : window.dispatchEvent(new CustomEvent('scalor:start-tour',
// { detail: { tourId: 'dashboard' } }))
// ─────────────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    target: 'a[href="/ecom/boutique"]',
    title: 'Ta boutique',
    text: 'Produits, apparence, pages, paiements : tout ce qui touche à ta boutique en ligne se gère ici.',
  },
  {
    target: 'a[href="/ecom/orders"]',
    title: 'Tes commandes',
    text: 'Chaque vente arrive ici : confirme, suis la livraison et encaisse. C\'est ton poste de pilotage quotidien.',
  },
  {
    target: 'a[href="/ecom/products"]',
    title: 'Ton catalogue',
    text: 'Ajoute et organise tes produits — fiches, prix, stocks. Un bon catalogue = plus de conversions.',
  },
  {
    target: 'a[href="/ecom/creatives"]',
    title: 'Creative Center',
    text: 'Génère tes visuels publicitaires et vidéos avec l\'IA : affiches, créatives, voix off…',
  },
  {
    target: 'a[href="/ecom/montage-auto"]',
    title: 'Montage Auto',
    text: 'Uploade une vidéo brute : l\'IA coupe, sous-titre, ajoute b-rolls, musique et effets. Prête à publier.',
  },
  {
    target: 'a[href="/ecom/billing"]',
    title: 'Ton abonnement',
    text: 'Plan, crédits créatifs et factures. Tu peux monter en gamme quand ta boutique décolle. Bonne vente !',
  },
];

const DashboardTour = () => <GuidedTour tourId="dashboard" steps={STEPS} />;

export default DashboardTour;
