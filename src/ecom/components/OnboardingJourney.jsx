'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from '@/lib/router-compat';

// ─────────────────────────────────────────────────────────────────────────────
// OnboardingJourney — visite guidée COMPLÈTE en 2 phases, à travers les pages :
//
//   Phase 1 · Dashboard central : TOUTES les options du menu central, une à
//             une (spotlight), PUIS un modal centré qui propose de visiter
//             la boutique.
//   Phase 2 · Boutique          : produits, commandes, design, formulaire,
//                                 réglages, solde… puis « Retour à Scalor »
//                                 et fin de la visite.
//
// Le composant est monté sur le dashboard admin ET dans BoutiqueLayout : l'état
// (phase + étape) est persisté dans localStorage (`scalorJourney`), donc le
// tour survit aux navigations. Une étape absente de l'écran (plan, rôle…)
// est automatiquement sautée.
//
// Démarrage :
//   - auto au premier accès du dashboard (si jamais vu)
//   - forcé depuis la page « création réussie » : startJourney() puis navigate
//   - relance manuelle : window.dispatchEvent(new CustomEvent('scalor:start-journey'))
// ─────────────────────────────────────────────────────────────────────────────

const KEY = 'scalorJourney';
const LEGACY_KEY = 'scalorTour:dashboard'; // ancien tour mono-page, neutralisé
const PAD = 8;
const MIN_WIDTH = 1024;

/** Arme le parcours (à appeler AVANT de naviguer vers le dashboard). */
export const startJourney = () => {
  try { localStorage.setItem(KEY, JSON.stringify({ p: 0, s: 0 })); } catch { /* privé */ }
};

const readState = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw === 'done') return null;
    const st = JSON.parse(raw);
    if (typeof st?.p === 'number' && typeof st?.s === 'number') return st;
  } catch { /* privé */ }
  return null;
};

const writeState = (st) => {
  try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* privé */ }
};

const markDone = () => {
  try {
    localStorage.setItem(KEY, 'done');
    localStorage.setItem(LEGACY_KEY, 'done');
  } catch { /* privé */ }
};

