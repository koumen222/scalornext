import React, { useEffect, useRef, useState } from 'react';
import { Link2, Loader2, Wand2, AlertCircle, CheckCircle2, RefreshCw, Store, Trash2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { featureCost, getInsufficientCredits, CostChip } from './creativeShared.jsx';

/**
 * CloneStudio — clonage d'une page produit concurrente.
 * URL → extraction (structure, infos, images) → l'IA réécrit une fiche
 * ORIGINALE + régénère des images produit similaires → aperçu éditable →
 * création d'un produit boutique (brouillon). Aucun copier-coller du concurrent.
 */

const STEP_LABELS = {
  start: tp('Préparation…'),
  scrape: tp('Lecture de la page concurrente…'),
  rewrite: tp('Réécriture de la fiche (originale)…'),
  images: tp('Régénération des images par IA…'),
  done: tp('Terminé'),
};

const CloneStudio = ({ onCreated = null }) => {
  const [url, setUrl] = useState('');
  const [maxImages, setMaxImages] = useState(4);
  const [job, setJob] = useState(null); // { status, step, progress, result, warning, error }
  const [draft, setDraft] = useState(null); // aperçu éditable
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null); // { productId, slug }
  const pollRef = useRef(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const start = async () => {
    if (!/^https?:\/\/.+\..+/.test(url.trim())) { setError(tp('Colle l’URL complète de la page produit concurrente.')); return; }
    setError(''); setSaved(null); setDraft(null);
    setJob({ status: 'running', step: 'start', progress: 3 });
    try {
      const { data } = await creativeApi.clone.create({ url: url.trim(), maxImages });
      if (!data?.success || !data.jobId) throw new Error(data?.message || tp('Lancement impossible'));
      const jobId = data.jobId;
      let misses = 0;
      pollRef.current = setInterval(async () => {
        try {
          const r = await creativeApi.clone.job(jobId);
          if (r.status === 404) { misses += 1; if (misses >= 5) { clearInterval(pollRef.current); setJob({ status: 'error', error: tp('Job perdu — relance.') }); } return; }
          misses = 0;
          const j = r.data;
          setJob(j);
          if (j.status !== 'running') {
            clearInterval(pollRef.current);
            if (j.status === 'done' && j.result) setDraft(j.result);
          }
        } catch { /* réseau : retry au tick suivant */ }
      }, 2500);
    } catch (e) {
      setJob(null);
      const insuff = getInsufficientCredits(e);
      if (insuff) setError(insuff.message || tp('Crédits insuffisants — rechargez depuis le Creative Center (Paramètres).'));
      else setError(e?.response?.data?.message || e.message);
    }
  };

  const reset = () => { if (pollRef.current) clearInterval(pollRef.current); setJob(null); setDraft(null); setError(''); setSaved(null); };

  const save = async () => {
    if (!draft?.name?.trim()) { setError(tp('Le produit doit avoir un nom.')); return; }
    setSaving(true); setError('');
    try {
      const { data } = await creativeApi.clone.save(draft);
      if (!data?.success) throw new Error(data?.message || tp('Création impossible'));
      setSaved({ productId: data.productId, slug: data.slug });
      onCreated?.(data); // rafraîchit la liste des produits (usage en modal)
    } catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setSaving(false); }
  };

  const patch = (p) => setDraft((d) => ({ ...d, ...p }));
  const removeImage = (k) => setDraft((d) => ({ ...d, images: d.images.filter((_, i) => i !== k) }));

  const card = 'rounded-2xl border border-border bg-card p-4';
  const input = 'w-full rounded-xl border border-border px-3 py-2.5 text-[13px] outline-none focus:border-primary/40';

  return (
    <div className="space-y-4 max-w-3xl">
      <div className={card}>
        <p className="text-[15px] font-bold text-foreground">{tp('Cloner une page produit')}</p>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">{tp('Colle l’URL d’un produit concurrent. L’IA en tire une fiche ORIGINALE (texte réécrit, meilleur SEO) et régénère des images produit similaires mais neuves — sans copier ses photos ni son texte.')}</p>
      </div>

      {/* Entrée URL */}
      {!draft && (
        <div className={card}>
          <div className="flex items-center gap-2 mb-2">
            <Link2 size={15} className="text-primary shrink-0" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !job) start(); }}
              placeholder="https://boutique-concurrente.com/products/…" className={input} disabled={job?.status === 'running'} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-[12px] text-muted-foreground inline-flex items-center gap-2">
              {tp('Images à régénérer')}
              <select value={maxImages} onChange={(e) => setMaxImages(Number(e.target.value))} disabled={job?.status === 'running'}
                className="h-8 rounded-lg border border-border px-2 text-[12px] outline-none focus:border-primary/40">
                {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            {!job || job.status === 'error' ? (
              <button onClick={start} disabled={!url.trim()}
                className="h-10 px-5 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-2 hover:bg-primary-700 transition disabled:opacity-40">
                <Wand2 size={15} /> {tp('Cloner la page')} <CostChip cost={featureCost('clone')} />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {error && <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}</div>}

      {/* Progression */}
      {job && job.status === 'running' && (
        <div className={card}>
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="animate-spin text-primary" />
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-foreground">{STEP_LABELS[job.step] || tp('Traitement…')}</p>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${job.progress || 3}%` }} /></div>
            </div>
            <span className="text-[12px] font-bold text-muted-foreground tabular-nums">{job.progress || 3}%</span>
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">{tp('Compte 1 à 3 minutes selon le nombre d’images.')}</p>
        </div>
      )}

      {job && job.status === 'error' && !draft && (
        <div className={card}>
          <div className="flex items-start gap-2 text-[12.5px] text-red-700"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {job.error || tp('Clonage impossible')}</div>
          <button onClick={reset} className="mt-3 h-9 px-4 rounded-xl border border-border text-[12.5px] font-semibold text-foreground hover:bg-background inline-flex items-center gap-1.5"><RefreshCw size={13} /> {tp('Réessayer')}</button>
        </div>
      )}

      {/* Aperçu éditable */}
      {draft && !saved && (
        <>
          {job?.warning && <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-[12px] text-primary"><AlertCircle size={15} className="mt-0.5 shrink-0" /> {job.warning}</div>}

          <div className={card}>
            <p className="text-[13px] font-bold text-foreground mb-3">{tp('Aperçu — vérifie et ajuste avant de créer')}</p>

            {/* Images régénérées */}
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">{tp('Images générées')} ({draft.images.length})</p>
            {draft.images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {draft.images.map((im, k) => (
                  <div key={im.url} className="relative group">
                    <img src={im.url} alt="" className="w-full aspect-[4/5] rounded-lg object-cover border border-border" />
                    <button onClick={() => removeImage(k)} className="absolute top-1 right-1 rounded-full bg-gray-900/80 p-1 text-white opacity-0 group-hover:opacity-100 transition" title={tp('Retirer')}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-background px-3 py-3 text-[12px] text-muted-foreground"><ImageIcon size={15} /> {tp('Aucune image régénérée — tu pourras en ajouter dans la fiche produit.')}</div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tp('Nom')}</label>
                <input value={draft.name} onChange={(e) => patch({ name: e.target.value })} className={`${input} mt-1`} />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tp('Prix')} ({draft.currency})</label>
                <input type="number" value={draft.price} onChange={(e) => patch({ price: Number(e.target.value) || 0 })} className={`${input} mt-1`} />
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tp('Description')}</label>
              <textarea value={draft.description} onChange={(e) => patch({ description: e.target.value })} rows={5} className={`${input} mt-1 resize-y`} />
            </div>

            {draft.features?.length > 0 && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{tp('Points forts')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.features.map((f, k) => <span key={k} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11.5px] font-medium"><CheckCircle2 size={12} /> {f.text}</span>)}
                </div>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>{tp('FAQ')} : {draft.faq?.length || 0}</span>
              <span>{tp('Avis')} : {draft.testimonials?.length || 0}</span>
              <span>{tp('SEO')} : {draft.seoTitle ? '✓' : '—'}</span>
              <span>{tp('Images concurrentes trouvées')} : {draft.sourceImagesFound ?? 0}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={save} disabled={saving} className="h-11 px-5 rounded-xl bg-primary text-white text-[13.5px] font-bold inline-flex items-center gap-2 hover:bg-primary-700 transition disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Store size={16} />} {tp('Créer dans ma boutique (brouillon)')}
            </button>
            <button onClick={reset} className="h-11 px-4 rounded-xl border border-border text-[13px] font-semibold text-foreground hover:bg-background inline-flex items-center gap-1.5"><RefreshCw size={14} /> {tp('Cloner une autre page')}</button>
          </div>
        </>
      )}

      {/* Créé */}
      {saved && (
        <div className={card}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-primary"><CheckCircle2 size={17} /> {tp('Produit créé en brouillon dans ta boutique.')}</div>
          <p className="text-[12px] text-muted-foreground mt-1">{tp('Vérifie la fiche, complète la page si besoin, puis publie-la depuis Boutique → Produits.')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="/ecom/boutique/products" className="h-10 px-4 rounded-xl bg-primary text-white text-[13px] font-bold inline-flex items-center gap-2 hover:bg-primary-700 transition">{tp('Voir mes produits')} <ArrowRight size={14} /></a>
            <button onClick={reset} className="h-10 px-4 rounded-xl border border-border text-[13px] font-semibold text-foreground hover:bg-background inline-flex items-center gap-1.5"><RefreshCw size={14} /> {tp('Cloner une autre page')}</button>
          </div>
        </div>
      )}

      <p className="text-[10.5px] text-muted-foreground leading-relaxed">{tp('Bon usage : t’inspirer d’un produit gagnant, pas copier une marque. Le texte est réécrit et les images régénérées pour rester originaux. Ne clone pas de marque déposée, de logo ni de nom protégé.')}</p>
    </div>
  );
};

export default CloneStudio;
