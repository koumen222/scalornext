import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Languages, Upload, X, Loader2, AlertCircle, CheckCircle, Download,
  Mic, Subtitles, Volume2, Film, RotateCcw, Sparkles, FileText, Clapperboard, AudioLines,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { ACCENTS, StudioHeader, Field, EmptyState, downloadFile, featureCost, getInsufficientCredits, CostChip } from './creativeShared.jsx';

const A = ACCENTS.translation;
const POLL_MS = 3000;
const MAX_BYTES = 200 * 1024 * 1024;

// Fallbacks si /meta/options ne répond pas (l'UI reste utilisable).
const FALLBACK_LANGS = [
  { code: 'en', name: 'Anglais' }, { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Espagnol' }, { code: 'pt', name: 'Portugais' },
  { code: 'ar', name: 'Arabe' }, { code: 'de', name: 'Allemand' },
];
const FALLBACK_VOICES = [
  { id: 'alloy', label: 'Alloy (neutre)' }, { id: 'nova', label: 'Nova (féminine)' },
  { id: 'onyx', label: 'Onyx (masculine grave)' },
];

// Étapes du pipeline mappées sur le % renvoyé par le backend.
// [start, end[ : borne de progression globale couverte par l'étape.
const STEPS = [
  { key: 'upload',    label: tp('Envoi & extraction audio'), icon: AudioLines,   start: 0,  end: 22 },
  { key: 'transcribe',label: tp('Transcription'),            icon: FileText,     start: 22, end: 42 },
  { key: 'translate', label: tp('Traduction isochrone'),     icon: Languages,    start: 42, end: 46 },
  { key: 'dub',       label: tp('Doublage précis'),          icon: Mic,          start: 46, end: 84 },
  { key: 'render',    label: tp('Sous-titres, montage & publication'), icon: Clapperboard, start: 84, end: 100 },
];

const TranslationStudio = ({ credits = null, onCreditsChange = null, onNeedCredits = null }) => {
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [langs, setLangs] = useState(FALLBACK_LANGS);
  const [voices, setVoices] = useState(FALLBACK_VOICES);
  const [targetLang, setTargetLang] = useState('en');
  const [voice, setVoice] = useState('alloy');
  const [keepOriginalAudio, setKeepOriginalAudio] = useState(false);
  const [burnSubtitles, setBurnSubtitles] = useState(false);

  const [job, setJob] = useState(null);       // { status, stage, progress, videoUrl, srtUrl, ... }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef(null);
  const pollRef = useRef(null);

  // Langues & voix depuis le backend (source de vérité).
  useEffect(() => {
    creativeApi.translation.options()
      .then((r) => {
        if (r.data?.languages?.length) setLangs(r.data.languages);
        if (r.data?.voices?.length) setVoices(r.data.voices);
      })
      .catch(() => { /* fallbacks conservés */ });
  }, []);

  // Nettoyage au démontage.
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
  }, [videoPreview]);

  const pickFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('video/')) { setError(tp('Fichier vidéo requis (mp4, mov, webm…).')); return; }
    if (f.size > MAX_BYTES) { setError(tp('Vidéo trop lourde (max 200 Mo).')); return; }
    setError('');
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(f);
    setVideoPreview(URL.createObjectURL(f));
    setJob(null);
  };

  const reset = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null); setVideoPreview(null); setJob(null); setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const pollJob = useCallback((jobId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const r = await creativeApi.translation.job(jobId);
        if (r.status === 404) return;               // job pas encore visible
        const j = r.data?.job;
        if (!j) return;
        setJob(j);
        if (j.status === 'done' || j.status === 'error') {
          clearInterval(pollRef.current); pollRef.current = null;
          if (j.status === 'error') setError(j.error || tp('Échec de la traduction.'));
        }
      } catch (err) {
        clearInterval(pollRef.current); pollRef.current = null;
        setError(err.response?.data?.message || tp('Suivi du job interrompu.'));
      }
    }, POLL_MS);
  }, []);

  const handleSubmit = async () => {
    if (!video) { setError(tp('Ajoute une vidéo d’abord.')); return; }
    if (typeof credits === 'number' && credits < featureCost('translation')) { onNeedCredits?.(); return; }
    setSubmitting(true);
    setError('');
    setJob({ status: 'processing', stage: tp('Envoi de la vidéo…'), progress: 1 });
    try {
      const fd = new FormData();
      fd.append('video', video);
      fd.append('targetLang', targetLang);
      fd.append('voice', voice);
      fd.append('keepOriginalAudio', String(keepOriginalAudio));
      fd.append('burnSubtitles', String(burnSubtitles));
      const res = await creativeApi.translation.create(fd);
      const jobId = res.data?.jobId;
      if (!jobId) throw new Error(tp('Réponse serveur invalide.'));
      if (typeof res.data?.creditsRemaining === 'number') onCreditsChange?.(res.data.creditsRemaining);
      setJob({ status: 'processing', stage: tp('En file…'), progress: 2 });
      pollJob(jobId);
    } catch (err) {
      if (getInsufficientCredits(err)) onNeedCredits?.();
      setError(err.response?.data?.message || err.message || tp('Échec de l’envoi.'));
      setJob(null);
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || (job && job.status === 'processing');
  const done = job && job.status === 'done';

  return (
    <div>
      <StudioHeader
        icon={Languages}
        kind="translation"
        title={tp('Traduction & doublage vidéo')}
        subtitle={tp('Une vidéo → voix doublée + sous-titres traduits, synchronisés à l’image.')}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Colonne gauche : upload + réglages */}
        <div className="space-y-4">
          {!video ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0]); }}
              className={`w-full border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary/30 hover:${A.bg} transition`}
            >
              <Upload className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-foreground">{tp('Glisse une vidéo ou clique pour choisir')}</p>
              <p className="text-xs text-muted-foreground mt-1">{tp('MP4, MOV, WEBM — max 200 Mo')}</p>
            </button>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-black ring-1 ring-gray-100">
              <video src={videoPreview} controls className="w-full max-h-64 object-contain" />
              {!busy && (
                <button onClick={reset} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])} />

          <Field label={tp('Langue cible')} hint={tp('Langue source détectée auto')}>
            <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} disabled={busy}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary/30 disabled:bg-background">
              {langs.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </Field>

          <Field label={tp('Voix du doublage')}>
            <select value={voice} onChange={(e) => setVoice(e.target.value)} disabled={busy}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary/30 disabled:bg-background">
              {voices.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </Field>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 text-[13px] text-foreground cursor-pointer">
              <input type="checkbox" checked={keepOriginalAudio} disabled={busy}
                onChange={(e) => setKeepOriginalAudio(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary mt-0.5" />
              <Volume2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <span>
                {tp('Garder l’audio d’origine en fond')}
                <span className="block text-[11px] text-muted-foreground">
                  {tp('La voix d’origine reste alors audible sous le doublage. Laisse décoché pour n’entendre que la voix traduite.')}
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2.5 text-[13px] text-foreground cursor-pointer">
              <input type="checkbox" checked={burnSubtitles} disabled={busy}
                onChange={(e) => setBurnSubtitles(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary" />
              <Subtitles className="w-4 h-4 text-muted-foreground" />
              {tp('Incruster les sous-titres dans l’image')}
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-[13px] text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy || !video}
            className={`w-full ${A.solid} text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition`}
          >
            {busy ? <><Loader2 className="w-5 h-5 animate-spin" /> {tp('Traduction en cours…')}</>
              : <><Sparkles className="w-5 h-5" /> {tp('Traduire la vidéo')} <CostChip cost={featureCost('translation')} /></>}
          </button>
        </div>

        {/* Colonne droite : progression / résultat */}
        <div className="border border-border rounded-2xl p-5 min-h-[320px] flex flex-col">
          {!job && (
            <EmptyState
              icon={Film}
              title={tp('Le résultat s’affichera ici')}
              description={tp('Uploade une vidéo, choisis la langue, puis lance la traduction.')}
            />
          )}

          {job && job.status === 'processing' && (() => {
            const pct = Math.max(1, Math.min(100, job.progress || 0));
            return (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-semibold text-foreground">{tp('Traduction en cours…')}</p>
                  <span className={`text-xs font-bold ${A.text}`}>{Math.round(pct)}%</span>
                </div>

                <ol className="space-y-3">
                  {STEPS.map((s) => {
                    const status = pct >= s.end ? 'done' : (pct >= s.start ? 'active' : 'pending');
                    const local = status === 'done' ? 100
                      : status === 'active' ? Math.max(4, Math.round(((pct - s.start) / (s.end - s.start)) * 100))
                      : 0;
                    const Icon = s.icon;
                    return (
                      <li key={s.key} className="flex items-start gap-3">
                        {/* Pastille d'état */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition
                          ${status === 'done' ? 'bg-primary/12 text-primary'
                            : status === 'active' ? `${A.bg} ${A.text}`
                            : 'bg-muted text-gray-300'}`}>
                          {status === 'done' ? <CheckCircle className="w-4 h-4" />
                            : status === 'active' ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Icon className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[13px] font-medium truncate
                              ${status === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {s.label}
                            </span>
                            {status === 'active' && <span className="text-[11px] text-muted-foreground">{local}%</span>}
                          </div>
                          {/* Barre par étape */}
                          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500
                              ${status === 'done' ? 'bg-primary' : A.solid}`}
                              style={{ width: `${local}%` }} />
                          </div>
                          {/* Détail fin renvoyé par le backend (ex. « Doublage (2/8) ») */}
                          {status === 'active' && job.stage && (
                            <p className="text-[11px] text-muted-foreground mt-1 truncate">{job.stage}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>

                <p className="text-xs text-muted-foreground mt-5">
                  {tp('Le doublage peut prendre quelques minutes selon la durée de la vidéo.')}
                </p>
              </div>
            );
          })()}

          {done && (
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-3">
                <CheckCircle className="w-5 h-5" /> {tp('Traduction terminée')}
              </div>
              <video src={job.videoUrl} controls className="w-full rounded-xl bg-black max-h-72 object-contain ring-1 ring-gray-100" />
              <div className="text-xs text-muted-foreground mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {job.sourceLang && <span>{tp('Source')} : <b className="uppercase">{job.sourceLang}</b></span>}
                {job.targetLang && <span>{tp('Cible')} : <b className="uppercase">{job.targetLang}</b></span>}
                {job.segmentCount ? <span>{job.segmentCount} {tp('segments')}</span> : null}
                {job.durationSec ? <span>{job.durationSec}s</span> : null}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => downloadFile(job.videoUrl, `traduction-${job.targetLang || 'video'}.mp4`)}
                  className={`flex items-center gap-2 ${A.solid} text-white text-sm font-medium rounded-lg px-4 py-2 hover:opacity-90`}>
                  <Download className="w-4 h-4" /> {tp('Vidéo doublée')}
                </button>
                {job.srtUrl && (
                  <button onClick={() => downloadFile(job.srtUrl, `sous-titres-${job.targetLang || 'video'}.srt`)}
                    className="flex items-center gap-2 border border-border text-foreground text-sm font-medium rounded-lg px-4 py-2 hover:bg-background">
                    <Subtitles className="w-4 h-4" /> {tp('Sous-titres (.srt)')}
                  </button>
                )}
                <button onClick={reset}
                  className="flex items-center gap-2 text-muted-foreground text-sm rounded-lg px-3 py-2 hover:bg-background">
                  <RotateCcw className="w-4 h-4" /> {tp('Nouvelle vidéo')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationStudio;