// ── Les phases ───────────────────────────────────────────────────────────────
const PHASES = [
  {
    // Phase 1 — le MENU CENTRAL, option par option, puis le modal boutique.
    match: (p) => p.startsWith('/ecom/dashboard'),
    steps: [
      {
        target: 'a[href="/ecom/dashboard/admin"]',
        title: 'Accueil',
        text: 'Ton tableau de bord : chiffre d\'affaires, commandes du jour et activité de ton business en un coup d\'œil.',
      },
      {
        target: 'a[href="/ecom/orders"]',
        title: 'Commandes',
        text: 'Chaque vente arrive ici : confirme, suis la livraison et encaisse. Ton poste de pilotage quotidien.',
      },
      {
        target: 'a[href="/ecom/clients"]',
        title: 'Clients',
        text: 'Ta base clients : historique d\'achats, coordonnées, relances. Un client connu est un client qui rachète.',
      },
      {
        target: 'a[href="/ecom/products"]',
        title: 'Produits',
        text: 'Ton catalogue central : fiches, prix, stocks. Un bon catalogue = plus de conversions.',
      },
      {
        target: 'a[href="/ecom/boutique"]',
        title: 'Ma Boutique',
        text: 'Ta boutique en ligne : design, pages, formulaire de commande, paiements. On la visite dans un instant.',
      },
      {
        target: 'a[href="/ecom/creatives"]',
        title: 'Creative Center',
        text: 'Génère tes visuels publicitaires et vidéos avec l\'IA : affiches, créatives, voix off, montage automatique…',
      },
      {
        target: 'a[href="/ecom/reports"]',
        title: 'Rapports',
        text: 'Tes performances en détail : ventes, taux de confirmation, livraison. Pour décider avec des chiffres.',
      },
      {
        target: 'a[href="/ecom/goals"]',
        title: 'Objectifs',
        text: 'Fixe tes objectifs de vente et suis ta progression jour après jour.',
      },
      {
        target: 'a[href="/ecom/transactions"]',
        title: 'Finances',
        text: 'Entrées, sorties, marges : la santé financière de ton business.',
      },
      {
        target: 'a[href="/ecom/stock"]',
        title: 'Gestion de stock',
        text: 'Suis tes niveaux de stock et évite les ruptures sur tes best-sellers.',
      },
      {
        target: 'a[href="/ecom/campaigns"]',
        title: 'Marketing',
        text: 'Tes campagnes et promotions pour faire revenir les clients.',
      },
      {
        target: 'a[href="/ecom/whatsapp/service"]',
        title: 'Service Messagerie',
        text: 'Connecte WhatsApp pour confirmer les commandes et répondre à tes clients.',
      },
      {
        target: 'a[href="/ecom/users"]',
        title: 'Équipe',
        text: 'Invite closeuses, comptables et livreurs — chacun son rôle, chacun son espace.',
      },
      {
        target: 'a[href="/ecom/developer"]',
        title: 'API Développeur',
        text: 'Pour connecter Scalor à tes propres outils.',
      },
      {
        target: 'a[href="/ecom/formation"]',
        title: 'Formation',
        text: 'Des cours et tutoriels pour vendre plus, direct dans la plateforme.',
      },
      {
        target: 'a[href="/ecom/billing"]',
        title: 'Abonnement',
        text: 'Plan, crédits créatifs et factures. Tu peux monter en gamme quand ta boutique décolle.',
      },
      {
        // Le MODAL de transition — sort après la présentation du menu central.
        modal: true,
        title: 'Maintenant, ta boutique !',
        text: 'Tu connais le tableau central. Passons à ta boutique en ligne : on va voir ensemble comment ajouter un produit, gérer les commandes et personnaliser ton design.',
        cta: 'Visiter la boutique →',
        navigateTo: '/ecom/boutique',
      },
    ],
  },
  {
    // Phase 2 — la boutique.
    match: (p) => p.startsWith('/ecom/boutique'),
    steps: [
      {
        target: 'a[href="/ecom/boutique"]',
        title: 'Vue d\'ensemble',
        text: 'Le tableau de bord de ta boutique : ventes, visites et activité en un coup d\'œil.',
      },
      {
        target: '[data-tour="nav-Produits"]',
        title: 'Ajoute ton premier produit',
        text: 'Clique ici puis « Tous les produits » → « Ajouter un produit » : photos, prix, stock. Tu y trouves aussi les collections et la médiathèque IA.',
      },
      {
        target: 'a[href="/ecom/boutique/orders"]',
        title: 'Les commandes de la boutique',
        text: 'Chaque vente passée sur ta boutique arrive ici : confirme, prépare et suis la livraison.',
      },
      {
        target: '[data-tour="nav-Personnalisation"]',
        title: 'Personnalise ton design',
        text: 'Theme Builder, couleurs, typographie, mise en page : rends ta boutique unique, sans coder.',
      },
      {
        target: '[data-tour="nav-Manager de formulaire"]',
        title: 'Ton formulaire de commande',
        text: 'Le formulaire que remplissent tes clients : champs, offres de quantité, upsells et intégrations WhatsApp.',
      },
      {
        target: '[data-tour="nav-Réglages"]',
        title: 'Réglages de la boutique',
        text: 'Paiements, zones de livraison, domaine personnalisé, pixels publicitaires : tout se configure ici.',
      },
      {
        target: 'a[href="/ecom/boutique/wallet"]',
        title: 'Ton solde',
        text: 'L\'argent encaissé par ta boutique et tes retraits.',
      },
      {
        target: '[data-tour="back-to-scalor"]',
        title: 'Retour à Scalor',
        text: 'Ce bouton te ramène au tableau central à tout moment. Tu as tout vu — bonne vente !',
        cta: 'Terminer ✓',
      },
    ],
  },
];

const totalSteps = PHASES.reduce((n, ph) => n + ph.steps.length, 0);
const stepNumber = (p, s) => PHASES.slice(0, p).reduce((n, ph) => n + ph.steps.length, 0) + s + 1;

