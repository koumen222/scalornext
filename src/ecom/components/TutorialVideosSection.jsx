import React, { useState } from 'react';
import { PlayCircle, ChevronDown, X } from 'lucide-react';
import { FEATURED_TUTORIALS, OTHER_TUTORIALS } from '../config/tutorialVideos.js';
import { tp } from '../i18n/platform.js';

/**
 * Section vidéos tutorielles Scalor (config/tutorialVideos.js).
 * 2 cartes mises en avant + liste dépliable des autres fonctionnalités.
 * Une vidéo sans youtubeId est affichée « Bientôt disponible » (non cliquable).
 */

export const VideoPlayerModal = ({ video, onClose }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 px-4" onClick={onClose}>
    <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-white">{video.title}</p>
        <button type="button" onClick={onClose} className="rounded-full bg-card/10 p-2 text-white hover:bg-card/20 transition">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
          title={video.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  </div>
);

const TutorialVideoCard = ({ video, onPlay }) => {
  const available = Boolean(video.youtubeId);
  return (
    <button
      type="button"
      onClick={() => available && onPlay(video)}
      disabled={!available}
      className={`group w-full rounded-lg border p-3 text-left transition-all ${
        available
          ? 'border-slate-200 bg-card hover:border-emerald-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] cursor-pointer'
          : 'border-slate-100 bg-slate-50/60 cursor-default'
      }`}
    >
      <div className={`relative mb-3 flex h-24 items-center justify-center rounded-lg ${available ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <PlayCircle className={`h-9 w-9 transition-transform ${available ? 'text-white group-hover:scale-110' : 'text-slate-300'}`} />
        {!available && (
          <span className="absolute bottom-2 right-2 rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
            {tp('Bientôt disponible')}
          </span>
        )}
      </div>
      <p className={`text-[13px] font-bold ${available ? 'text-slate-950' : 'text-slate-500'}`}>{video.title}</p>
      <p className="mt-0.5 text-xs leading-5 text-slate-500">{video.desc}</p>
    </button>
  );
};

const TutorialVideosSection = () => {
  const [playing, setPlaying] = useState(null);
  const [showAll, setShowAll] = useState(false);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tp('Premiers pas')}</p>
      <h4 className="mt-1 text-base font-black text-slate-950">{tp('Apprenez en vidéo')}</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {FEATURED_TUTORIALS.map((v) => (
          <TutorialVideoCard key={v.key} video={v} onPlay={setPlaying} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowAll((s) => !s)}
        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-800"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
        {showAll ? tp('Masquer les autres vidéos') : tp('Toutes les vidéos d\'explication')}
      </button>
      {showAll && (
        <div className="mt-3 space-y-1.5">
          {OTHER_TUTORIALS.map((v) => {
            const available = Boolean(v.youtubeId);
            return (
              <button
                key={v.key}
                type="button"
                disabled={!available}
                onClick={() => available && setPlaying(v)}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  available ? 'border-slate-200 bg-card hover:border-emerald-300' : 'border-slate-100 bg-slate-50/60 cursor-default'
                }`}
              >
                <PlayCircle className={`h-4 w-4 flex-shrink-0 ${available ? 'text-emerald-700' : 'text-slate-300'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${available ? 'text-slate-900' : 'text-slate-500'}`}>{v.title}</p>
                  <p className="truncate text-[11px] text-slate-400">{v.desc}</p>
                </div>
                {!available && (
                  <span className="flex-shrink-0 rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                    {tp('Bientôt')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {playing && <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
};

export default TutorialVideosSection;
