import React, { useState, useEffect, useCallback } from 'react';
import {
  Rocket, Loader2, Trash2, ChevronDown, ChevronRight, Clapperboard, Mic,
  Image as ImageIcon, Megaphone, Target, Calendar, RefreshCw,
} from 'lucide-react';
import creativeApi from '../../services/creativeApi.js';
import { tp } from '../../i18n/platform.js';
import { StudioHeader, EmptyState, formatDate } from './creativeShared.jsx';
import { buildMontageScenes } from './launchToMontage.js';

const LaunchesStudio = ({ onSendToMontage, onNavigate, onOpenInStudio }) => {
  const [launches, setLaunches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchLaunches = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await creativeApi.gallery.list({ type: 'launch', limit: 50 });
      const items = res?.data?.assets || res?.data?.items || res?.data?.data || [];
      setLaunches(items);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || tp('Chargement impossible'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLaunches(); }, [fetchLaunches]);

  const remove = async (id) => {
    setDeletingId(id);
    try { await creativeApi.gallery.remove(id); setLaunches((prev) => prev.filter((l) => l._id !== id)); }
    catch (e) { setError(e?.response?.data?.message || e.message); }
    finally { setDeletingId(null); }
  };

  const sendScript = (rec, script, k, auto = false) => {
    onSendToMontage?.({
      productName: rec.productName || '',
      angleTitle: script.angleTitle || script.title || '',
      scenes: buildMontageScenes(script),
      images: Array.isArray(rec.images) ? rec.images : [],
      voiceoverUrl: rec.voiceovers?.[k] || rec.voiceovers?.[String(k)] || '',
      auto,
    });
  };

  // Reconstruction du détail depuis les items individuels (scripts/angles/voix/affiches
  // enregistrés séparément) — au cas où meta.launch serait absent/incomplet.
  const [enriched, setEnriched] = useState({});
  const [enrichingId, setEnrichingId] = useState(null);

  const enrich = useCallback(async (item) => {
    if (!item?._id || enriched[item._id]) return;
    setEnrichingId(item._id);
    try {
      const pname = String(item.productName || '').trim();
      const [tRes, aRes, iRes] = await Promise.all([
        creativeApi.gallery.list({ type: 'text', limit: 100 }),
        creativeApi.gallery.list({ type: 'audio', limit: 100 }),
        creativeApi.gallery.list({ type: 'image', limit: 100 }),
      ]);
      const pick = (r) => (r?.data?.assets || r?.data?.items || []).filter((x) => String(x.productName || '').trim() === pname);
      const texts = pick(tRes); const audios = pick(aRes); const imgs = pick(iRes);
      const scripts = texts.filter((x) => x.meta?.kind === 'script').map((x) => ({ script: x.content || '', title: x.label || '', angleTitle: x.label || '', durationSec: x.meta?.durationSec }));
      const angles = texts.filter((x) => x.meta?.kind === 'angle').map((x) => ({ title: String(x.content || x.label || '').split('\n')[0] }));
      const adsText = texts.find((x) => x.meta?.kind === 'facebook-ads')?.content || '';
      const voiceovers = audios.filter((x) => x.meta?.kind === 'voiceover').map((x) => x.audioUrl).filter(Boolean);
      const images = imgs.filter((x) => x.meta?.kind === 'launch-image').map((x) => x.imageUrl).filter(Boolean);
      setEnriched((prev) => ({ ...prev, [item._id]: { scripts, angles, voiceovers, images, adsText } }));
    } catch { /* best-effort */ }
    finally { setEnrichingId(null); }
  }, [enriched]);

  const toggleDetails = useCallback((item) => {
    const willOpen = expandedId !== item._id;
    setExpandedId(willOpen ? item._id : null);
    if (willOpen) {
      const rec = item.meta?.launch || {};
      if (!(Array.isArray(rec.videoScripts) && rec.videoScripts.length)) enrich(item);
    }
  }, [expandedId, enrich]);

  return (
    <div className="space-y-5">
      <StudioHeader
        icon={Rocket} kind="launch"
        title={tp('Mes lancements')}
        subtitle={tp('Retrouve tes lancements enregistrés, leurs données, et envoie un script au montage.')}
        right={<button onClick={fetchLaunches} className="h-9 w-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:bg-background"><RefreshCw size={14} /></button>}
      />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-700">{error}</div>}

      {loading ? (
        <div className="py-16 flex justify-center"><Loader2 className="animate-spin text-gray-300" /></div>
      ) : !launches.length ? (
        <EmptyState
          icon={Rocket}
          title={tp('Aucun lancement enregistré')}
          description={tp('Crée un kit de lancement puis enregistre-le pour le retrouver ici.')}
          action={<button onClick={() => onNavigate?.('launch')} className="inline-flex items-center gap-2 bg-primary text-white font-medium px-5 py-2.5 rounded-xl hover:bg-primary-700 text-sm"><Rocket size={15} /> {tp('Créer un lancement')}</button>}
        />
      ) : (
        <div className="space-y-3">
          {launches.map((item) => {
            const rec = item.meta?.launch || {};
            const en = enriched[item._id] || {};
            const open = expandedId === item._id;
            const scripts = (Array.isArray(rec.videoScripts) && rec.videoScripts.length) ? rec.videoScripts : (en.scripts || []);
            const angles = (Array.isArray(rec.angles) && rec.angles.length) ? rec.angles : (en.angles || []);
            const images = (Array.isArray(rec.images) && rec.images.length) ? rec.images : (en.images || []);
            const voMap = (rec.voiceovers && Object.keys(rec.voiceovers).length) ? rec.voiceovers : (en.voiceovers || []);
            const adsOverview = (rec.ads && (rec.ads.strategyOverview || rec.ads.campaignType)) || en.adsText || '';
            const counts = rec.counts || {};
            const mergedForSend = { productName: item.productName, images, voiceovers: voMap };
            return (
              <div key={item._id} className="rounded-2xl border border-border bg-card overflow-hidden">
                {/* En-tête (toute la ligne est cliquable) */}
                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-background/60" onClick={() => toggleDetails(item)}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Rocket size={18} className="text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-foreground truncate">{item.productName || item.label || tp('Lancement')}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1"><Calendar size={11} /> {item.meta?.launchDate || formatDate(item.createdAt)} · {item.meta?.day || 'J1'}</span>
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Target size={12} /> {counts.angles ?? angles.length}</span>
                    <span className="inline-flex items-center gap-1"><Clapperboard size={12} /> {counts.scripts ?? scripts.length}</span>
                    <span className="inline-flex items-center gap-1"><Mic size={12} /> {counts.voiceovers ?? 0}</span>
                    <span className="inline-flex items-center gap-1"><ImageIcon size={12} /> {counts.images ?? images.length}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Réouvre CE lancement dans le studio : produit, angles,
                      // scripts et réglages restaurés → générer d'autres hooks.
                      onOpenInStudio?.({
                        productName: item.productName || rec.productName || '',
                        description: rec.description || '',
                        productImage: images[0] || '',
                        settings: rec.settings || null,
                        adBrief: rec.adBrief || null,
                        angles,
                        scripts,
                        ads: rec.ads || null,
                        voiceovers: voMap,
                        images,
                      });
                    }}
                    className="h-9 px-3 rounded-lg bg-primary text-[12px] font-bold text-white inline-flex items-center gap-1.5 hover:bg-primary-700"
                    title={tp('Rouvrir ce lancement dans le studio pour générer d’autres scripts et hooks')}
                  >
                    <Rocket size={13} /> {tp('Ouvrir')}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); toggleDetails(item); }} className="h-9 px-3 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground inline-flex items-center gap-1 hover:bg-background">
                    {enrichingId === item._id ? <Loader2 size={13} className="animate-spin" /> : open ? <ChevronDown size={15} /> : <ChevronRight size={15} />} {tp('Détails')}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); remove(item._id); }} disabled={deletingId === item._id} className="h-9 w-9 rounded-lg border border-border text-red-400 flex items-center justify-center hover:bg-red-50 disabled:opacity-50">
                    {deletingId === item._id ? <Loader2 size={13} className="animate-spin text-muted-foreground" /> : <Trash2 size={14} />}
                  </button>
                </div>

                {/* Détails */}
                {open && (
                  <div className="border-t border-border p-4 space-y-4 bg-background/50">
                    {enrichingId === item._id && !scripts.length && !angles.length ? (
                      <div className="py-4 flex items-center gap-2 text-[12.5px] text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {tp('Chargement du contenu…')}</div>
                    ) : (!scripts.length && !angles.length) ? (
                      <div className="text-[12.5px] text-muted-foreground space-y-2">
                        <p className="whitespace-pre-wrap">{item.content || tp('Ce lancement ne contient pas encore de scripts ou d’angles enregistrés.')}</p>
                        <button onClick={(e) => { e.stopPropagation(); onNavigate?.('launch'); }} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-[12px] font-semibold hover:bg-primary-700"><Rocket size={13} /> {tp('Ouvrir le Studio Lancement')}</button>
                      </div>
                    ) : null}

                    {/* Scripts → montage */}
                    {scripts.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">{tp('Scripts')}</p>
                        <div className="space-y-2">
                          {scripts.map((sc, k) => (
                            <div key={k} className="rounded-xl border border-border bg-card p-3">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="text-[12.5px] font-semibold text-foreground truncate">{sc.angleTitle || sc.title || `${tp('Script')} ${k + 1}`}{sc.durationSec ? ` · ${sc.durationSec}s` : ''}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); sendScript(mergedForSend, sc, k, true); }} title={tp('Montage automatique complet')} className="h-8 px-3 rounded-lg bg-primary text-white text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-primary-700">
                                    ⚡ {tp('Montage auto')}
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); sendScript(mergedForSend, sc, k); }} title={tp('Ouvrir dans le studio')} className="h-8 px-2.5 rounded-lg border border-primary/25 bg-primary/10 text-primary text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-primary/12">
                                    <Clapperboard size={13} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-[12px] text-muted-foreground leading-snug line-clamp-3">{sc.script}</p>
                              {voMap[k] && <audio src={voMap[k]} controls className="mt-2 h-8 w-full" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Angles */}
                    {angles.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">{tp('Angles marketing')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {angles.map((a, i) => <span key={i} className="text-[11.5px] bg-card border border-border rounded-full px-2.5 py-1 text-foreground">{a.title || String(a)}</span>)}
                        </div>
                      </div>
                    )}

                    {/* Images */}
                    {images.length > 0 && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">{tp('Affiches')}</p>
                        <div className="flex flex-wrap gap-2">
                          {images.slice(0, 8).map((u, i) => <img key={i} src={u} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />)}
                        </div>
                      </div>
                    )}

                    {/* Ads */}
                    {adsOverview && (
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1"><Megaphone size={12} /> {tp('Stratégie Facebook Ads')}</p>
                        <p className="text-[12px] text-muted-foreground leading-snug line-clamp-4 whitespace-pre-wrap">{adsOverview}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LaunchesStudio;
