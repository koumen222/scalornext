import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from '@/lib/router-compat';
import { Check, ExternalLink, LayoutDashboard, PackagePlus, Sparkles } from 'lucide-react';
import { useStore } from '../contexts/StoreContext.jsx';
import { storesApi } from '../services/storeApi.js';
import TutorialVideosSection from '../components/TutorialVideosSection.jsx';
import { tp } from '../i18n/platform.js';

/**
 * Page dédiée de fin de création de boutique (/ecom/boutique/creation-reussie).
 * Même langage visuel que l'overlay du builder (panneau slate-950 + contenu) :
 * le wizard y redirige à 100 %, aucune redirection automatique ensuite.
 * Synchronise la liste des boutiques et bascule sur la nouvelle en arrière-plan.
 */

// ── Pluie de confettis (CSS pur, sans dépendance) ────────────────────────────
const CONFETTI_COLORS = ['#0F6B4F', '#10b981', '#38bdf8', '#f59e0b', '#f472b6', '#8b5cf6'];

const ConfettiBurst = ({ count = 130, durationMs = 7000 }) => {
  const [visible, setVisible] = useState(true);
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2.2,
    fall: 3.2 + Math.random() * 2.4,
    sway: 0.8 + Math.random() * 1.4,
    size: 6 + Math.random() * 6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    round: Math.random() > 0.6,
    spin: Math.random() > 0.5 ? 1 : -1,
  })), [count]);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="scs-confetti-fall absolute"
          style={{
            left: `${p.left}%`,
            top: '-24px',
            animationDuration: `${p.fall}s`,
            animationDelay: `${p.delay}s`,
          }}
        >
          <span
            className="scs-confetti-sway block"
            style={{
              width: `${p.size}px`,
              height: `${p.round ? p.size : p.size * 0.45}px`,
              backgroundColor: p.color,
              borderRadius: p.round ? '9999px' : '2px',
              animationDuration: `${p.sway}s`,
              '--scs-spin': `${p.spin * 540}deg`,
            }}
          />
        </span>
      ))}
      <style>{`
        @keyframes scs-confetti-fall {
          0% { transform: translateY(0); opacity: 0; }
          6% { opacity: 1; }
          88% { opacity: 1; }
          100% { transform: translateY(112vh); opacity: 0; }
        }
        .scs-confetti-fall {
          animation-name: scs-confetti-fall;
          animation-timing-function: cubic-bezier(0.25, 0.4, 0.55, 1);
          animation-fill-mode: forwards;
        }
        @keyframes scs-confetti-sway {
          0% { transform: translateX(-14px) rotate(0deg); }
          100% { transform: translateX(14px) rotate(var(--scs-spin, 540deg)); }
        }
        .scs-confetti-sway {
          animation-name: scs-confetti-sway;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-direction: alternate;
        }
      `}</style>
    </div>
  );
};

const StoreCreationSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { activeStore, refreshStores, switchStore } = useStore();
  const syncedRef = useRef(false);

  const subdomain = searchParams.get('sub') || activeStore?.subdomain || '';
  const storeName = searchParams.get('name') || activeStore?.name || tp('Votre boutique');
  const storeUrl = subdomain ? `https://${subdomain}.scalor.net` : 'https://scalor.net';
  const urlLabel = storeUrl.replace(/^https?:\/\//, '');

  // Synchronisation en arrière-plan : liste des boutiques + bascule sur la nouvelle
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    (async () => {
      try {
        await refreshStores?.();
        if (subdomain) {
          const freshRes = await storesApi.getStores();
          const freshList = freshRes.data?.data || [];
          const newOne = freshList.find((st) => st.subdomain === subdomain);
          if (newOne && newOne.subdomain !== activeStore?.subdomain) {
            switchStore?.(newOne);
          }
        }
      } catch {
        console.warn('Post-creation store sync failed, continuing');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f8f7] px-4 py-6 sm:px-6 lg:px-8">
      <ConfettiBurst />
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center">
        <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.12)]">
          <div className="grid lg:grid-cols-[0.92fr_1.08fr]">

            {/* ── Panneau gauche : célébration ── */}
            <section className="relative flex flex-col justify-between overflow-hidden border-b border-slate-100 bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 px-6 py-7 sm:px-8 lg:min-h-[620px] lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ background: 'linear-gradient(90deg, #0F6B4F, #38bdf8, #f59e0b)' }}
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,107,79,0.12) 1px, transparent 0)', backgroundSize: '26px 26px' }}
              />
              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-200 opacity-40 blur-3xl" />
              <div className="pointer-events-none absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-sky-200 opacity-30 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.25)]">
                    <Sparkles className="h-7 w-7 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tp('Scalor Builder')}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-900">{storeName}</p>
                  </div>
                </div>

                <div className="mt-10 sm:mt-14">
                  <div className="inline-flex min-h-[30px] items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/80 px-3.5 text-xs font-bold text-emerald-800">
                    <span className="scs-blink h-1.5 w-1.5 rounded-full bg-emerald-600" />
                    {tp('Boutique en ligne')}
                  </div>
                  <h1 className="mt-5 max-w-md text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                    {tp('Félicitations, votre boutique est prête !')}
                  </h1>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                    <span className="font-bold text-slate-900">{storeName}</span> {tp('est en ligne. Il ne reste plus qu\'à ajouter vos produits et lancer vos ventes.')}
                  </p>
                </div>

                {/* Carte adresse */}
                <div className="mt-9 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{tp('Votre adresse')}</p>
                      <a
                        href={storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block truncate text-lg font-black text-emerald-700 underline-offset-4 hover:underline"
                      >
                        {urlLabel}
                      </a>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white shadow-[0_10px_30px_rgba(16,185,129,0.35)]">
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative mt-8 flex items-center justify-between gap-3 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  {tp('Création terminée')} · 100%
                </span>
                <span className="hidden text-slate-300 sm:block">scalor.net</span>
              </div>

              <style>{`
                @keyframes scs-blink { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
                .scs-blink { animation: scs-blink 1.6s ease-in-out infinite; }
              `}</style>
            </section>

            {/* ── Panneau droit : actions + vidéos ── */}
            <section className="px-5 py-6 sm:px-7 lg:px-9 lg:py-9">
              <div className="border-b border-slate-100 pb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tp('Et maintenant ?')}</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">{tp('Lancez vos ventes')}</h3>
              </div>

              {/* Actions */}
              <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                <a
                  href={storeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  {tp('Voir la boutique')}
                </a>
                <button
                  type="button"
                  onClick={() => navigate('/ecom/boutique/products/new')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <PackagePlus className="h-4 w-4" />
                  {tp('Ajouter un produit')}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/ecom/boutique')}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {tp('Tableau de bord')}
                </button>
              </div>

              {/* Vidéos tutorielles */}
              <div className="mt-7 border-t border-slate-100 pt-6">
                <TutorialVideosSection />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreCreationSuccess;
