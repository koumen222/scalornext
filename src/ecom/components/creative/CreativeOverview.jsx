import React from 'react';
import {
  Wand2, Image as ImageIcon, Video, Images, Wallet, ArrowRight, Store, Clapperboard,
} from 'lucide-react';
import { tp } from '../../i18n/platform.js';
import { ACCENTS } from './creativeShared.jsx';

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

const CreativeOverview = ({ credits, onNavigate, onNeedCredits, onImport }) => {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-primary-900 text-white p-5 sm:p-6">
        <div className="absolute -right-12 -top-12 w-52 h-52 rounded-full bg-primary-400/25 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Creative Center</h1>
            <p className="text-white/60 text-[13px] mt-1">{tp('Texte, affiches et vidéos autour de votre produit.')}</p>
          </div>
          <button onClick={onImport} className="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-primary-800 text-[13px] font-semibold hover:bg-white/90 transition-colors">
            <Store size={15} /> {tp('Importer un produit')}
          </button>
        </div>
      </div>

      {/* Modules */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map(m => {
          const a = ACCENTS[m.kind]; const Icon = m.icon;
          return (
            <button key={m.tab} onClick={() => onNavigate?.(m.tab)}
              className="group text-left bg-white rounded-3xl border border-gray-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${a.bg} flex items-center justify-center`}><Icon size={22} className={a.text} /></div>
              </div>
              <h3 className="text-base font-bold text-gray-900">{m.title}</h3>
              <p className="text-[13px] text-gray-400 mt-1 leading-snug">{m.desc}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {m.tags.map(t => <span key={t} className="text-[10.5px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">{t}</span>)}
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold mt-4 ${a.text}`}>
                {tp('Ouvrir')} <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Crédits + Galerie */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center shrink-0"><Wallet size={22} className="text-primary-600" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-gray-400">{tp('Crédits disponibles')}</p>
            <p className="text-2xl font-bold text-gray-900 leading-tight">{credits ?? '—'}</p>
          </div>
          <button onClick={onNeedCredits} className="h-10 px-4 rounded-xl bg-gray-900 text-white text-[13px] font-semibold hover:bg-gray-800 shrink-0">{tp('Recharger')}</button>
        </div>

        <button onClick={() => onNavigate?.('galerie')} className="group bg-white rounded-3xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow text-left">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center shrink-0"><Images size={22} className="text-gray-600" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900">{tp('Ma galerie')}</p>
            <p className="text-[13px] text-gray-400">{tp('Retrouvez toutes vos créations')}</p>
          </div>
          <ArrowRight size={18} className="text-gray-300 group-hover:translate-x-0.5 group-hover:text-gray-500 transition-all shrink-0" />
        </button>
      </div>
    </div>
  );
};

export default CreativeOverview;
