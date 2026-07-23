import React, { useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, CostChip } from './creativeShared.jsx';

/**
 * Assistant à étapes réutilisable pour les studios.
 * steps: [{ title, subtitle?, valid?, content }]
 * onFinish() est appelé sur « Générer » (dernière étape).
 */
export default function Wizard({ accent = ACCENTS.image, steps = [], finalLabel, busyLabel, onFinish, onBeforeNext, loading = false, cost }) {
  const [step, setStep] = useState(0);
  const last = steps.length - 1;

  // Si le nombre d'étapes change (rare), on borne l'index courant.
  useEffect(() => { if (step > last) setStep(Math.max(0, last)); }, [last, step]);

  const cur = steps[step] || {};
  const canNext = cur.valid !== false;

  const goNext = async () => {
    if (step === last) return onFinish?.();
    const sourceStep = step;
    setStep(s => Math.min(last, s + 1));
    await onBeforeNext?.(sourceStep);
  };
  const goBack = () => setStep(s => Math.max(0, s - 1));

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
      {/* Progression */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          {steps.map((s, i) => {
            const done = i < step; const active = i === step;
            return (
              <React.Fragment key={i}>
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors ${done ? `${accent.solid} text-white` : active ? `${accent.bg} ${accent.text} ring-2 ${accent.ring}` : 'bg-muted text-muted-foreground'}`}>
                    {done ? <Check size={13} /> : i + 1}
                  </div>
                  <span className={`text-[12px] font-semibold hidden md:block ${active ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{s.title}</span>
                </div>
                {i < last && <div className={`h-[2px] flex-1 rounded-full ${done ? accent.solid : 'bg-muted'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Contenu de l'étape */}
      <div className="p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-[15px] font-bold text-foreground">{cur.title}</h3>
          {cur.subtitle && <p className="text-[13px] text-muted-foreground mt-0.5">{cur.subtitle}</p>}
        </div>
        <div className="min-h-[180px]">{cur.content}</div>
      </div>

      {/* Navigation */}
      <div className="px-5 sm:px-6 py-4 border-t border-gray-50 flex items-center justify-between gap-3">
        <button onClick={goBack} disabled={step === 0 || loading}
          className="h-10 px-4 rounded-xl border border-border text-muted-foreground text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={15} /> {tp('Retour')}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-muted-foreground font-medium">{step + 1}/{steps.length}</span>
          <button onClick={goNext} disabled={!canNext || loading}
            className={`h-10 px-5 rounded-xl text-white text-[13px] font-semibold inline-flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${accent.solid}`}>
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> {busyLabel || tp('Traitement…')}</>
              : step === last
                ? <><Sparkles size={15} /> {finalLabel || tp('Générer')} <CostChip cost={cost} /></>
                : <>{tp('Continuer')} <ChevronRight size={15} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
