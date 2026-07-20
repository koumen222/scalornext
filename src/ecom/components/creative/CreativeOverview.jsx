import React, { useState, useEffect } from 'react';
import {
  Wand2, Image as ImageIcon, Video, Images, Wallet, ArrowRight, Store, Clapperboard,
  Sparkles, Upload, Download, FileText, Lightbulb, Mic,
} from 'lucide-react';
import { tp } from '../../i18n/platform.js';
import { ACCENTS } from './creativeShared.jsx';
import creativeApi from '../../services/creativeApi.js';

const MODULES = [
  {
    tab: 'text', kind: 'text', icon: Wand2, title: tp('Studio Texte'),
    desc: tp('Descriptions produit, hooks pub, scripts, emails et messages WhatsApp.'),
    tags: [tp('Copy AIDA'), tp('Hooks'), tp('Scripts')],
  },
  {
    tab: 'image', kind: 'image', icon: ImageIcon, title: tp('Studio Affiches'),
    desc: tp('Des visuels publicitaires prêts à poster à partir d\'une image ou d\'un lien.'),
    tags: [tp('7 formats'), tp('Templates'), 'HD'],
  },
  {
    tab: 'video', kind: 'video', icon: Video, title: tp('Studio Vidéo'),
    desc: tp('Vidéos courtes UGC, démo et promo pour TikTok, Reels et YouTube.'),
    tags: ['UGC', tp('Voix-off'), '9:16'],
  },
  {
    tab: 'montage', kind: 'montage', icon: Clapperboard, title: tp('Studio Montage'),
    desc: tp('Assemble tes clips et voix off en une vidéo créative, scène par scène.'),
    tags: [tp('Timeline'), tp('Sous-titres'), tp('Musique')],
  },
];

const STEPS = [
  { icon: Upload, title: tp('Importe ton produit'), desc: tp('Une image ou un lien : l\'IA récupère nom, prix et visuels.') },
  { icon: Sparkles, title: tp('Choisis un studio'), desc: tp('Texte, affiche, vidéo ou montage — selon ce que tu veux créer.') },
  { icon: Download, title: tp('Génère & poste'), desc: tp('Télécharge tes créations, prêtes à publier sur tes réseaux.') },
];

const TIPS = [
  tp('Un bon hook capte l\'attention dans les 3 premières secondes.'),
  tp('Teste 3 visuels différents par produit, garde celui qui convertit.'),
  tp('Le format 9:16 performe mieux sur TikTok, Reels et Shorts.'),
];

// Type + miniature d'un asset de la galerie
function assetView(a) {
  const type = a.type || (a.videoUrl ? 'video' : a.imageUrl ? 'image' : a.audioUrl ? 'voice' : a.content ? 'text' : 'other');
  const img = type === 'video' ? (a.thumbnailUrl || a.imageUrl || '') : (a.imageUrl || '');
  return { type, img };
}
const TYPE_ICON = { image: ImageIcon, video: Video, text: FileText, voice: Mic, other: Sparkles };