const OnboardingJourney = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState(null); // { p, s } affiché
  const [rect, setRect] = useState(null);
  const pollRef = useRef(null);
  const rafRef = useRef(null);

  const clearPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  const measure = useCallback((target) => {
    const el = document.querySelector(target);
    if (!el) { setRect(null); return false; }
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) { setRect(null); return false; }
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    return true;
  }, []);

  /** Affiche l'étape {p,s} dès que sa cible existe (poll — les sidebars peuvent
   *  apparaître après un chargement de données). Étape introuvable → sautée. */
  const showStep = useCallback((p, s) => {
    clearPoll();
    const phase = PHASES[p];
    if (!phase) { markDone(); setState(null); setRect(null); return; }
    if (s >= phase.steps.length) { markDone(); setState(null); setRect(null); return; }
    const step = phase.steps[s];
    if (step.modal) {
      // Modal centré : pas de cible à attendre.
      writeState({ p, s });
      setState({ p, s });
      setRect(null);
      return;
    }
    let tries = 0;
    const attempt = () => {
      tries += 1;
      const el = document.querySelector(step.target);
      if (el) {
        clearPoll();
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        writeState({ p, s });
        setState({ p, s });
        setTimeout(() => measure(step.target), 240);
        return;
      }
      if (tries > 26) { // ~8 s : cible absente → on saute l'étape
        clearPoll();
        const next = s + 1;
        if (next < phase.steps.length) showStep(p, next);
        else { markDone(); setState(null); setRect(null); }
      }
    };
    attempt();
    pollRef.current = setInterval(attempt, 300);
  }, [measure]);

  const advance = useCallback(() => {
    if (!state) return;
    const phase = PHASES[state.p];
    const step = phase.steps[state.s];
    const lastOfPhase = state.s === phase.steps.length - 1;
    if (lastOfPhase && step.navigateTo) {
      // Fin de phase → on arme la suivante puis on navigue.
      const nextP = state.p + 1;
      if (nextP < PHASES.length) writeState({ p: nextP, s: 0 });
      else markDone();
      setState(null); setRect(null); clearPoll();
      navigate(step.navigateTo);
      return;
    }
    if (lastOfPhase) {
      // Dernière phase, dernière étape.
      markDone(); setState(null); setRect(null); clearPoll();
      return;
    }
    showStep(state.p, state.s + 1);
  }, [state, navigate, showStep]);

  const skip = useCallback(() => {
    markDone(); setState(null); setRect(null); clearPoll();
  }, []);

  // ── Reprise / auto-démarrage à chaque page ────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (window.innerWidth < MIN_WIDTH) return undefined;

    let st = readState();

    // Premier accès au dashboard : démarrage auto si jamais vu (ni journey ni ancien tour).
    if (!st) {
      let done = null; let legacy = null;
      try { done = localStorage.getItem(KEY); legacy = localStorage.getItem(LEGACY_KEY); } catch { /* privé */ }
      if (!done && !legacy && location.pathname.startsWith('/ecom/dashboard')) {
        st = { p: 0, s: 0 };
        writeState(st);
      }
    }

    if (!st) return undefined;
    const phase = PHASES[st.p];
    if (!phase || !phase.match(location.pathname)) return undefined; // en pause hors zone

    const t = setTimeout(() => showStep(st.p, st.s), 900);
    return () => { clearTimeout(t); clearPoll(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Relance manuelle (depuis n'importe où).
  useEffect(() => {
    const onStart = () => {
      startJourney();
      if (location.pathname.startsWith('/ecom/dashboard')) showStep(0, 0);
      else navigate('/ecom/dashboard/admin');
    };
    window.addEventListener('scalor:start-journey', onStart);
    return () => window.removeEventListener('scalor:start-journey', onStart);
  }, [location.pathname, navigate, showStep]);

  // Suivi de la cible au scroll/resize (étapes spotlight uniquement).
  useEffect(() => {
    if (!state) return undefined;
    const step = PHASES[state.p]?.steps[state.s];
    if (!step || step.modal) return undefined;
    const onMove = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measure(step.target));
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, measure]);

  useEffect(() => () => clearPoll(), []);

  if (!state) return null;

  const step = PHASES[state.p].steps[state.s];
  const shown = stepNumber(state.p, state.s);

  const keyframes = `
    @keyframes _journey-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(15,107,79,0.55); }
      70%  { box-shadow: 0 0 0 14px rgba(15,107,79,0); }
      100% { box-shadow: 0 0 0 0 rgba(15,107,79,0); }
    }
    @keyframes _journey-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes _journey-pop { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
  `;

  // ── Rendu MODAL (transition entre les phases) ─────────────────────────────
  if (step.modal) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.62)' }} role="dialog" aria-label="Visite guidée">
        <style>{keyframes}</style>
        <div
          style={{
            width: 420, maxWidth: 'calc(100vw - 32px)', background: '#fff', borderRadius: 20,
            boxShadow: '0 24px 70px rgba(2,6,23,0.45)', padding: '26px 24px 20px',
            animation: '_journey-pop 240ms ease', textAlign: 'center', fontFamily: 'inherit',
          }}
        >
          <div style={{ width: 56, height: 56, margin: '0 auto', borderRadius: 18, background: 'rgba(15,107,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" fill="none" stroke="#0F6B4F" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p style={{ margin: '14px 0 0', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0F6B4F' }}>
            Visite guidée · {shown}/{totalSteps}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 19, fontWeight: 800, color: '#0f172a' }}>{step.title}</p>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.65, color: '#475569' }}>{step.text}</p>
          <button
            type="button"
            onClick={advance}
            style={{
              marginTop: 18, width: '100%', background: '#0F6B4F', color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {step.cta || 'Suivant →'}
          </button>
          <button
            type="button"
            onClick={skip}
            style={{ marginTop: 8, background: 'none', border: 'none', padding: '6px 4px', fontSize: 13, fontWeight: 600, color: '#94a3b8', cursor: 'pointer' }}
          >
            Passer la visite
          </button>
        </div>
      </div>
    );
  }

  // ── Rendu SPOTLIGHT ───────────────────────────────────────────────────────
  if (!rect) return null;

  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const tooltipBelow = spaceBelow > 190;
  const tooltipTop = tooltipBelow ? rect.top + rect.height + 14 : undefined;
  const tooltipBottom = tooltipBelow ? undefined : window.innerHeight - rect.top + 14;
  const tooltipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 356));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} role="dialog" aria-label="Visite guidée">
      <style>{keyframes}</style>

      {/* Fond sombre avec découpe sur la cible */}
      <div
        style={{
          position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height,
          borderRadius: 14, boxShadow: '0 0 0 100vmax rgba(15,23,42,0.62)',
          transition: 'all 260ms ease', pointerEvents: 'none',
        }}
      />
      {/* Anneau pulsant « clique ici » */}
      <div
        style={{
          position: 'fixed', top: rect.top, left: rect.left, width: rect.width, height: rect.height,
          borderRadius: 14, border: '2px solid #0F6B4F',
          animation: '_journey-pulse 1.6s ease-out infinite',
          transition: 'all 260ms ease', pointerEvents: 'none',
        }}
      />

      {/* Carte explicative */}
      <div
        style={{
          position: 'fixed', top: tooltipTop, bottom: tooltipBottom, left: tooltipLeft, width: 340,
          background: '#fff', borderRadius: 16, boxShadow: '0 20px 50px rgba(2,6,23,0.35)',
          padding: '18px 18px 14px', animation: '_journey-in 240ms ease', fontFamily: 'inherit',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0F6B4F' }}>
          Visite guidée · {shown}/{totalSteps}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{step.title}</p>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.6, color: '#475569' }}>{step.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <button
            type="button"
            onClick={skip}
            style={{ background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 600, color: '#94a3b8', cursor: 'pointer' }}
          >
            Passer la visite
          </button>
          <button
            type="button"
            onClick={advance}
            style={{
              background: '#0F6B4F', color: '#fff', border: 'none', borderRadius: 12,
              padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {step.cta || 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingJourney;
