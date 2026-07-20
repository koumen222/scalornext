import React, { useState, useEffect, useCallback } from 'react';
import { Images, Loader2, Trash2, Copy, Check, ExternalLink, Clapperboard, Film, Image as ImageIcon, RefreshCw, Wand2, X, Sparkles } from 'lucide-react';
import { mediaLibraryApi } from '../services/storeApi.js';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';

/**
 * MediaLibrary — médiathèque des visuels générés par IA (workspace).
 * Toutes les images, GIF et vidéos générés (fiche produit, builders, scènes)
 * sont enregistrés automatiquement et retrouvables ici : copier l'URL,
 * ouvrir, retirer.
 */

const FILTERS = [
  { id: '', label: 'Tout', icon: Images },
  { id: 'image', label: 'Images', icon: ImageIcon },
  { id: 'gif', label: 'GIF', icon: Clapperboard },
  { id: 'video', label: 'Vidéos', icon: Film },
];

const KIND_LABELS = {
  'builder-image': 'Image IA',
  'scene-gif': 'GIF scène',
  'steps-gif': 'GIF mode d\'emploi',
  'scene-video': 'Vidéo scène',
};

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
};

/** Modal d'édition IA : repart de l'image générée (image-to-image) */
const EditImageModal = ({ item, onClose, onEdited }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (prompt.trim().length < 4 || loading) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await ecomApi.post('/builder-ai/generate-image', {
        prompt: prompt.trim(),
        sourceUrl: item.url,
        aspectRatio: 'auto',
      }, { timeout: 180000 });
      if (data?.success && typeof data.url === 'string') {
        onEdited(data.url);
      } else {
        setError(data?.message || tp('Modification impossible, réessayez'));
      }
    } catch (err) {
      setError(err?.response?.data?.message || tp('Modification impossible, réessayez'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/60 px-4" onClick={() => !loading && onClose()}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <Wand2 className="h-4 w-4 text-indigo-600" />
            {tp('Modifier cette image par IA')}
          </h3>
          <button type="button" onClick={onClose} disabled={loading} className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <div className="relative h-44 overflow-hidden rounded-xl bg-muted">
            <img src={item.url} alt="" className={`h-full w-full object-contain transition ${loading ? 'opacity-40' : ''}`} />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 text-[12px] font-bold text-slate-700">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                {tp('Modification en cours — 15 à 40 s…')}
              </div>
            )}
          </div>
          {!loading && (
            <>
              <textarea
                autoFocus
                rows={2}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(); } }}
                placeholder={tp('Décrivez la modification : « fond beige », « ajoute des fleurs autour », « éclaircis l\'image »…')}
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-indigo-400 focus:bg-card focus:ring-2 focus:ring-indigo-100"
              />
              {error && <p className="text-xs font-bold text-red-600">{error}</p>}
              <button
                type="button"
                disabled={prompt.trim().length < 4}
                onClick={run}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-40"
              >
                <Sparkles className="h-4 w-4" />
                {tp('Modifier l\'image')}
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                {tp('L\'original est conservé — la version modifiée s\'ajoute à la médiathèque.')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const MediaCard = ({ item, onDelete, onEdit }) => {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard indisponible */ }
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-square bg-background">
        {item.type === 'video' ? (
          <video src={item.url} muted loop playsInline preload="metadata" className="h-full w-full object-cover" onMouseEnter={(e) => e.target.play().catch(() => {})} onMouseLeave={(e) => e.target.pause()} />
        ) : (
          <img src={item.url} alt={item.prompt || ''} loading="lazy" className="h-full w-full object-cover" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
          {item.type === 'gif' ? 'GIF' : item.type === 'video' ? tp('Vidéo') : tp('Image')}
        </span>
        {/* Actions au survol */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <button type="button" onClick={copy} title={tp('Copier l\'URL')} className="rounded-lg bg-card/95 p-1.5 text-foreground shadow transition hover:bg-card">
            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <a href={item.url} target="_blank" rel="noopener noreferrer" title={tp('Ouvrir')} className="rounded-lg bg-card/95 p-1.5 text-foreground shadow transition hover:bg-card">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {item.type === 'image' && (
            <button type="button" onClick={() => onEdit(item)} title={tp('Modifier par IA')} className="rounded-lg bg-card/95 p-1.5 text-indigo-600 shadow transition hover:bg-card">
              <Wand2 className="h-3.5 w-3.5" />
            </button>
          )}
          {confirming ? (
            <button type="button" onClick={() => onDelete(item._id)} className="rounded-lg bg-red-600 px-2 py-1.5 text-[10px] font-black text-white shadow transition hover:bg-red-700">
              {tp('Confirmer')}
            </button>
          ) : (
            <button type="button" onClick={() => { setConfirming(true); setTimeout(() => setConfirming(false), 2500); }} title={tp('Retirer')} className="rounded-lg bg-card/95 p-1.5 text-red-500 shadow transition hover:bg-card">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-[11px] font-semibold text-foreground" title={item.prompt}>
          {item.prompt || KIND_LABELS[item.kind] || tp('Génération IA')}
        </p>
        <p className="text-[10px] text-muted-foreground">{KIND_LABELS[item.kind] || item.kind || 'IA'} · {tp('il y a')} {timeAgo(item.createdAt)}</p>
      </div>
    </div>
  );
};

const MediaLibrary = () => {
  const [items, setItems] = useState([]);
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const load = useCallback(async (nextPage = 1, nextType = type) => {
    nextPage === 1 ? setLoading(true) : setLoadingMore(true);
    try {
      const { data } = await mediaLibraryApi.list({ type: nextType || undefined, page: nextPage, limit: 24 });
      if (data?.success) {
        setItems((prev) => (nextPage === 1 ? data.data : [...prev, ...data.data]));
        setPage(data.page);
        setPages(data.pages);
        setTotal(data.total);
      }
    } catch { /* réseau */ } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [type]);

  useEffect(() => { load(1, type); }, [type]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    setItems((prev) => prev.filter((x) => x._id !== id));
    setTotal((t) => Math.max(0, t - 1));
    try { await mediaLibraryApi.remove(id); } catch { load(1, type); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-foreground">
            <Images className="h-5 w-5 text-primary" />
            {tp('Médiathèque IA')}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {tp('Tous vos visuels générés par IA — images, GIF et vidéos')} {total > 0 && <span className="font-bold text-foreground">({total})</span>}
          </p>
        </div>
        <button type="button" onClick={() => load(1, type)} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-background">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {tp('Actualiser')}
        </button>
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setType(f.id)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${type === f.id ? 'border-primary-600 bg-primary text-white' : 'border-border bg-card text-muted-foreground hover:border-primary-300'}`}
          >
            <f.icon className="h-3.5 w-3.5" />
            {tp(f.label)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-background py-20 text-center">
          <Images className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-bold text-muted-foreground">{tp('Aucun visuel généré pour le moment')}</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {tp('Générez des images ou des GIF depuis vos fiches produit et vos builders : ils apparaîtront automatiquement ici.')}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => <MediaCard key={item._id} item={item} onDelete={handleDelete} onEdit={setEditItem} />)}
          </div>
          {page < pages && (
            <div className="mt-6 text-center">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => load(page + 1, type)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground shadow-sm transition hover:bg-background disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {tp('Charger plus')}
              </button>
            </div>
          )}
        </>
      )}

      {editItem && (
        <EditImageModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onEdited={() => { setEditItem(null); load(1, type); }}
        />
      )}
    </div>
  );
};

export default MediaLibrary;
