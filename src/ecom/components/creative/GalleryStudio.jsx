import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, Trash2, Loader2, AlertCircle, Image as ImageIcon, RefreshCw, ExternalLink,
  X, Play, FileText, Copy, Check, LayoutGrid, Video as VideoIcon, Sparkles, Mic, Rocket, Scissors,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { downloadFile, formatDate, EmptyState } from './creativeShared.jsx';
import { stashMontageProject } from './montageBridge.js';

const PAGE_SIZE = 24;

const FILTERS = [
  { id: 'all', label: tp('Tout'), icon: LayoutGrid },
  { id: 'image', label: tp('Images'), icon: ImageIcon },
  { id: 'video', label: tp('Vidéos'), icon: VideoIcon },
  { id: 'text', label: tp('Textes'), icon: FileText },
  { id: 'audio', label: tp('Audio'), icon: Mic },
  { id: 'launch', label: tp('Lancements'), icon: Rocket },
];

function assetType(a) {
  if (a.type) return a.type;
  if (a.videoUrl) return 'video';
  if (a.content && !a.imageUrl) return 'text';
  return 'image';
}

const GalleryStudio = ({ onNavigate }) => {
  const [assets, setAssets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchAssets = useCallback(async (p = 1, type = 'all') => {
    setLoading(true); setError('');
    try {
      const res = await creativeApi.gallery.list({ page: p, limit: PAGE_SIZE, type });
      setAssets(res.data.assets || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.error || err.message || tp('Erreur de chargement'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(1, filter); }, [fetchAssets, filter]);

  const handleDelete = async (id) => {
    if (!window.confirm(tp('Supprimer cet élément ?'))) return;
    setDeletingId(id);
    try {
      await creativeApi.gallery.remove(id);
      setAssets(prev => prev.filter(a => a._id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      setLightbox(null);
    } catch (err) {
      alert(err.response?.data?.error || tp('Erreur suppression'));
    } finally {
      setDeletingId(null);
    }
  };

  const copyText = (a) => { navigator.clipboard.writeText(a.content || ''); setCopiedId(a._id); setTimeout(() => setCopiedId(null), 1800); };

  // Rouvrir une vidéo dans l'éditeur : projet enregistré (scènes + réglages) si dispo,
  // sinon la vidéo est chargée comme un clip unique à retravailler.
  const editVideo = (asset) => {
    const rec = asset.meta || {};
    const scenes = (Array.isArray(rec.montageScenes) && rec.montageScenes.length)
      ? rec.montageScenes
      : [{ videoUrl: asset.videoUrl, durationSec: 5 }];
    stashMontageProject({ scenes, settings: rec.montageSettings || {} });
    onNavigate?.('montage');
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-foreground">{tp('Galerie')}</h2>
          <p className="text-[13px] text-muted-foreground">{tp('Toutes vos créations, au même endroit.')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">{total} {tp('élément(s)')}</span>
          <button onClick={() => fetchAssets(page, filter)} className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-background"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Filtres */}
      <div className="inline-flex bg-muted rounded-2xl p-1 mb-6">
        {FILTERS.map(f => {
          const Icon = f.icon;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`h-9 px-3.5 rounded-xl text-[13px] font-semibold inline-flex items-center gap-1.5 transition-all ${filter === f.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon size={14} className={filter === f.id ? 'text-primary' : ''} /> {f.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3 mb-6 text-sm">
          <AlertCircle size={16} className="shrink-0" /> {error}
          <button onClick={() => fetchAssets(page, filter)} className="ml-auto text-red-400 hover:text-red-600"><RefreshCw size={14} /></button>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2"><div className="h-3 bg-muted rounded w-3/4" /><div className="h-2 bg-muted rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && assets.length === 0 && !error && (
        <div className="bg-card rounded-3xl border border-border">
          <EmptyState
            icon={Sparkles}
            title={tp('Aucune création pour le moment')}
            description={tp('Générez du texte, des affiches ou des vidéos pour les retrouver ici.')}
            action={
              <button onClick={() => onNavigate?.('image')} className="inline-flex items-center gap-2 bg-primary text-white font-medium px-5 py-2.5 rounded-xl hover:bg-primary text-sm">
                <Sparkles size={14} /> {tp('Créer maintenant')}
              </button>
            }
          />
        </div>
      )}

      {!loading && assets.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {assets.map(asset => {
              const type = assetType(asset);
              return (
                <div key={asset._id} className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-md transition-shadow">
                  {type === 'launch' ? (
                    <div className="p-3.5 h-40 flex flex-col cursor-pointer bg-primary/10/40" onClick={() => setLightbox(asset)}>
                      <div className="flex items-center gap-1.5 mb-2 shrink-0">
                        <Rocket size={15} className="text-primary" />
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-primary/12 text-primary px-1.5 py-0.5 rounded">{tp('Lancement')} {asset.meta?.day || 'J1'}</span>
                      </div>
                      <p className="text-[11.5px] text-muted-foreground leading-snug line-clamp-4 flex-1 overflow-hidden">{asset.content}</p>
                    </div>
                  ) : type === 'text' ? (
                    <div className="p-3.5 h-40 flex flex-col cursor-pointer" onClick={() => setLightbox(asset)}>
                      <FileText size={16} className="text-primary mb-2 shrink-0" />
                      <p className="text-[11.5px] text-muted-foreground leading-snug line-clamp-5 flex-1 overflow-hidden">{asset.content}</p>
                    </div>
                  ) : type === 'audio' ? (
                    <div className="p-3.5 h-40 flex flex-col items-center justify-center gap-3 bg-primary/10/40">
                      <div className="w-11 h-11 rounded-2xl bg-primary/12 flex items-center justify-center"><Mic size={18} className="text-primary" /></div>
                      <audio src={asset.audioUrl} controls className="w-full h-8" />
                    </div>
                  ) : (
                    <div className="aspect-square relative overflow-hidden bg-background cursor-pointer" onClick={() => setLightbox(asset)}>
                      {(() => {
                        // Jamais de src vide (le navigateur re-téléchargerait la page).
                        // Vidéo sans miniature (ex. montage) : la 1re image du mp4 sert d'aperçu.
                        const thumb = type === 'video' ? (asset.thumbnailUrl || asset.imageUrl || '') : (asset.imageUrl || '');
                        if (thumb) {
                          return <img src={thumb} alt={asset.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />;
                        }
                        if (type === 'video' && asset.videoUrl) {
                          return <video src={asset.videoUrl} preload="metadata" muted playsInline className="w-full h-full object-cover" />;
                        }
                        return <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={26} /></div>;
                      })()}
                      {type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur flex items-center justify-center"><Play size={16} className="text-white fill-white ml-0.5" /></div>
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wide bg-card/90 text-muted-foreground px-1.5 py-0.5 rounded-md">{type}</span>
                    </div>
                  )}

                  <div className="p-3">
                    <p className="text-[12px] font-semibold text-foreground truncate">{asset.label || asset.title || asset.formatId || tp('Sans titre')}</p>
                    {asset.productName && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{asset.productName}</p>}
                    <p className="text-[10px] text-gray-300 mt-1">{formatDate(asset.createdAt)}</p>
                    <div className="flex gap-2 mt-2.5">
                      {type === 'text' || type === 'launch' ? (
                        <button onClick={() => copyText(asset)} className="flex-1 h-8 rounded-lg bg-primary text-white text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-primary-700">
                          {copiedId === asset._id ? <><Check size={11} /> {tp('Copié')}</> : <><Copy size={11} /> {tp('Copier le récap')}</>}
                        </button>
                      ) : type === 'audio' ? (
                        <button onClick={() => downloadFile(asset.audioUrl, `${asset.label || 'voix-off'}.mp3`)}
                          className="flex-1 h-8 rounded-lg bg-primary text-white text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-primary-700">
                          <Download size={11} /> {tp('Télécharger')}
                        </button>
                      ) : type === 'video' ? (
                        <>
                          <button onClick={() => editVideo(asset)}
                            className="flex-1 h-8 rounded-lg bg-primary text-white text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-primary-700">
                            <Scissors size={11} /> {tp('Éditer')}
                          </button>
                          <button onClick={() => downloadFile(asset.videoUrl, `${asset.label || 'video'}.mp4`)} title={tp('Télécharger')}
                            className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center hover:bg-gray-200 shrink-0">
                            <Download size={12} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => downloadFile(asset.imageUrl, `${asset.label || 'creative'}.png`)}
                          className="flex-1 h-8 rounded-lg bg-primary text-white text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-primary">
                          <Download size={11} /> {tp('Télécharger')}
                        </button>
                      )}
                      <button onClick={() => handleDelete(asset._id)} disabled={deletingId === asset._id}
                        className="w-8 h-8 flex items-center justify-center bg-background border border-border text-red-400 rounded-lg hover:bg-red-50 hover:border-red-100 disabled:opacity-50 shrink-0">
                        {deletingId === asset._id ? <Loader2 size={12} className="animate-spin text-muted-foreground" /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => fetchAssets(page - 1, filter)} disabled={page <= 1}
                className="h-9 px-4 text-sm font-medium bg-card border border-border rounded-xl hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed">← {tp('Précédent')}</button>
              <span className="text-sm text-muted-foreground px-2">{tp('Page')} {page} / {pages}</span>
              <button onClick={() => fetchAssets(page + 1, filter)} disabled={page >= pages}
                className="h-9 px-4 text-sm font-medium bg-card border border-border rounded-xl hover:bg-background disabled:opacity-40 disabled:cursor-not-allowed">{tp('Suivant')} →</button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="bg-card rounded-3xl overflow-hidden max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {assetType(lightbox) === 'launch' ? (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4"><Rocket size={18} className="text-primary" /><span className="font-semibold text-foreground">{lightbox.label || tp('Lancement produit')}</span></div>
                <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap mb-4">{lightbox.content}</p>
                {lightbox.meta?.launch && (
                  <div className="rounded-xl bg-primary/10/60 border border-primary/20 p-3 text-[12.5px] text-foreground space-y-1.5">
                    <p><b>{tp('Date')} :</b> {lightbox.meta.launchDate || '—'} · {lightbox.meta.day || 'J1'}</p>
                    <p><b>{tp('Angles')} :</b> {lightbox.meta.launch.counts?.angles ?? 0} · <b>{tp('Scripts')} :</b> {lightbox.meta.launch.counts?.scripts ?? 0} · <b>{tp('Voix-off')} :</b> {lightbox.meta.launch.counts?.voiceovers ?? 0} · <b>{tp('Affiches')} :</b> {lightbox.meta.launch.counts?.images ?? 0}</p>
                    {Array.isArray(lightbox.meta.launch.angles) && lightbox.meta.launch.angles.length > 0 && (
                      <div className="pt-1">
                        <p className="font-semibold mb-1">{tp('Angles marketing')} :</p>
                        <ul className="list-disc pl-4 space-y-0.5">{lightbox.meta.launch.angles.slice(0, 8).map((a, i) => <li key={i}>{a.title || String(a)}</li>)}</ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : assetType(lightbox) === 'text' ? (
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4"><FileText size={18} className="text-primary" /><span className="font-semibold text-foreground">{lightbox.label || lightbox.title || tp('Texte')}</span></div>
                <p className="text-[14px] leading-relaxed text-foreground whitespace-pre-wrap">{lightbox.content}</p>
              </div>
            ) : assetType(lightbox) === 'video' ? (
              <video src={lightbox.videoUrl} controls autoPlay className="w-full bg-black max-h-[70vh]" />
            ) : assetType(lightbox) === 'audio' ? (
              <div className="p-8 flex flex-col items-center gap-4 bg-primary/10/40">
                <div className="w-14 h-14 rounded-2xl bg-primary/12 flex items-center justify-center"><Mic size={24} className="text-primary" /></div>
                <audio src={lightbox.audioUrl} controls autoPlay className="w-full" />
              </div>
            ) : lightbox.imageUrl ? (
              <img src={lightbox.imageUrl} alt={lightbox.label} className="w-full aspect-square object-contain bg-background" />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center bg-background text-gray-300"><ImageIcon size={40} /></div>
            )}
            <div className="p-4 flex items-center justify-between gap-3 border-t border-gray-50">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{lightbox.label || lightbox.title}</p>
                {lightbox.productName && <p className="text-xs text-muted-foreground truncate">{lightbox.productName}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {assetType(lightbox) === 'text' || assetType(lightbox) === 'launch' ? (
                  <button onClick={() => copyText(lightbox)} className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-medium flex items-center gap-1.5 hover:bg-primary-700">
                    {copiedId === lightbox._id ? <Check size={14} /> : <Copy size={14} />} {tp('Copier')}
                  </button>
                ) : assetType(lightbox) === 'audio' ? (
                  <button onClick={() => downloadFile(lightbox.audioUrl, `${lightbox.label || 'voix-off'}.mp3`)}
                    className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-medium flex items-center gap-1.5 hover:bg-primary-700"><Download size={14} /> {tp('Télécharger')}</button>
                ) : (
                  <button onClick={() => downloadFile(assetType(lightbox) === 'video' ? lightbox.videoUrl : lightbox.imageUrl, `${lightbox.label || 'creative'}.${assetType(lightbox) === 'video' ? 'mp4' : 'png'}`)}
                    className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-medium flex items-center gap-1.5 hover:bg-primary"><Download size={14} /> {tp('Télécharger')}</button>
                )}
                <button onClick={() => handleDelete(lightbox._id)} className="h-9 w-9 rounded-xl bg-muted text-red-400 flex items-center justify-center hover:bg-red-50"><Trash2 size={15} /></button>
                <button onClick={() => setLightbox(null)} className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-gray-200"><X size={16} /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryStudio;