const CreativeOverview = ({ credits, onNavigate, onNeedCredits, onImport }) => {
  const [total, setTotal] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await creativeApi.gallery.list({ page: 1, limit: 6 });
        if (!alive) return;
        setTotal(res?.data?.total ?? 0);
        setRecent(Array.isArray(res?.data?.assets) ? res.data.assets : []);
      } catch {
        if (alive) { setTotal(0); setRecent([]); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-7">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 text-white p-5 sm:p-6">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-primary-400/25 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Creative Center</h1>
            <p className="text-white/60 text-[13px] mt-1 max-w-md">{tp('Crée tout le contenu de vente autour de ton produit : textes, affiches et vidéos, propulsés par l\'IA.')}</p>
          </div>
          <button onClick={onImport} className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-card text-primary-800 text-[13px] font-semibold hover:bg-card/90 transition-colors">
            <Store size={15} /> {tp('Importer un produit')}
          </button>
        </div>
      </div>

      {/* ── Mini dashboard ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-card rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5"><Wallet size={15} /><span className="text-[12px] font-medium">{tp('Crédits')}</span></div>
          <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{credits ?? '—'}</p>
          <button onClick={onNeedCredits} className="mt-2 text-[12px] font-semibold text-primary hover:text-primary inline-flex items-center gap-1">{tp('Recharger')} <ArrowRight size={12} /></button>
        </div>
        <div className="bg-card rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5"><Images size={15} /><span className="text-[12px] font-medium">{tp('Créations')}</span></div>
          <p className="text-2xl font-bold text-foreground tabular-nums leading-none">{loading ? '—' : total}</p>
          <button onClick={() => onNavigate?.('galerie')} className="mt-2 text-[12px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1">{tp('Ma galerie')} <ArrowRight size={12} /></button>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-card rounded-2xl border shadow-sm p-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5"><Sparkles size={15} /><span className="text-[12px] font-medium">{tp('Studios IA')}</span></div>
          <p className="text-2xl font-bold text-foreground tabular-nums leading-none">8</p>
          <p className="mt-2 text-[12px] text-muted-foreground truncate">{tp('Texte · Affiches · Vidéo · Voix…')}</p>
        </div>
      </div>

      {/* ── Comment ça marche ── */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 px-0.5">{tp('Comment ça marche')}</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-card rounded-2xl border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary-50 text-primary text-[12px] font-bold flex items-center justify-center">{i + 1}</span>
                  <Icon size={16} className="text-gray-300" />
                </div>
                <p className="text-[13px] font-semibold text-foreground">{s.title}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Les studios ── */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 px-0.5">{tp('Les studios')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {MODULES.map(m => {
            const a = ACCENTS[m.kind]; const Icon = m.icon;
            return (
              <button key={m.tab} onClick={() => onNavigate?.(m.tab)}
                className="group text-left bg-card rounded-2xl border shadow-sm p-3.5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-9 h-9 rounded-xl ${a.bg} flex items-center justify-center shrink-0`}><Icon size={17} className={a.text} /></div>
                  <h3 className="text-[13px] font-bold text-foreground leading-tight min-w-0">{m.title}</h3>
                </div>
                <p className="text-[11.5px] text-muted-foreground leading-snug line-clamp-2">{m.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.tags.map(t => <span key={t} className="text-[9.5px] font-medium text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded">{t}</span>)}
                </div>
                <span className={`inline-flex items-center gap-1 text-[11.5px] font-semibold mt-2.5 ${a.text}`}>
                  {tp('Ouvrir')} <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Créations récentes ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 className="text-sm font-bold text-foreground">{tp('Créations récentes')}</h2>
          {recent.length > 0 && (
            <button onClick={() => onNavigate?.('galerie')} className="text-[12px] font-semibold text-primary hover:text-primary inline-flex items-center gap-1">{tp('Voir tout')} <ArrowRight size={12} /></button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[...Array(6)].map((_, i) => <div key={i} className="aspect-square rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : recent.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {recent.map(a => {
              const { type, img } = assetView(a);
              const Icon = TYPE_ICON[type] || Sparkles;
              return (
                <button key={a._id} onClick={() => onNavigate?.('galerie')}
                  className="group relative aspect-square rounded-2xl overflow-hidden border border-border bg-background hover:shadow-md transition-shadow">
                  {img ? (
                    <img src={img} alt={a.label || ''} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      {type === 'text'
                        ? <p className="text-[10px] text-muted-foreground line-clamp-4 leading-snug">{a.content}</p>
                        : <Icon size={22} className="text-gray-300" />}
                    </div>
                  )}
                  {type === 'video' && (
                    <span className="absolute bottom-1 right-1 text-[8px] font-bold uppercase bg-black/60 text-white px-1 py-0.5 rounded">{tp('Vidéo')}</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center">
            <div className="w-11 h-11 rounded-2xl bg-background flex items-center justify-center mx-auto mb-3"><Images size={20} className="text-gray-300" /></div>
            <p className="text-[13px] font-semibold text-foreground">{tp('Aucune création pour l\'instant')}</p>
            <p className="text-[12px] text-muted-foreground mt-0.5 mb-4">{tp('Importe un produit et lance ton premier studio.')}</p>
            <button onClick={onImport} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-white text-[12.5px] font-semibold hover:bg-primary transition-colors">
              <Store size={14} /> {tp('Importer un produit')}
            </button>
          </div>
        )}
      </div>

      {/* ── Astuces ── */}
      <div>
        <h2 className="text-sm font-bold text-foreground mb-3 px-0.5">{tp('Astuces')}</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {TIPS.map((t, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-primary/10/60 border border-primary/20 rounded-2xl p-4">
              <Lightbulb size={16} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[12.5px] text-muted-foreground leading-snug">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreativeOverview;
