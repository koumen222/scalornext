import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { tp } from '../i18n/platform.js';

/* ════════════════════════════════════════════════════════════════════════════
   Landing Scalor — refonte complète autour du produit réel :
   Boutique IA (créateur de site) · Creative Center (textes, affiches, vidéos,
   voix-off, stratégie Facebook Ads) · Rita agent IA WhatsApp · Commandes COD ·
   Analytics · Multi-boutiques · Formation · Programme d'affiliation intégré.
   Ancres conservées : #features #agent-ia #how-it-works #boutique-ia
   #formation #integrations #affiliation
   ════════════════════════════════════════════════════════════════════════════ */

const GREEN = '#0F6B4F';
const GREEN_DARK = '#0a5040';

// ─── Reveal au scroll ────────────────────────────────────────────────────────
const useReveal = (threshold = 0.12) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
};

const Reveal = ({ children, className = '', delay = 0, style = {} }) => {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// ─── Mot rotatif du hero ─────────────────────────────────────────────────────
const ROTATING_WORDS = ['crée ta boutique', 'crée tes publicités', 'répond à tes clients', 'gère tes commandes', 'vend pour toi'];

const RotatingText = () => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % ROTATING_WORDS.length), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-block" style={{ color: GREEN }}>
      <span key={index} className="inline-block" style={{ animation: 'landing-word-in .45s ease' }}>
        {ROTATING_WORDS[index]}
      </span>
      <style>{`@keyframes landing-word-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </span>
  );
};

// ─── Widget chat Rita (support) ──────────────────────────────────────────────
const SupportChat = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-3 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: GREEN }}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-sm font-bold">R</span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Support Scalor</p>
              <p className="text-[11px] text-white/75">Rita · Répond en quelques heures</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label={tp('Fermer')} className="ml-auto text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="p-4 space-y-3 bg-gray-50 max-h-72 overflow-y-auto">
            <div className="flex gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white text-[11px] font-bold" style={{ background: GREEN }}>R</span>
              <div className="rounded-2xl rounded-tl-md bg-white border border-gray-200 px-3 py-2 text-[13px] text-gray-700 leading-snug">
                {tp('Bonjour 👋 Bienvenue sur Scalor ! Je suis Rita, du support. Comment puis-je vous aider aujourd’hui ?')}
              </div>
            </div>
          </div>
          <a
            href="https://chat.whatsapp.com/IH3nEvfeEWrHiAnocwZTwz?mode=gi_t"
            target="_blank" rel="noreferrer"
            className="block px-4 py-3 text-center text-[13px] font-bold text-white transition hover:brightness-110"
            style={{ background: GREEN }}
          >
            {tp('Écrire au support sur WhatsApp')}
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Support Scalor"
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-105"
        style={{ background: GREEN }}
      >
        {open
          ? <span className="text-2xl leading-none">×</span>
          : <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.84L3 20l1.36-3.64A7.9 7.9 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
      </button>
    </div>
  );
};

// ─── Logos d'outils (simple-icons CDN + repli badge-lettre) ──────────────────
const TOOL_SLUGS = {
  Shopify: 'shopify', WooCommerce: 'woocommerce', WhatsApp: 'whatsapp', 'WhatsApp Business': 'whatsapp',
  'Fiverr (visuels)': 'fiverr', Fiverr: 'fiverr', 'Google Sheets': 'googlesheets',
  Klaviyo: 'klaviyo', 'Meta Ads': 'meta', Mailchimp: 'mailchimp', TikTok: 'tiktok',
  'Google Ads': 'googleads', Notion: 'notion',
  ChatGPT: 'openai', Claude: 'claude',
};

// Marques absentes de simple-icons (Canva, CapCut…) ou inconnues : favicon
// officiel du site via le service Google — logo réel, toujours disponible.
const TOOL_DOMAINS = {
  'Canva Pro': 'canva.com', Canva: 'canva.com',
  'CapCut Pro': 'capcut.com', CapCut: 'capcut.com',
  EasySell: 'easysell.co', Loox: 'loox.app',
  Shopify: 'shopify.com', WooCommerce: 'woocommerce.com',
  WhatsApp: 'whatsapp.com', 'WhatsApp Business': 'whatsapp.com',
  'Fiverr (visuels)': 'fiverr.com', Fiverr: 'fiverr.com',
  'Google Sheets': 'google.com', Klaviyo: 'klaviyo.com', 'Meta Ads': 'meta.com',
  Mailchimp: 'mailchimp.com', TikTok: 'tiktok.com', 'Google Ads': 'ads.google.com', Notion: 'notion.so',
  ChatGPT: 'openai.com', Claude: 'claude.ai',
};

const ToolLogo = ({ name, size = 16 }) => {
  // 0 = simple-icons (SVG) → 1 = favicon du site → 2 = badge-lettre
  const slug = TOOL_SLUGS[name];
  const domain = TOOL_DOMAINS[name];
  const [stage, setStage] = useState(slug ? 0 : domain ? 1 : 2);

  if (stage === 0) {
    return (
      <img
        src={`https://cdn.simpleicons.org/${slug}`}
        alt="" width={size} height={size} loading="lazy"
        onError={() => setStage(domain ? 1 : 2)}
        className="shrink-0" style={{ width: size, height: size }}
      />
    );
  }
  if (stage === 1) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt="" width={size} height={size} loading="lazy"
        onError={() => setStage(2)}
        className="shrink-0 rounded-[3px]" style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-gray-200 font-extrabold text-gray-600"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {String(name).charAt(0)}
    </span>
  );
};

// ─── Données ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    tag: 'Boutique IA', badge: null,
    title: 'Créateur de boutique IA',
    vtype: 'store',
    points: ['Page produit premium générée par IA', 'Formulaire COD, upsells et tunnel inclus', 'En ligne sur ton sous-domaine en 2 minutes'],
    desc: 'Décris ton produit : l’IA génère ta boutique complète — page produit, visuels, textes, formulaire COD — en moins de 2 minutes.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.35m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72" /></svg>,
  },
  {
    tag: 'Creative Center', badge: 'NOUVEAU',
    title: 'Studio créatif IA complet',
    vtype: 'creative',
    points: ['Affiches et vidéos générées depuis ta photo produit', 'Voix-off naturelle et montage automatique', 'Stratégie Facebook Ads calculée sur tes chiffres'],
    desc: 'Textes de vente, affiches, vidéos, voix-off, montage et stratégie Facebook Ads calculée — tout ton contenu publicitaire au même endroit.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>,
  },
  {
    tag: 'Rita IA', badge: null,
    title: 'Agent IA vendeur 24/7',
    vtype: 'chat', anchor: 'agent-ia',
    points: ['Répond à tes clients jour et nuit sur WhatsApp', 'Prend les commandes et recommande tes produits', 'Récupère les paniers abandonnés automatiquement'],
    desc: 'Rita répond à tes clients sur WhatsApp, prend les commandes et recommande tes produits automatiquement. Jour et nuit.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>,
  },
  {
    tag: 'Commandes', badge: null,
    title: 'Gestion des commandes COD',
    vtype: 'orders',
    points: ['Confirme, relance et expédie en un clic', 'Synchronisation Shopify, WooCommerce et boutiques Scalor', 'Suivi du statut jusqu’à la livraison'],
    desc: 'Confirme, relance et expédie en un clic. Synchronisation automatique depuis Shopify, WooCommerce et tes boutiques Scalor.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    tag: 'WhatsApp', badge: null,
    title: 'Ventes & relances WhatsApp',
    vtype: 'whatsapp',
    points: ['Campagnes marketing en masse', 'Relances automatiques des paniers abandonnés', 'Plus de 90% de taux d’ouverture'],
    desc: 'Confirmations, relances de paniers abandonnés et campagnes marketing avec plus de 90% de taux d’ouverture.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>,
  },
  {
    tag: 'Analytics', badge: null,
    title: 'Analyses & rapports',
    vtype: 'analytics',
    points: ['Bénéfice net réel, livraison, panier moyen', 'Tableaux de bord en temps réel', 'Export de tes rapports en un instant'],
    desc: 'Taux de livraison, bénéfice net, panier moyen — toutes tes métriques en temps réel, exportables en un instant.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
  },
  {
    tag: 'Multi-boutiques', badge: null,
    title: 'Gère tout depuis un seul endroit',
    vtype: 'stores',
    points: ['Toutes tes boutiques dans un seul dashboard', 'Statistiques consolidées multi-boutiques', 'Ajout d’une nouvelle boutique en quelques clics'],
    desc: 'Connecte Shopify, WooCommerce et tes boutiques Scalor : toutes tes ventes dans un seul tableau de bord unifié.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z" /></svg>,
  },
  {
    tag: 'Équipe', badge: null,
    title: 'Rôles & collaboration',
    vtype: 'team',
    points: ['Admins, closeuses, comptables, livreurs', 'Accès et permissions dédiés par rôle', 'Messagerie d’équipe et notifications push'],
    desc: 'Admins, closeuses, comptables, livreurs : chacun son accès dédié, avec messagerie d’équipe et notifications intégrées.',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
  },
];


