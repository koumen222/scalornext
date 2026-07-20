import React, { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Search, RefreshCw, ExternalLink, Image as ImageIcon,
  Video, Mic, Type, Film, Loader2, AlertCircle, Gift,
} from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import SuperAdminShell from '../components/SuperAdminShell';
import { tp } from '../i18n/platform.js';

const TYPE_META = {
  text: { label: 'Texte', Icon: Type },
  image: { label: 'Affiche', Icon: ImageIcon },
  affiche: { label: 'Affiche', Icon: ImageIcon },
  video: { label: 'Vidéo', Icon: Video },
  voice: { label: 'Voix', Icon: Mic },
  montage: { label: 'Montage', Icon: Film },
};

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch { return '—'; }
}

export default function SuperAdminCreative() {
  // ── Mode gratuit ─────────────────────────────────────────────
  const [freeMode, setFreeMode] = useState(null); // null = chargement
  const [savingFree, setSavingFree] = useState(false);
  const [freeErr, setFreeErr] = useState('');

  useEffect(() => {
    ecomApi.get('/super-admin/creative-free-mode')
      .then((r) => setFreeMode(!!(r?.data?.enabled)))
      .catch(() => { setFreeMode(false); setFreeErr('Endpoint /super-admin/creative-free-mode indisponible.'); });
  }, []);

  const toggleFree = async () => {
    const next = !freeMode;
    setSavingFree(true); setFreeErr('');
    try {
      const r = await ecomApi.patch('/super-admin/creative-free-mode', { enabled: next });
      setFreeMode(!!(r?.data?.enabled ?? next));
    } catch {
      setFreeErr('Échec de la mise à jour — cet endpoint backend doit être créé.');
    } finally { setSavingFree(false); }
  };

  // ── Toutes les générations ───────────────────────────────────
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async (p = 1, q = '') => {
    setLoading(true); setErr('');
    try {
      const r = await ecomApi.get(
        `/super-admin/creative-generations?page=${p}&limit=24&search=${encodeURIComponent(q)}`
      );
      const d = r?.data || {};
      setItems(Array.isArray(d.items) ? d.items : []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setPage(d.page || p);
    } catch {
      setErr('Impossible de charger les générations — l’endpoint /super-admin/creative-generations doit être créé.');
      setItems([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(1, ''); }, [load]);

  const onSearch = (e) => { e.preventDefault(); load(1, search.trim()); };

  return (
    <SuperAdminShell
      title={tp('Creative Center')}
      subtitle={tp('Mode gratuit et toutes les générations')}
    >
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">

        {/* ── Mode gratuit ── */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary shrink-0">
                <Gift size={20} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground">{tp('Mode gratuit')}</p>
                <p className="text-sm text-muted-foreground mt-0.5 max-w-md">
                  {tp('Rend toutes les fonctionnalités du Creative Center gratuites (aucun crédit débité).')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleFree}
              disabled={freeMode === null || savingFree}
              aria-pressed={!!freeMode}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${freeMode ? 'bg-primary' : 'bg-muted'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${freeMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="mt-3 text-sm">
            {freeMode === null
              ? <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {tp('Chargement…')}</span>
              : freeMode
                ? <span className="inline-flex items-center gap-1.5 font-semibold text-primary"><Sparkles size={14} /> {tp('Activé — le Creative Center est gratuit pour tous.')}</span>
                : <span className="text-muted-foreground">{tp('Désactivé — les crédits sont débités normalement.')}</span>}
          </div>
          {freeErr && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle size={13} /> {freeErr}
            </p>
          )}
        </div>

        {/* ── Toutes les générations ── */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-base font-bold text-foreground">{tp('Toutes les générations')}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total ? `${total} ${tp('créations, tous utilisateurs')}` : tp('Créations de tous les utilisateurs')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <form onSubmit={onSearch} className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={tp('Rechercher (produit, user…)')}
                  className="h-9 w-56 pl-8 pr-3 rounded-xl bg-background border border-border text-[13px] outline-none focus:border-primary/40 transition"
                />
              </form>
              <button
                type="button"
                onClick={() => load(page, search.trim())}
                disabled={loading}
                aria-label={tp('Rafraîchir')}
                className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] px-4 py-3 text-sm text-destructive">
              <AlertCircle size={15} className="shrink-0" /> {err}
            </div>
          )}

          {!err && loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 size={22} className="animate-spin" />
            </div>
          )}

          {!err && !loading && items.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {tp('Aucune génération pour le moment.')}
            </div>
          )}

          {!err && !loading && items.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((it) => {
                  const meta = TYPE_META[it.type] || { label: it.type || '—', Icon: Sparkles };
                  const Icon = meta.Icon;
                  return (
                    <div key={it.id} className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
                      <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                        {it.thumbnailUrl || it.mediaUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.thumbnailUrl || it.mediaUrl} alt={it.title || meta.label} className="w-full h-full object-cover" />
                        ) : (
                          <Icon size={26} className="text-muted-foreground" />
                        )}
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-card/90 px-2 py-0.5 text-[10px] font-bold text-foreground border border-border">
                          <Icon size={11} /> {meta.label}
                        </span>
                        {(it.mediaUrl) && (
                          <a href={it.mediaUrl} target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 h-6 w-6 inline-flex items-center justify-center rounded-full bg-card/90 border border-border text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary">
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-[12.5px] font-semibold text-foreground truncate">{it.title || it.productName || tp('Sans titre')}</p>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {(it.user?.name || it.user?.email || '—')}{it.store?.name ? ` · ${it.store.name}` : ''}
                        </p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10.5px] text-muted-foreground">{fmtDate(it.createdAt)}</span>
                          {typeof it.cost === 'number' && (
                            <span className="text-[10.5px] font-semibold text-primary">{it.cost} {tp('cr.')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  <button type="button" disabled={page <= 1 || loading} onClick={() => load(page - 1, search.trim())}
                    className="h-8 px-3 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-40 transition">
                    {tp('Précédent')}
                  </button>
                  <span className="text-[13px] text-muted-foreground">{page} / {pages}</span>
                  <button type="button" disabled={page >= pages || loading} onClick={() => load(page + 1, search.trim())}
                    className="h-8 px-3 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground hover:bg-muted disabled:opacity-40 transition">
                    {tp('Suivant')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SuperAdminShell>
  );
}
