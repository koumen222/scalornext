import React from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { tp } from '../i18n/platform.js';

const DEFAULT_FOOTER_ITEMS = [
  { icon: Lock, label: 'Paiement securise' },
  { icon: ShieldCheck, label: 'Activation instantanee' },
  { label: 'MoneyFusion' },
];

/**
 * Cadre commun des modals de paiement (crédits IA, plans, tarifs).
 * Design Scalor premium : header slate-950 avec liseré dégradé et carte
 * récapitulative intégrée, corps blanc scrollable, ligne de confiance.
 */
export default function PaymentModalFrame({
  onClose,
  eyebrow,
  title,
  subtitle,
  icon,
  // headerClassName conservé pour compat API — le design unifié l'ignore
  headerClassName,
  maxWidthClassName = 'max-w-md',
  summary,
  footerItems = DEFAULT_FOOTER_ITEMS,
  children,
}) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/70 p-3 sm:p-5 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-[0_18px_60px_rgba(15,23,42,0.35)] ${maxWidthClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── Header sombre ── */}
        <div className="relative shrink-0 overflow-hidden bg-slate-950 px-5 pb-5 pt-6 text-white sm:px-6">
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: 'linear-gradient(90deg, #0F6B4F, #38bdf8, #f59e0b)' }}
          />
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500 opacity-20 blur-3xl" />

          <div className="relative flex items-start gap-3">
            {icon ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 p-2.5 ring-1 ring-white/15">
                {icon}
              </div>
            ) : null}

            <div className="min-w-0 flex-1">
              {eyebrow ? (
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/50">{eyebrow}</p>
              ) : null}
              <h2 className="mt-0.5 text-lg font-black tracking-tight text-white">{title}</h2>
              {subtitle ? (
                <p className="mt-1 text-xs leading-5 text-white/60">{subtitle}</p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label={tp('Fermer')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Carte récapitulative intégrée */}
          {summary ? (
            <div className="relative mt-4 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.06] px-4 py-3">
              <div className="min-w-0">
                {summary.label ? (
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{summary.label}</p>
                ) : null}
                <div className="mt-0.5 flex items-baseline gap-2">
                  {summary.beforeValue ? (
                    <span className="text-sm text-white/40 line-through">{summary.beforeValue}</span>
                  ) : null}
                  <p className="text-2xl font-black tabular-nums text-white">{summary.value}</p>
                </div>
                {summary.meta ? (
                  <p className="mt-0.5 truncate text-xs text-white/60">{summary.meta}</p>
                ) : null}
              </div>
              {summary.badge ? (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                  {summary.badge}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* ── Body scrollable ── */}
        <div className="overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {/* ── Footer confiance ── */}
        {footerItems?.length ? (
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/60 px-5 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
              {footerItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <React.Fragment key={`${item.label}-${index}`}>
                    <span className="inline-flex items-center gap-1">
                      {Icon ? <Icon className="h-3 w-3" /> : null}
                      {item.label}
                    </span>
                    {index < footerItems.length - 1 ? <span>·</span> : null}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