const FORMATION_LESSONS = [
  'Introduction à Scalor', 'Connecter sa boutique à Scalor', 'Paramétrer sa boutique Scalor',
  'Les fonctionnalités sur Scalor', 'Créer sa boutique sur Scalor', 'Page produit — Méthode 1',
  'Formulaire & upsell', 'Automatiser son WhatsApp', 'Gérer les commandes Scalor',
  'Gestion d’équipe', 'Gérer les rapports', 'Se fixer des objectifs', 'Gestion des finances',
  'Gestion de Stock', 'Relancer les clients auto.', 'Configurer son agent IA ✦', 'Lancer sa campagne Facebook Ads',
];

const COUNTRIES = [
  ['🇨🇮', 'Côte d’Ivoire'], ['🇸🇳', 'Sénégal'], ['🇲🇱', 'Mali'], ['🇧🇫', 'Burkina Faso'],
  ['🇧🇯', 'Bénin'], ['🇹🇬', 'Togo'], ['🇬🇳', 'Guinée'], ['🇨🇲', 'Cameroun'],
  ['🇬🇦', 'Gabon'], ['🇨🇬', 'Congo'], ['🇨🇩', 'RD Congo'], ['🇲🇦', 'Maroc'],
  ['🇩🇿', 'Algérie'], ['🇹🇳', 'Tunisie'], ['🇬🇭', 'Ghana'], ['🇳🇬', 'Nigeria'],
  ['🇰🇪', 'Kenya'], ['🇹🇿', 'Tanzanie'],
];

const TESTIMONIALS = [
  ['Scalor a transformé ma gestion des commandes COD. L’interface est claire et simple. Je me concentre enfin sur la vente.', 'FB', 'Fatima B.', 'E-commerçante, Côte d’Ivoire'],
  ['Mes closers gèrent leurs commandes sans me déranger. Chacun a son accès, c’est parfait. Je recommande à 100%.', 'AM', 'Aicha M.', 'Dropshippeuse, Sénégal'],
  ['Mon taux de livraison a augmenté depuis que je track tout sur Scalor. Les stats ne mentent pas.', 'IN', 'Ibrahima N.', 'Vendeur COD, Mali'],
  ['Le Creative Center m’a fait gagner des heures : affiches, textes et vidéos prêts en quelques minutes.', 'MK', 'Moussa K.', 'Dropshipper, Cameroun'],
  ['Le support répond vite et comprend nos besoins. Ça change des autres plateformes.', 'MT', 'Mariam T.', 'Boutique en ligne, Burkina'],
  ['Je gère mes 3 boutiques depuis un seul dashboard. C’est exactement ce dont j’avais besoin pour scaler.', 'YA', 'Youssef A.', 'Multi-boutiques, Maroc'],
  ['Les relances automatiques WhatsApp m’ont fait récupérer des commandes que j’aurais perdues. Incroyable.', 'KD', 'Kofi D.', 'Vendeur COD, Ghana'],
  ['Avant Scalor je perdais 2h par jour sur des tâches manuelles. Maintenant tout est automatique.', 'AS', 'Aminata S.', 'Dropshippeuse, Guinée'],
];

const FAQ = [
  ['Scalor est-il vraiment gratuit pour commencer ?', 'Oui. Tu crées ta boutique, gères tes commandes et utilises WhatsApp sans carte bancaire. Les plans payants débloquent l’agent IA, les crédits créatifs et les fonctions avancées quand ton business grandit.'],
  ['Comment fonctionne le paiement à la livraison (COD) ?', 'Tes clients commandent sans payer en ligne : tu confirmes par WhatsApp, tu livres, tu encaisses. Scalor suit chaque étape — confirmation, expédition, livraison — et calcule ton vrai bénéfice.'],
  ['Que peut faire le Creative Center ?', 'Générer tout ton contenu de vente : angles et scripts, affiches publicitaires, vidéos avec montage et voix-off, traductions, et une stratégie Facebook Ads calculée sur tes chiffres (prix, coûts, taux de livraison).'],
  ['Rita remplace-t-elle une closeuse ?', 'Rita gère environ 80% des questions répétitives sur WhatsApp, 24h/24 : disponibilité, prix, prise de commande, suivi. Ton équipe se concentre sur les cas qui demandent un humain.'],
  ['Comment fonctionne le programme d’affiliation ?', 'Chaque compte Scalor a son lien de parrainage (menu Affiliation) : 500 F par inscription et 50% à vie sur chaque abonnement de tes filleuls, retirables par Mobile Money dès 5 000 F.'],
];

// ─── Visuels fonctionnalités : mini-démos animées en boucle (façon vidéo) ────
// Contenu calé sur le vrai produit Scalor : statuts de commande réels
// (Confirmé/Expédié/Livré/Injoignable/Reporté), agent Rita, modules du
// Creative Center (Affiches, Vidéo, Voix, Montage) + KPIs réels de la
// stratégie Ads (Marge si livrée, CPA cible, Budget test) et du dashboard
// (Bénéfice net, Taux de livraison, Panier moyen, ROAS). Devise FCFA.

const FV_KEYFRAMES = `
@keyframes fv-blink { 0%, 80%, 100% { opacity: .25; } 40% { opacity: 1; } }
@keyframes fv-wave { 0%, 100% { transform: scaleY(.4); } 50% { transform: scaleY(1); } }
@keyframes fv-shimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
@keyframes fv-pop-in { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes fv-progress { from { width: 0%; } to { width: 100%; } }
`;

// Lecture/pause selon la visibilité réelle (la démo ne tourne qu'à l'écran)
const useLoopInView = (threshold = 0.3) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
};

// Machine à étapes : 0 → count-1 puis recommence (la timeline de la vidéo)
const useSceneStep = (count, stepMs, active) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    setStep(0);
    const id = setInterval(() => setStep((s) => (s + 1) % count), stepMs);
    return () => clearInterval(id);
  }, [active, count, stepMs]);
  return step;
};

