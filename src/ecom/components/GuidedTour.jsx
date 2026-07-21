'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// GuidedTour — visite guidée « spotlight » maison (zéro dépendance).
// Met en avant un élément de l'écran (halo découpé + anneau pulsant) avec une
// carte « Clique ici » : titre, explication, Suivant / Passer, compteur.
//
// Props :
//   tourId    : clé de persistance — le tour ne se joue qu'une fois
//               (localStorage `scalorTour:<tourId>` = 'done')
//   steps     : [{ target: 'sélecteur CSS', title, text }]
//   autoStart : lance automatiquement si jamais vu (défaut true)
//   minWidth  : largeur d'écran minimale (défaut 1024 — la sidebar desktop)
//
// Relance manuelle depuis n'importe où :
//   window.dispatchEvent(new CustomEvent('scalor:start-tour', { detail: { tourId } }))
// ─────────────────────────────────────────────────────────────────────────────

const PAD = 8;

const storageKey = (tourId) => `scalorTour:${tourId}`;

const GuidedTour = ({ tourId, steps = [], autoStart = true, minWidth = 1024 }) => {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  const validSteps = steps.filter((s) => s && s.target);

  // Étapes réellement disponibles à l'écran (cibles présentes dans le DOM).
  const resolveStep = useCallback((fromIndex) => {
    for (let i = fromIndex; i < validSteps.length; i += 1) {
      const el = document.querySelector(validSteps[i].target);
      if (el) return i;
    }
    return -1;
  }, [validSteps]);

  const measure = useCallback((index) => {
    const step = validSteps[index];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [validSteps]);

  const goTo = useCallback((index) => {
    const i = resolveStep(index);
    if (i === -1) {
      setActive(false);
      try { localStorage.setItem(storageKey(tourId), 'done'); } catch { /* privé */ }
      return;
    }
    const el = document.querySelector(validSteps[i].target);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setStepIndex(i);
    // Mesure après le scroll (léger différé).
    setTimeout(() => measure(i), 220);
  }, [resolveStep, validSteps, measure, tourId]);

  const finish = useCallback(() => {
    setActive(false);
    try { localStorage.setItem(storageKey(tourId), 'done'); } catch { /* privé */ }
  }, [tourId]);

  const start = useCallback(() => {
    if (!validSteps.length) return;
    if (window.innerWidth < minWidth) return;
    setActive(true);
    goTo(0);
  }, [validSteps.length, minWidth, goTo]);

  // Auto-démarrage (une seule fois par appareil) — après un court délai pour
  // laisser le layout se peindre.
  useEffect(() => {
    if (!autoStart) return undefined;
    let seen = null;
    try { seen = localStorage.getItem(storageKey(tourId)); } catch { /* privé */ }
    if (seen) return undefined;
    const t = setTimeout(start, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Relance manuelle via événement global.
  useEffect(() => {
    const onStart = (e) => {
      if (!e?.detail?.tourId || e.detail.tourId === tourId) start();
    };
    window.addEventListener('scalor:start-tour', onStart);
    return () => window.removeEventListener('scalor:start-tour', onStart);
  }, [start, tourId]);

  // Suivi de la cible au scroll/resize.
  useEffect(() => {
    if (!active) return undefined;
    const onMove = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => measure(stepIndex));
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, stepIndex, measure]);

  if (!active || !rect) return null;

  const step = validSteps[stepIndex];
  const isLast = resolveStep(stepIndex + 1) === -1;
  const total = validSteps.filter((s) => document.querySelector(s.target)).length || validSteps.length;
  const shown = validSteps.slice(0, stepIndex + 1).filter((s) => document.querySelector(s.target)).length;

  // Tooltip : sous la cible si la place le permet, sinon au-dessus ; jamais hors écran.
  const spaceBelow = window.innerHeight - (rect.top + rect.height);
  const tooltipBelow = spaceBelow > 190;
  const tooltipTop = tooltipBelow ? rect.top + rect.height + 14 : undefined;
  const tooltipBottom = tooltipBelow ? undefined : window.innerHeight - rect.top + 14;
  const tooltipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - 356));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} role="dialog" aria-label="Visite guidée">
      <style>{`
        @keyframes _tour-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(15,107,79,0.55); }
          70%  { box-shadow: 0 0 0 14px rgba(15,107,79,0); }
          100% { box-shadow: 0 0 0 0 rgba(15,107,79,0); }
        }
        @keyframes _tour-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Fond sombre avec DÉCOUPE sur la cible (halo) */}
      <div
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 14,
          boxShadow: '0 0 0 100vmax rgba(15,23,42,0.62)',
          transition: 'all 260ms ease',
          pointerEvents: 'none',
        }}
      />
      {/* Anneau pulsant « clique ici » */}
      <div
        style={{
          position: 'fixed',
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: 14,
          border: '2px solid #0F6B4F',
          animation: '_tour-pulse 1.6s ease-out infinite',
          transition: 'all 260ms ease',
          pointerEvents: 'none',
        }}
      />

      {/* Carte explicative */}
      <div
        style={{
          position: 'fixed',
          top: tooltipTop,
          bottom: tooltipBottom,
          left: tooltipLeft,
          width: 340,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(2,6,23,0.35)',
          padding: '18px 18px 14px',
          animation: '_tour-in 240ms ease',
          fontFamily: 'inherit',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0F6B4F' }}>
          Visite guidée · {shown}/{total}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{step.title}</p>
        <p style={{ margin: '6px 0 0', fontSize: 13.5, lineHeight: 1.6, color: '#475569' }}>{step.text}</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <button
            type="button"
            onClick={finish}
            style={{ background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 600, color: '#94a3b8', cursor: 'pointer' }}
          >
            Passer la visite
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : goTo(stepIndex + 1))}
            style={{
              background: '#0F6B4F', color: '#fff', border: 'none', borderRadius: 12,
              padding: '10px 18px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {isLast ? 'C\'est parti !' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