// Élément de scène qui apparaît à partir d'une étape (l'espace reste réservé,
// donc aucun saut de mise en page pendant la lecture)
const Pop = ({ show, delay = 0, from = 'up', className = '', style = {}, children }) => {
  const hidden = from === 'left' ? 'translateX(-14px)' : from === 'right' ? 'translateX(14px)' : 'translateY(10px) scale(.97)';
  return (
    <div
      className={className}
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'translate(0) scale(1)' : hidden,
        transition: `opacity .38s ease ${show ? delay : 0}ms, transform .38s ease ${show ? delay : 0}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const TypingDots = () => (
  <span className="inline-flex items-center gap-1 px-1 py-0.5">
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-1.5 w-1.5 rounded-full bg-gray-400" style={{ animation: `fv-blink 1s ease ${i * 0.16}s infinite` }} />
    ))}
  </span>
);

const Shimmer = () => (
  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
    <span className="absolute inset-y-0 left-0 w-1/2" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)', animation: 'fv-shimmer 1.1s linear infinite' }} />
  </span>
);

// Cadre commun : observer + barre de progression façon lecteur vidéo
const SceneFrame = ({ steps, stepMs = 1000, render }) => {
  const [ref, inView] = useLoopInView();
  const step = useSceneStep(steps, stepMs, inView);
  return (
    <div ref={ref} className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {render(step)}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gray-100">
        <div className="h-full rounded-r-full" style={{ background: GREEN, width: 0, animation: inView ? `fv-progress ${steps * stepMs}ms linear infinite` : 'none' }} />
      </div>
    </div>
  );
};

// 1. Créateur de boutique IA — page produit COD générée depuis un prompt
const StoreScene = () => (
  <SceneFrame steps={8} stepMs={1000} render={(s) => (
    <div>
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-green-300" />
        <span className="ml-2 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-gray-400">zenda.scalor.net</span>
      </div>
      <div className="p-4 pb-5">
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[11px] font-bold text-gray-600">
          <span style={{ color: GREEN }}>✦</span>
          <span>« Montre connectée, 15 900 F »</span>
          {s === 0
            ? <TypingDots />
            : <span key="ok" className="ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-extrabold text-white" style={{ background: GREEN, animation: 'fv-pop-in .3s ease' }}>IA ✓</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Pop show={s >= 1}>
            <div className="relative aspect-square rounded-xl" style={{ background: 'linear-gradient(135deg,#e8f3ee,#cfe8dd)' }}>
              {s === 1 && <Shimmer />}
            </div>
          </Pop>
          <div className="space-y-2">
            <Pop show={s >= 2}><div className="h-3.5 w-11/12 rounded bg-gray-200" /></Pop>
            <Pop show={s >= 2} delay={90}><div className="h-3.5 w-3/4 rounded bg-gray-100" /></Pop>
            <Pop show={s >= 3}><div className="flex h-5 w-24 items-center justify-center rounded-md text-[9.5px] font-extrabold text-amber-800" style={{ background: '#fde68a' }}>15 900 F</div></Pop>
            <Pop show={s >= 4}><div className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[9px] font-bold text-gray-500">Nom · Téléphone · Ville — paiement à la livraison</div></Pop>
            <Pop show={s >= 5}><div className="flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-[9px] font-bold" style={{ color: GREEN }}>+ Upsell : 2 montres −10%</div></Pop>
          </div>
        </div>
        <Pop show={s >= 5} className="mt-3">
          <div className="flex h-9 items-center justify-center rounded-xl text-[11px] font-extrabold text-white" style={{ background: GREEN }}>Commander — paiement à la livraison</div>
        </Pop>
        <Pop show={s >= 6} className="mt-3">
          <div className="rounded-xl px-3 py-2 text-center text-[11px] font-extrabold text-white" style={{ background: GREEN }}>✓ En ligne sur ton sous-domaine · formulaire COD + upsells</div>
        </Pop>
      </div>
    </div>
  )} />
);

// 2. Creative Center — Affiche, Vidéo, Voix, puis Stratégie Ads (KPIs réels)
const CreativeScene = () => (
  <SceneFrame steps={8} stepMs={1050} render={(s) => (
    <div className="p-4 pb-5">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-extrabold text-gray-600">📸 Photo produit</span>
        <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white" style={{ background: GREEN }}>{s === 0 ? 'Génération…' : '5 angles · 3 hooks'}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Pop show={s >= 1}>
          <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-xl p-3 text-white" style={{ background: `linear-gradient(160deg,${GREEN},${GREEN_DARK})` }}>
            {s === 1 && <Shimmer />}
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/70">Affiche IA</span>
            <div>
              <div className="h-2.5 w-4/5 rounded bg-white/70" />
              <div className="mt-1.5 h-2.5 w-3/5 rounded bg-white/40" />
              {s >= 2 && <span key="ready" className="mt-2 inline-block rounded-md bg-white/90 px-1.5 py-0.5 text-[9px] font-extrabold" style={{ color: GREEN, animation: 'fv-pop-in .3s ease' }}>Prête ✓</span>}
            </div>
          </div>
        </Pop>
        <div className="space-y-3">
          <Pop show={s >= 3}>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-gray-900">
              {s === 3 && <Shimmer />}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[11px] font-black" style={{ color: GREEN }}>▶</span>
              <span className="absolute bottom-1.5 left-2 text-[8.5px] font-bold text-white/70">Montage auto</span>
              <span className="absolute bottom-1.5 right-2 text-[8.5px] font-bold text-white/70">0:18</span>
            </div>
          </Pop>
          <Pop show={s >= 4}>
            <div className="rounded-xl border border-gray-200 p-2.5">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-gray-400">Voix-off</span>
              <div className="mt-1.5 flex items-end gap-0.5">
                {[6, 12, 9, 16, 7, 14, 10, 18, 8, 13, 6, 11].map((h, i) => (
                  <span key={i} className="w-1.5 origin-bottom rounded-full" style={{ height: h, background: GREEN, opacity: 0.45 + (i % 3) * 0.2, animation: s >= 4 ? `fv-wave .9s ease ${i * 0.07}s infinite` : 'none' }} />
                ))}
              </div>
            </div>
          </Pop>
        </div>
      </div>
      <Pop show={s >= 5} className="mt-3">
        <div className="rounded-xl border border-gray-200 p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-gray-600">📊 Stratégie Facebook Ads</span>
            <span className="rounded-md px-1.5 py-0.5 text-[9px] font-extrabold text-white" style={{ background: GREEN }}>calculée</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[['Marge si livrée', '7 500 F'], ['CPA cible max', '2 600 F'], ['Budget test', '7 800 F/j']].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-gray-50 p-1.5 text-center">
                <p className="text-[7.5px] font-extrabold uppercase tracking-wide text-gray-400">{k}</p>
                <p className="text-[10.5px] font-extrabold" style={{ color: GREEN }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Pop>
    </div>
  )} />
);

// 3. Rita — agent WhatsApp : recommande, rassure, prend la commande, relance
const ChatScene = () => (
  <SceneFrame steps={9} stepMs={1000} render={(s) => (
    <div>
      <div className="flex items-center gap-2.5 px-4 py-3 text-white" style={{ background: GREEN }}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[12px] font-bold">R</span>
        <div><p className="text-[12.5px] font-bold leading-none">Rita · Agent IA</p><p className="mt-1 text-[10px] text-white/70">{s === 2 || s === 5 ? 'écrit…' : 'WhatsApp · répond 24/7'}</p></div>
      </div>
      <div className="space-y-2 bg-gray-50 p-4 pb-5" style={{ minHeight: 186 }}>
        <Pop show={s >= 1} from="right" className="ml-auto w-fit max-w-[78%]"><div className="rounded-2xl rounded-br-md bg-gray-200 px-3 py-1.5 text-[12px]">Bonjour, la montre est encore dispo ?</div></Pop>
        <Pop show={s >= 2} from="left" className="w-fit max-w-[88%]">
          <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-1.5 text-[12px]">
            {s <= 2 ? <TypingDots /> : 'Oui 😊 En stock. Avec le pack 2 montres à −10%, c\'est notre meilleure vente. Je vous réserve laquelle ?'}
          </div>
        </Pop>
        <Pop show={s >= 4} from="right" className="ml-auto w-fit max-w-[78%]"><div className="rounded-2xl rounded-br-md bg-gray-200 px-3 py-1.5 text-[12px]">Le pack, livraison Douala Akwa</div></Pop>
        <Pop show={s >= 5} from="left" className="w-fit max-w-[88%]">
          <div className="rounded-2xl rounded-bl-md border border-gray-200 bg-white px-3 py-1.5 text-[12px]">
            {s <= 5 ? <TypingDots /> : '✅ C\'est noté Aminata ! Livraison demain à Akwa, paiement à la réception.'}
          </div>
        </Pop>
        <Pop show={s >= 7}><div className="mx-auto w-fit rounded-full px-3 py-1 text-[10px] font-extrabold text-white" style={{ background: GREEN }}>Commande #2851 créée automatiquement par Rita</div></Pop>
      </div>
    </div>
  )} />
);

// 4. Commandes COD — statuts réels ; l'injoignable est relancé puis confirmé
const OrdersScene = () => {
  const rows = [
    ['#2851', 'Aminata · Douala', 'Confirmé', '#e8f3ee', GREEN],
    ['#2850', 'Paul · Yaoundé', 'Expédié', '#fef3c7', '#b45309'],
    ['#2849', 'Fatou · Bafoussam', 'Livré', '#e8f3ee', GREEN],
  ];
  return (
    <SceneFrame steps={8} stepMs={1000} render={(s) => (
      <div className="p-3 pb-4">
        <div className="flex items-center justify-between px-1.5 pb-2">
          <span className="text-[11px] font-extrabold text-gray-700">Commandes du jour</span>
          <span key={s >= 6 ? 'b' : 'a'} className="rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold text-white" style={{ background: GREEN, animation: 'fv-pop-in .3s ease' }}>{s >= 6 ? '+19' : '+18'}</span>
        </div>
        <div className="space-y-1.5">
          {rows.map(([id, name, st, bg, color], i) => (
            <Pop key={id} show={s >= i + 1} from="right">
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                <span className="text-[11px] font-bold text-gray-700">{id} <span className="ml-1 font-medium text-gray-400">{name}</span></span>
                <span className="rounded-full px-2 py-0.5 text-[9.5px] font-extrabold" style={{ background: bg, color }}>{st}</span>
              </div>
            </Pop>
          ))}
          <Pop show={s >= 4} from="right">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
              <span className="text-[11px] font-bold text-gray-700">#2848 <span className="ml-1 font-medium text-gray-400">Yann · Garoua</span></span>
              <span key={s >= 5 ? 'ok' : 'todo'} className="rounded-full px-2 py-0.5 text-[9.5px] font-extrabold" style={{ background: s >= 5 ? '#e8f3ee' : '#f3f4f6', color: s >= 5 ? GREEN : '#6b7280', animation: 'fv-pop-in .3s ease' }}>{s >= 5 ? 'Confirmé' : 'Injoignable'}</span>
            </div>
          </Pop>
          <Pop show={s >= 6}>
            <div className="rounded-xl px-3 py-2 text-[10.5px] font-extrabold" style={{ background: '#e8f3ee', color: GREEN }}>⚡ Relance WhatsApp automatique → commande confirmée</div>
          </Pop>
        </div>
      </div>
    )} />
  );
};

// 5. Relances & diffusions WhatsApp — campagne « Relance injoignables »
const WhatsappScene = () => (
  <SceneFrame steps={9} stepMs={1000} render={(s) => {
    const send = s >= 3 ? 100 : s === 2 ? 70 : s === 1 ? 35 : 0;
    const sent = s >= 3 ? '2 400' : s === 2 ? '1 680' : s === 1 ? '840' : '0';
    const stats = [['Ouvertures', 94, 4], ['Réponses', 43, 5], ['Commandes confirmées', 21, 6]];
    return (
      <div className="space-y-3 p-4 pb-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-gray-700">Campagne « Relance injoignables »</span>
          <span key={s >= 3 ? 'sent' : s >= 1 ? 'sending' : 'ready'} className={`rounded-full px-2 py-0.5 text-[9.5px] font-extrabold ${s >= 3 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`} style={{ animation: 'fv-pop-in .3s ease' }}>
            {s >= 3 ? 'Envoyée' : s >= 1 ? 'En cours' : 'Prête'}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between text-[10.5px] font-bold text-gray-500"><span>Clients ciblés</span><span style={{ color: GREEN }}>{sent} / 2 400</span></div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full" style={{ width: `${send}%`, background: GREEN, transition: 'width .85s ease' }} /></div>
        </div>
        {stats.map(([label, val, at]) => (
          <div key={label}>
            <div className="flex items-center justify-between text-[10.5px] font-bold text-gray-500"><span>{label}</span><span style={{ color: GREEN }}>{s >= at ? `${val}%` : '—'}</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full" style={{ width: s >= at ? `${val}%` : '0%', background: GREEN, transition: 'width .85s ease' }} /></div>
          </div>
        ))}
        <Pop show={s >= 7}>
          <div className="rounded-xl px-3 py-2 text-center text-[11px] font-extrabold" style={{ background: '#e8f3ee', color: GREEN }}>21% des injoignables reconvertis 🎉</div>
        </Pop>
      </div>
    );
  }} />
);

// 6. Analyses & rapports — KPIs réels du dashboard (bénéfice net, livraison, ROAS)
const AnalyticsScene = () => {
  const bars = [34, 52, 41, 66, 58, 80, 72];
  return (
    <SceneFrame steps={7} stepMs={1050} render={(s) => (
      <div className="p-4 pb-5">
        <div className="flex items-center gap-2">
          {[['Bénéfice net', '486 000 F'], ['Taux livraison', '62%'], ['Panier moyen', '12 500 F']].map(([k, v], i) => (
            <Pop key={k} show delay={i * 110} className="flex-1">
              <div className="rounded-xl bg-gray-50 p-2">
                <p className="text-[8.5px] font-extrabold uppercase tracking-wide text-gray-400">{k}</p>
                <p className="text-[12px] font-extrabold" style={{ color: GREEN }}>{s >= 2 ? v : '…'}</p>
              </div>
            </Pop>
          ))}
        </div>
        <div className="mt-3 flex h-24 items-end gap-2">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-md" style={{ height: s >= 1 ? `${h}%` : '4%', background: GREEN, opacity: 0.35 + h / 160, transition: `height .7s ease ${i * 90}ms` }} />
          ))}
        </div>
        <Pop show={s >= 3} className="mt-3">
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
            <span className="text-[10.5px] font-extrabold text-gray-600">📈 ROAS (retour sur pub)</span>
            <span className="rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold text-white" style={{ background: GREEN }}>3,4×</span>
          </div>
        </Pop>
        <Pop show={s >= 4} className="mt-2">
          <div className="rounded-xl px-3 py-1.5 text-center text-[10.5px] font-extrabold" style={{ background: '#e8f3ee', color: GREEN }}>Rapport exporté ✓</div>
        </Pop>
      </div>
    )} />
  );
};

// 7. Multi-boutiques — Shopify, WooCommerce, Scalor consolidés
const StoresScene = () => (
  <SceneFrame steps={7} stepMs={1000} render={(s) => (
    <div className="p-4 pb-5">
      {[['Boutique Cosmétiques', 'Shopify', '324 000 F'], ['Boutique Gadgets', 'Scalor', '512 000 F'], ['Boutique Mode', 'WooCommerce', '298 000 F']].map(([name, src, ca], i) => (
        <Pop key={name} show={s >= i} from="right" className="mb-2">
          <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <span className="flex items-center gap-2 text-[11.5px] font-extrabold text-gray-700">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] text-white" style={{ background: GREEN, opacity: 1 - i * 0.2 }}>🛍️</span>
              <span>{name}<span className="ml-1.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-[8.5px] font-extrabold text-gray-500">{src}</span></span>
            </span>
            <span className="text-[10.5px] font-extrabold" style={{ color: GREEN }}>{s >= 4 ? ca : '…'}</span>
          </div>
        </Pop>
      ))}
      <Pop show={s >= 3}>
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 p-2.5 text-[10.5px] font-extrabold text-gray-400">+ Connecter une boutique</div>
      </Pop>
      <Pop show={s >= 5} className="mt-2">
        <div className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-extrabold" style={{ background: '#e8f3ee', color: GREEN }}>
          <span>Ventes consolidées</span><span>1 134 000 F</span>
        </div>
      </Pop>
    </div>
  )} />
);

// 8. Équipe — rôles réels (Admin, Closeuse, Comptable, Livreur) + messagerie
const TeamScene = () => (
  <SceneFrame steps={7} stepMs={1000} render={(s) => (
    <div className="p-4 pb-5">
      <div className="flex -space-x-2">
        {['A', 'M', 'S', 'K'].map((l, i) => (
          <Pop key={l} show delay={i * 130}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-[12px] font-extrabold text-white" style={{ background: GREEN, opacity: 1 - i * 0.15 }}>{l}</span>
          </Pop>
        ))}
        <Pop show={s >= 1}><span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-[11px] font-extrabold text-gray-500">+3</span></Pop>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {['Admin', 'Closeuse', 'Comptable', 'Livreur'].map((r, i) => (
          <Pop key={r} show={s >= 2} delay={i * 90}>
            <span className="inline-block rounded-full border border-gray-200 px-2.5 py-1 text-[10px] font-extrabold text-gray-600">{r}</span>
          </Pop>
        ))}
      </div>
      <Pop show={s >= 3} className="mt-3">
        <div className="rounded-xl bg-gray-50 px-3 py-2 text-[11px] text-gray-500">{s <= 3 ? <TypingDots /> : '💬 « Commande #2851 confirmée, je passe la récupérer à 14h »'}</div>
      </Pop>
      <Pop show={s >= 5} className="mt-2">
        <div className="rounded-xl px-3 py-1.5 text-[10.5px] font-extrabold" style={{ background: '#e8f3ee', color: GREEN }}>🔔 Notification envoyée au livreur</div>
      </Pop>
    </div>
  )} />
);

const FeatureVisual = ({ type }) => {
  if (type === 'store') return <StoreScene />;
  if (type === 'creative') return <CreativeScene />;
  if (type === 'chat') return <ChatScene />;
  if (type === 'orders') return <OrdersScene />;
  if (type === 'whatsapp') return <WhatsappScene />;
  if (type === 'analytics') return <AnalyticsScene />;
  if (type === 'stores') return <StoresScene />;
  return <TeamScene />;
};

// ─── Blocs fonctionnalités : alternance gauche/droite (zig-zag) ──────────────
const FeatureBlock = ({ f, index }) => {
  const [ref, visible] = useReveal(0.18);
  const base = 'transition-all duration-700';
  const reversed = index % 2 === 1; // 1 bloc sur 2 : texte à droite, visuel à gauche (desktop)
  const txtHidden = reversed ? 'translateX(32px)' : 'translateX(-32px)';
  const ptHidden = reversed ? 'translateX(20px)' : 'translateX(-20px)';
  const visHidden = reversed ? 'translateX(-32px) scale(.97)' : 'translateX(32px) scale(.97)';
  return (
    <section id={f.anchor} className="scroll-mt-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div ref={ref} className="grid items-center gap-8 lg:grid-cols-2 rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-10 sm:px-10 sm:py-14">
          {/* Texte — entre du côté où il est affiché */}
          <div className={`${base} ${reversed ? 'lg:order-2' : ''}`} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : txtHidden }}>
            <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: GREEN }}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: GREEN }}>{f.icon}</span>
              {f.tag}
              {f.badge && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-700">{f.badge}</span>}
            </p>
            <h3 className="mt-3 text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">{f.title}</h3>
            <p className="mt-3 text-[14.5px] text-gray-600 leading-relaxed">{f.desc}</p>
            <div className="mt-4 space-y-2">
              {(f.points || []).map((pt, j) => (
                <div key={pt} className={base} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : ptHidden, transitionDelay: `${180 + j * 110}ms` }}>
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px]" style={{ background: GREEN }}>✓</span>
                    <span className="text-[13.5px] text-gray-700">{pt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Visuel — entre du côté opposé */}
          <div className={`${base} ${reversed ? 'lg:order-1' : ''}`} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0) scale(1)' : visHidden, transitionDelay: '120ms' }}>
            <FeatureVisual type={f.vtype} />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureBlocks = () => (
  <>
    <style>{FV_KEYFRAMES}</style>
    {FEATURES.map((f, i) => <FeatureBlock key={f.title} f={f} index={i} />)}
  </>
);

// ─── Section « Nouvelles mises à jour » — vidéo YouTube (façade légère) ──────
// Façade : on n'affiche que la miniature ; le player YouTube ne se charge qu'au
// clic (pas de JS/tracking YouTube au chargement de la landing).
const YT_UPDATE_ID = 'CNQpGzLQdNE';

const YouTubeFacade = ({ id, title }) => {
  const [playing, setPlaying] = useState(false);
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-lg" style={{ paddingBottom: '56.25%' }}>
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 h-full w-full cursor-pointer"
          aria-label={tp('Lire la vidéo')}
        >
          <img
            src={thumb}
            onError={() => setThumb(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          <span className="absolute inset-0" style={{ background: 'linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.40))' }} />
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-xl transition group-hover:scale-110" style={{ background: GREEN }}>
            <span className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white" />
          </span>
        </button>
      )}
    </div>
  );
};

// ─── Cadre de section — carte arrondie/bordée, espacement unifié (SaaS pro) ──
const Section = ({ id, inner = '', className = '', children }) => (
  <section id={id} className="scroll-mt-24 px-4 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm px-5 py-10 sm:px-10 sm:py-14 ${className}`}>
        {inner ? <div className={inner}>{children}</div> : children}
      </div>
    </div>
  </section>
);

const UpdatesSection = () => (
  <Section id="updates">
    <Reveal className="text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white" style={{ background: GREEN }}>
        ✦ {tp('Nouveau')}
      </span>
      <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Les nouvelles mises à jour')}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-[15px] text-gray-600">{tp('Découvre en vidéo les dernières nouveautés de Scalor.')}</p>
    </Reveal>
    <Reveal delay={120} className="mt-8">
      <div className="mx-auto max-w-2xl">
        <YouTubeFacade id={YT_UPDATE_ID} title={tp('Nouvelles mises à jour Scalor')} />
      </div>
    </Reveal>
    <Reveal delay={200} className="mt-5 text-center">
      <a href={`https://youtu.be/${YT_UPDATE_ID}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-[14px] font-bold hover:underline" style={{ color: GREEN }}>
        {tp('Regarder sur YouTube')} →
      </a>
    </Reveal>
  </Section>
);

// ─── Carrousel « Top vendeurs Scalor » ──────────────────────────────────────
// Données réelles via GET /api/ecom/public/top-stores (CA anonymisé + arrondi).
// Repli sur des exemples réalistes tant que l'API n'est pas déployée / vide.
const TOP_SELLERS_FALLBACK = [
  { rank: 1, seller: 'Aminata K.', flag: '🇨🇲', country: 'Cameroun', revenueLabel: '4,2 M FCFA', orders: 1240 },
  { rank: 2, seller: 'Ibrahim S.', flag: '🇨🇮', country: "Côte d'Ivoire", revenueLabel: '3,6 M FCFA', orders: 1015 },
  { rank: 3, seller: 'Fatou D.', flag: '🇸🇳', country: 'Sénégal', revenueLabel: '2,9 M FCFA', orders: 870 },
  { rank: 4, seller: 'Yao K.', flag: '🇹🇬', country: 'Togo', revenueLabel: '2,4 M FCFA', orders: 760 },
  { rank: 5, seller: 'Moussa T.', flag: '🇲🇱', country: 'Mali', revenueLabel: '2,1 M FCFA', orders: 690 },
  { rank: 6, seller: 'Chantal M.', flag: '🇨🇲', country: 'Cameroun', revenueLabel: '1,8 M FCFA', orders: 540 },
];

const SellerCard = ({ s }) => (
  <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[13px] font-black text-white" style={{ background: GREEN }}>#{s.rank}</span>
      <span className="text-2xl leading-none">{s.flag || '🌍'}</span>
    </div>
    <p className="mt-3 text-[15px] font-extrabold text-gray-900">{s.seller}</p>
    <p className="text-[12px] font-semibold text-gray-400">{s.country || 'Scalor'}</p>
    <div className="mt-4 rounded-xl bg-gray-50 px-3 py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400">{tp('Chiffre d’affaires')}</p>
      <p className="text-xl font-extrabold" style={{ color: GREEN }}>{s.revenueLabel}</p>
    </div>
    {typeof s.orders === 'number' && (
      <p className="mt-2 text-[12px] font-semibold text-gray-500">{s.orders.toLocaleString('fr-FR')} {tp('commandes')}</p>
    )}
  </div>
);

const TopSellers = () => {
  const navigate = useNavigate();
  const trackRef = useRef(null);
  const [items, setItems] = useState(TOP_SELLERS_FALLBACK);

  // Vraies perfs (best-effort) — remplace le repli si l'API renvoie ≥ 3 boutiques
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: ecomApi } = await import('../services/ecommApi.js');
        const res = await ecomApi.get('/public/top-stores');
        const list = res?.data?.stores;
        if (!cancelled && Array.isArray(list) && list.length >= 3) setItems(list);
      } catch { /* garde le repli */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const scrollByCard = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector('[data-card]');
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.9;
    let next = el.scrollLeft + dir * step;
    if (dir > 0 && el.scrollLeft + el.clientWidth >= el.scrollWidth - 8) next = 0;        // boucle → début
    else if (dir < 0 && el.scrollLeft <= 8) next = el.scrollWidth;                        // boucle → fin
    el.scrollTo({ left: next, behavior: 'smooth' });
  };

  // Auto-défilement (pause au survol)
  useEffect(() => {
    const el = trackRef.current;
    let id = setInterval(() => scrollByCard(1), 3500);
    const pause = () => clearInterval(id);
    const resume = () => { id = setInterval(() => scrollByCard(1), 3500); };
    if (el) { el.addEventListener('mouseenter', pause); el.addEventListener('mouseleave', resume); }
    return () => { clearInterval(id); if (el) { el.removeEventListener('mouseenter', pause); el.removeEventListener('mouseleave', resume); } };
  }, [items]);

  return (
    <Section id="top-vendeurs">
      <style>{`.ts-track::-webkit-scrollbar{display:none}.ts-track{-ms-overflow-style:none;scrollbar-width:none}`}</style>
      <Reveal className="text-center max-w-2xl mx-auto">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white" style={{ background: GREEN }}>🏆 {tp('Top vendeurs')}</span>
        <h2 className="mt-4 text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Ils cartonnent avec Scalor')}</h2>
        <p className="mt-3 text-[15px] text-gray-600">{tp('Les boutiques qui génèrent le plus de ventes sur Scalor. Chiffres réels, vendeurs anonymisés.')}</p>
      </Reveal>

      <div className="relative mt-8">
        <div ref={trackRef} className="ts-track flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2">
          {items.map((s, i) => (
            <div key={i} data-card className="w-[85%] shrink-0 snap-start sm:w-[46%] lg:w-[31.5%]">
              <SellerCard s={s} />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => scrollByCard(-1)} aria-label={tp('Précédent')} className="absolute -left-2 top-[46%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-600 shadow-md transition hover:bg-gray-50 sm:flex">‹</button>
        <button type="button" onClick={() => scrollByCard(1)} aria-label={tp('Suivant')} className="absolute -right-2 top-[46%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-lg text-gray-600 shadow-md transition hover:bg-gray-50 sm:flex">›</button>
      </div>

      <div className="mt-7 text-center">
        <button onClick={() => navigate('/ecom/register')} className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold text-white transition hover:brightness-110 active:scale-[.99]" style={{ background: GREEN, boxShadow: '0 8px 24px rgba(15,107,79,.25)' }}>
          {tp('Rejoindre les top vendeurs')} →
        </button>
      </div>
    </Section>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  const [showAnnounce, setShowAnnounce] = useState(true);

  const Cta = ({ children, onClick, variant = 'primary', className = '' }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold transition hover:brightness-110 active:scale-[.99] ${className}`}
      style={variant === 'primary'
        ? { background: GREEN, color: '#fff', boxShadow: '0 8px 24px rgba(15,107,79,.25)' }
        : { background: '#fff', color: '#111827', border: '1px solid #e5e7eb' }}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen text-gray-900" style={{ background: '#f4f5f7', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ══ Barre d'annonce — programme d'affiliation ══ */}
      {showAnnounce && (
        <div className="fixed top-0 inset-x-0 z-[60] flex h-10 items-center justify-center px-10 text-white" style={{ background: `linear-gradient(90deg,${GREEN},${GREEN_DARK})` }}>
          <a href="#affiliation" className="flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold hover:underline">
            <span aria-hidden>🎉</span>
            <span className="sm:hidden">{tp('Affiliation : 50% à vie + 500 F')} →</span>
            <span className="hidden sm:inline">{tp('Programme d’affiliation : 50% de commission à vie sur chaque filleul + 500 F par inscription · En savoir plus')} →</span>
          </a>
          <button onClick={() => setShowAnnounce(false)} aria-label={tp('Fermer')} className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white">✕</button>
        </div>
      )}

      {/* ══ NAVBAR — floating pill ══ */}
      <header className="fixed left-0 right-0 z-50 flex justify-center px-4 pt-3" style={{ top: showAnnounce ? 40 : 0 }}>
        {/* Pill container */}
        <div className="w-full max-w-5xl transition-all duration-300"
          style={{
            background: 'rgba(245,245,244,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '999px',
            boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
          }}>
          <nav className="flex items-center justify-between px-4 sm:px-5 h-[52px] gap-3">

            {/* Logo */}
            <button onClick={() => navigate('/')} className="flex items-center gap-2 flex-shrink-0">
              <img src="/logo.png" alt="Scalor" className="h-7 object-contain" />
            </button>

            {/* Nav centrale */}
            <div className="hidden md:flex items-center gap-0 flex-1 justify-center">
              {[
                { get label() { return tp('Fonctionnalités'); }, href: '#features' },
                { label: 'Agent IA', href: '#agent-ia' },
                { get label() { return tp('Comment ça marche'); }, href: '#how-it-works' },
                { label: 'Boutique IA', href: '#boutique-ia' },
                { label: 'Formation', href: '#formation' },
                { label: 'Tarifs', onClick: () => navigate('/ecom/tarifs') },
              ].map((l, i) =>
                l.onClick
                  ? <button key={i} onClick={l.onClick} className="px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors" style={{ color: '#374151' }}
                      onMouseEnter={e => { e.target.style.background='rgba(0,0,0,0.06)'; }}
                      onMouseLeave={e => { e.target.style.background='transparent'; }}>
                      {l.label}
                    </button>
                  : <a key={i} href={l.href} className="px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors" style={{ color: '#374151' }}
                      onMouseEnter={e => { e.target.style.background='rgba(0,0,0,0.06)'; }}
                      onMouseLeave={e => { e.target.style.background='transparent'; }}>
                      {l.label}
                    </a>
              )}
            </div>

            {/* Droite */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={() => navigate('/ecom/login')} className="hidden md:block px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors" style={{ color: '#374151' }}
                onMouseEnter={e => e.target.style.background='rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.target.style.background='transparent'}>
                {tp('Connexion')}
              </button>
              <button onClick={() => navigate('/ecom/register')} className="hidden md:flex items-center gap-2 pl-2.5 pr-4 py-1.5 text-[13px] font-bold text-white rounded-full transition-all active:scale-[0.97]"
                style={{ background: '#111', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                onMouseEnter={e => e.currentTarget.style.background='#222'}
                onMouseLeave={e => e.currentTarget.style.background='#111'}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#05976D' }}>
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </span>
                {tp('Commencer Scalor')}
              </button>

              {/* Mobile burger */}
              <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-1.5 rounded-full transition" style={{ color: '#374151' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(0,0,0,0.06)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenu ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>}
                </svg>
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile menu — drop sous la pill */}
        {mobileMenu && (
          <div className="absolute top-[68px] left-4 right-4 rounded-2xl overflow-hidden shadow-xl" style={{ background: '#fff', border: '1px solid #e5e7eb' }}>
            <div className="px-3 py-3 space-y-0.5">
              <a href="#features" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-background">{tp('Fonctionnalités')}</a>
              <a href="#agent-ia" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-background">{tp('Agent IA')}</a>
              <a href="#how-it-works" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-background">{tp('Comment ça marche')}</a>
              <a href="#boutique-ia" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-background">{tp('Boutique IA')}</a>
              <a href="#formation" onClick={() => setMobileMenu(false)} className="block px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-background">{tp('Formation')}</a>
              <button onClick={() => { navigate('/ecom/tarifs'); setMobileMenu(false); }} className="block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl text-muted-foreground hover:bg-background">{tp('Tarifs')}</button>
            </div>
            <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid #f3f4f6' }}>
              <button onClick={() => navigate('/ecom/login')} className="w-full py-2.5 text-sm font-medium rounded-full text-foreground mt-2" style={{ background: '#f3f4f6' }}>{tp('Connexion')}</button>
              <button onClick={() => navigate('/ecom/register')} className="w-full py-2.5 text-sm font-bold text-white rounded-full" style={{ background: '#111' }}>{tp('Commencer Scalor')}</button>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className={`relative overflow-hidden pb-14 ${showAnnounce ? 'pt-[152px] sm:pt-[168px]' : 'pt-28 sm:pt-32'}`} style={{ background: 'linear-gradient(180deg,#f6faf8 0%,#f4f5f7 100%)' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <a
            href="https://chat.whatsapp.com/IH3nEvfeEWrHiAnocwZTwz?mode=gi_t" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[12.5px] font-semibold text-gray-600 shadow-sm hover:border-gray-300 transition"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
            {tp('Rejoindre +1 000 e-commerçants dans notre groupe')} →
          </a>

          <h1 className="mx-auto mt-6 max-w-3xl text-4xl sm:text-6xl font-extrabold leading-[1.08] tracking-tight">
            {tp('L’IA qui')} <RotatingText />
            <br className="hidden sm:block" /> {tp('en Afrique')}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15.5px] sm:text-lg text-gray-600 leading-relaxed">
            {tp('Scalor génère ta boutique et tout ton contenu de vente par IA — puis pilote commandes, WhatsApp et livraison. Une seule plateforme, pensée pour le COD africain.')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Cta onClick={() => navigate('/ecom/register')}>{tp('Commencer gratuitement')} →</Cta>
            <Cta variant="ghost" onClick={() => navigate('/ecom/formation')}>{tp('Voir la formation')}</Cta>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12.5px] font-semibold text-gray-500">
            <span>⭐ 4.5/5 {tp('satisfaction')}</span>
            <span>1 000+ {tp('vendeurs actifs')}</span>
            <span>15 000+ {tp('commandes traitées')}</span>
          </div>

        </div>
      </section>

      {/* ── Corps en cartes ─ espacement unifié ── */}
      <div className="space-y-4 sm:space-y-5 pt-4 sm:pt-5 pb-4 sm:pb-5">

      {/* ── Nouvelles mises à jour (vidéo YouTube) ── */}
      <UpdatesSection />

      {/* ── Scalor tout-en-un ── */}
      <Section>
          <Reveal className="text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Vous dépensez beaucoup d’argent sur ces outils…')}</h2>
            <p className="mt-3 text-[15px] text-gray-600">{tp('Scalor les remplace tous — boutique, contenus, WhatsApp, IA — pour 0 FCFA au démarrage.')}</p>
          </Reveal>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto items-stretch">
            {/* Avant — outils séparés */}
            <Reveal className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-7 flex flex-col">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">{tp('Avant — outils séparés')}</p>
              <div className="mt-4 space-y-2">
                {[
                  ['Shopify', 'Shopify + apps', tp('boutique')],
                  ['Canva Pro', 'Canva Pro + CapCut', tp('visuels & vidéos')],
                  ['Fiverr', 'Fiverr / freelances', tp('affiches & montages')],
                  ['WhatsApp Business', 'WhatsApp Business + closeuse', tp('réponses clients')],
                  ['Klaviyo', 'Klaviyo + Google Sheets', tp('relances & suivi')],
                  ['ChatGPT', 'ChatGPT + Claude', tp('rédaction & assistant IA')],
                ].map(([logoName, tool, role]) => (
                  <div key={tool} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3.5 py-2.5">
                    <span className="flex items-center gap-2.5 text-[13px] font-bold text-gray-700">
                      <ToolLogo name={logoName} size={16} />
                      {tool}
                    </span>
                    <span className="text-[11.5px] text-gray-400">{role}</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pt-5">
                <p className="text-3xl font-extrabold text-red-500">~440 000 FCFA</p>
                <p className="text-[12.5px] text-gray-500">{tp('par mois · 7 abonnements et prestataires à coordonner')}</p>
              </div>
            </Reveal>

            {/* Scalor — tout en un */}
            <Reveal delay={120}>
            <div className="h-full rounded-3xl p-6 sm:p-7 text-white flex flex-col shadow-xl" style={{ background: `linear-gradient(140deg,${GREEN} 0%,${GREEN_DARK} 100%)` }}>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/70">Scalor — {tp('tout en un')}</p>
              <div className="mt-4 space-y-2">
                {[
                  tp('Boutique IA générée en 2 minutes'),
                  tp('Creative Center : affiches, vidéos, voix-off'),
                  tp('Rita — agent IA WhatsApp 24h/24'),
                  tp('Commandes COD, stock et livraison'),
                  tp('Analytics : bénéfice net en temps réel'),
                  tp('Agent IA Scalor intégré : rédige, analyse, assiste'),
                ].map((li) => (
                  <div key={li} className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3.5 py-2.5">
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-black" style={{ color: GREEN }}>✓</span>
                    <span className="text-[13px] font-semibold text-white">{li}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-end justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-3xl font-extrabold">0 FCFA</p>
                  <p className="text-[12.5px] text-white/75">{tp('pour commencer · sans carte bancaire')}</p>
                </div>
                <button onClick={() => navigate('/ecom/register')} className="rounded-xl bg-white px-5 py-2.5 text-[13.5px] font-extrabold transition hover:brightness-95" style={{ color: GREEN }}>
                  {tp('Commencer gratuitement')} →
                </button>
              </div>
            </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="mt-6 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-700">
              💸 {tp('Économise ~440 000 FCFA chaque mois avec Scalor')}
            </p>
          </Reveal>
      </Section>

      {/* ── Features ── */}
      <Section id="features">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Tout ce qu’il faut pour vendre en Afrique')}</h2>
            <p className="mt-3 text-[15px] text-gray-600">{tp('Pas de fonctions gadgets. Juste ce qui compte pour créer, promouvoir et livrer en COD.')}</p>
          </Reveal>
      </Section>
      <FeatureBlocks />

      {/* ── Top vendeurs (carrousel) ── */}
      <TopSellers />

      {/* ── Boutique IA ── */}
      <Section id="boutique-ia">
          <Reveal className="text-center max-w-2xl mx-auto">
            <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: GREEN }}>{tp('Créateur de site')}</p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Crée ta boutique IA sur Scalor')}</h2>
            <p className="mt-3 text-[15px] text-gray-600 leading-relaxed">
              {tp('Décris ton produit : l’IA génère ta boutique complète en quelques secondes — page produit premium, photos, descriptions, formulaire COD et tunnel de vente inclus.')}
            </p>
          </Reveal>

          <div id="how-it-works" className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['01', tp('Décris ton produit'), tp('Dis à l’IA ce que tu vends en quelques mots, ou importe depuis Shopify / WooCommerce.')],
              ['02', tp('L’IA construit tout'), tp('Page produit premium, visuels, textes de vente, upsells et formulaire COD générés.')],
              ['03', tp('Lance & vends'), tp('Ta boutique est en ligne sur ton sous-domaine — les commandes arrivent dans Scalor.')],
            ].map(([num, title, desc], i) => (
              <Reveal key={num} delay={i * 90} className="relative rounded-2xl border border-gray-200 bg-white p-6">
                <span className="text-3xl font-extrabold" style={{ color: `${GREEN}22` }}>{num}</span>
                <h3 className="mt-2 text-[15.5px] font-extrabold">{title}</h3>
                <p className="mt-1.5 text-[13.5px] text-gray-500 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={150} className="mt-8 text-center">
            <Cta onClick={() => navigate('/ecom/register')}>{tp('Créer ma boutique IA gratuitement')} →</Cta>
            <p className="mt-2.5 text-[12.5px] text-gray-500">{tp('Aucune carte bancaire · Prêt en moins de 2 minutes')}</p>
          </Reveal>
      </Section>

      {/* ── Intégrations ── */}
      <Section id="integrations" inner="text-center">
          <Reveal>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">{tp('Connecte tes outils à Scalor')}</h2>
            <p className="mt-2 text-[14px] text-gray-600">{tp('Tous tes outils préférés, synchronisés en un seul endroit.')}</p>
          </Reveal>
          <Reveal delay={100} className="mt-7 flex flex-wrap justify-center gap-2">
            {['Shopify', 'WooCommerce', 'WhatsApp', 'Meta Ads', 'Google Sheets', 'EasySell', 'Loox', 'Klaviyo', 'Mailchimp', 'TikTok', 'Google Ads', 'Notion'].map((n) => (
              <span key={n} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-[13px] font-bold text-gray-600">
                <ToolLogo name={n} size={16} />
                {n}
              </span>
            ))}
          </Reveal>
      </Section>

      {/* ── Formation ── */}
      <Section id="formation" inner="grid gap-10 lg:grid-cols-2 items-center">
          <Reveal>
            <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: GREEN }}>{tp('Formation offerte')}</p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Maîtrise Scalor en 17 leçons')}</h2>
            <p className="mt-4 text-[15px] text-gray-600 leading-relaxed">
              {tp('Un module complet inclus gratuitement dans ton compte — de la prise en main jusqu’à l’agent IA et ta première campagne Facebook Ads. Accès à vie.')}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Cta onClick={() => navigate('/ecom/formation')}>{tp('Accéder gratuitement')} →</Cta>
              <Cta variant="ghost" onClick={() => window.open('https://youtu.be/405eKEysE0Q', '_blank')}>▶ {tp('Voir la vidéo de prise en main')}</Cta>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-extrabold">{tp('Module 7 · Prise en main de Scalor')}</p>
                <span className="rounded-full px-2.5 py-1 text-[10.5px] font-extrabold text-white" style={{ background: GREEN }}>17 {tp('leçons')}</span>
              </div>
              <div className="mt-3 max-h-64 overflow-y-auto pr-1 space-y-1">
                {FORMATION_LESSONS.map((lesson, i) => (
                  <div key={lesson} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-gray-600 hover:bg-gray-50">
                    <span className="w-8 shrink-0 font-mono text-[11px] text-gray-400">7.{i + 1}</span>
                    {lesson}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
      </Section>

      {/* ── Pays ── */}
      <Section inner="text-center">
          <Reveal>
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">{tp('Disponible partout en Afrique')}</h2>
            <p className="mt-2 text-[14px] text-gray-600">{tp('Paiement à la livraison, WhatsApp et logistique locale — Scalor est conçu pour les marchés africains.')}</p>
          </Reveal>
          <Reveal delay={100} className="mt-7 flex flex-wrap justify-center gap-2">
            {COUNTRIES.map(([flag, name]) => (
              <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-gray-600">
                <span>{flag}</span>{name}
              </span>
            ))}
          </Reveal>
          <p className="mt-4 text-[12.5px] text-gray-400">{tp('Et bien d’autres pays en cours d’intégration…')}</p>
      </Section>

      {/* ── Témoignages ── */}
      <Section>
          <Reveal className="text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Ils ont choisi Scalor')}</h2>
            <p className="mt-2 text-[14px] text-gray-600">{tp('Les avis de ceux qui utilisent Scalor au quotidien.')}</p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map(([quote, initials, name, role], i) => (
              <Reveal key={name} delay={i * 50} className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-[13px] text-gray-600 leading-relaxed">“{quote}”</p>
                <div className="mt-4 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: GREEN }}>{initials}</span>
                  <div>
                    <p className="text-[12.5px] font-extrabold">{name}</p>
                    <p className="text-[11px] text-gray-400">{role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
      </Section>

      {/* ── Affiliation ── */}
      <Section id="affiliation" inner="text-center">
          <Reveal>
            <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: GREEN }}>{tp('Programme d’affiliation')}</p>
            <h2 className="mt-2 text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Gagne de l’argent en recommandant Scalor')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] text-gray-600 leading-relaxed">
              {tp('Ton lien de parrainage est intégré à ton compte Scalor (menu Affiliation). Chaque inscription et chaque abonnement de tes filleuls te rapporte — à vie.')}
            </p>
          </Reveal>
          <div className="mt-9 grid gap-4 sm:grid-cols-3">
            {[
              ['50%', tp('de commission sur chaque paiement d’abonnement de tes filleuls, à vie')],
              ['500 F', tp('offerts dès l’inscription de chaque filleul avec ton lien')],
              ['5 000 F', tp('seuil de retrait — encaisse par Mobile Money rapidement')],
            ].map(([big, small], i) => (
              <Reveal key={big} delay={i * 80} className="rounded-2xl border border-gray-200 bg-white p-6">
                <p className="text-3xl font-extrabold" style={{ color: GREEN }}>{big}</p>
                <p className="mt-2 text-[13px] text-gray-500 leading-relaxed">{small}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200} className="mt-8">
            <Cta onClick={() => navigate('/ecom/register')}>{tp('Devenir affilié')} →</Cta>
            <p className="mt-2.5 text-[12.5px] text-gray-500">
              {tp('Gratuit, sans engagement. Déjà membre ?')}{' '}
              <button onClick={() => navigate('/ecom/login')} className="font-bold underline" style={{ color: GREEN }}>{tp('Connecte-toi')}</button>
            </p>
          </Reveal>
      </Section>

      {/* ── FAQ ── */}
      <Section inner="mx-auto max-w-3xl">
          <Reveal className="text-center">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{tp('Questions fréquentes')}</h2>
          </Reveal>
          <div className="mt-8 space-y-2.5">
            {FAQ.map(([q, a], i) => (
              <Reveal key={q} delay={i * 40}>
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                    aria-expanded={openFaq === i}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[14.5px] font-extrabold hover:bg-gray-50 transition"
                  >
                    {q}
                    <span className="text-gray-400 transition-transform" style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                  </button>
                  {openFaq === i && <p className="px-5 pb-4 text-[13.5px] text-gray-600 leading-relaxed">{a}</p>}
                </div>
              </Reveal>
            ))}
          </div>
      </Section>

      </div>

      {/* ── CTA final ── */}
      <section className="py-20 sm:py-28 text-center text-white" style={{ background: `linear-gradient(135deg,${GREEN},${GREEN_DARK})` }}>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">{tp('Prêt à scaler ton e-commerce ?')}</h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/80">
              {tp('Rejoins 1 000+ vendeurs qui créent, promeuvent et vendent avec Scalor — boutique, contenus et WhatsApp inclus.')}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => navigate('/ecom/register')} className="rounded-xl bg-white px-7 py-3.5 text-[15px] font-extrabold transition hover:brightness-95" style={{ color: GREEN }}>
                {tp('Commencer gratuitement')} →
              </button>
              <button onClick={() => navigate('/ecom/login')} className="rounded-xl border border-white/30 px-7 py-3.5 text-[15px] font-extrabold text-white transition hover:bg-white/10">
                {tp('Se connecter')}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-14" style={{ background: '#0F1115' }}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2 text-lg font-extrabold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-sm" style={{ background: GREEN }}>S</span>
                Scalor
              </div>
              <p className="mt-3 max-w-xs text-[13px] text-gray-400 leading-relaxed">{tp('Le système d’exploitation du e-commerce africain.')}</p>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{tp('Produit')}</p>
              <div className="mt-3 space-y-2 text-[13px] text-gray-400">
                <a href="#features" className="block hover:text-white transition">{tp('Fonctionnalités')}</a>
                <a href="#agent-ia" className="block hover:text-white transition">Rita IA</a>
                <button onClick={() => navigate('/ecom/tarifs')} className="block hover:text-white transition">{tp('Tarifs')}</button>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{tp('Ressources')}</p>
              <div className="mt-3 space-y-2 text-[13px] text-gray-400">
                <button onClick={() => navigate('/ecom/formation')} className="block hover:text-white transition">{tp('Formation')}</button>
                <a href="#affiliation" className="block hover:text-white transition">{tp('Affiliation')}</a>
                <a href="mailto:contact@safitech.shop" className="block hover:text-white transition">{tp('Contact')}</a>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">{tp('Légal')}</p>
              <div className="mt-3 space-y-2 text-[13px] text-gray-400">
                <button onClick={() => navigate('/ecom/privacy')} className="block hover:text-white transition">{tp('Confidentialité')}</button>
                <button onClick={() => navigate('/ecom/terms')} className="block hover:text-white transition">{tp('Conditions')}</button>
              </div>
            </div>
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 text-[12px] text-gray-500">© 2026 SCALOR by Safitech. {tp('Tous droits réservés.')}</p>
        </div>
      </footer>

      <SupportChat />
    </div>
  );
};

export default LandingPage;
