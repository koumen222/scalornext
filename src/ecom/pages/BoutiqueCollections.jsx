import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers, Plus, Pencil, Trash2, X, Loader2, Search, Check,
  ExternalLink, ImageIcon, Eye, EyeOff, Upload,
} from 'lucide-react';
import { collectionsApi, storeProductsApi } from '../services/storeApi.js';
import { useStore } from '../contexts/StoreContext.jsx';
import AiImagePromptBox from '../components/AiImagePromptBox.jsx';
import AiTextPromptBox from '../components/AiTextPromptBox.jsx';
import { tp } from '../i18n/platform.js';

/**
 * BoutiqueCollections — gestion des collections (équivalent Shopify).
 * Créer / renommer / décrire / illustrer une collection, choisir ses produits,
 * activer/désactiver, supprimer. Page publique : /collections/:slug.
 */

const inputCls = 'w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition bg-background focus:bg-card';

const EMPTY_FORM = { name: '', description: '', image: '', productIds: [], enabled: true };

const CollectionModal = ({ initial, products, onClose, onSaved }) => {
  const editing = Boolean(initial?._id);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initial ? {
      name: initial.name || '',
      description: initial.description || '',
      image: initial.image || '',
      productIds: (initial.productIds || []).map(String),
      enabled: initial.enabled !== false,
    } : {}),
  }));
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const selected = new Set(form.productIds);
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => (p.name || '').toLowerCase().includes(q)) : products;
  }, [products, search]);

  const toggleProduct = (id) => {
    setForm((f) => ({
      ...f,
      productIds: selected.has(String(id))
        ? f.productIds.filter((x) => x !== String(id))
        : [...f.productIds, String(id)],
    }));
  };

  const uploadCover = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await storeProductsApi.uploadImages([file]);
      const url = res.data?.data?.[0]?.url || res.data?.urls?.[0];
      if (url) setForm((f) => ({ ...f, image: url }));
    } catch {
      setError(tp('Échec de l\'upload de l\'image'));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) { setError(tp('Nom requis')); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) await collectionsApi.update(initial._id, form);
      else await collectionsApi.create(form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || tp('Enregistrement impossible'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 px-4 py-6" onClick={() => !saving && onClose()}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-black text-foreground">{editing ? tp('Modifier la collection') : tp('Nouvelle collection')}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{tp('Nom de la collection')}</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={tp('Ex : Soins visage, Nouveautés, Promo Tabaski…')} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{tp('Description (optionnelle)')}</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={tp('Visible en haut de la page collection')} className={`${inputCls} resize-y`} />
            <div className="mt-1.5">
              <AiTextPromptBox
                purpose="description de collection e-commerce (bandeau de page)"
                maxWords={40}
                label={tp('Générer la description par IA')}
                context={{
                  collection: form.name,
                  produits: products.filter((p) => selected.has(String(p._id))).map((p) => p.name).slice(0, 20),
                }}
                onGenerated={(text) => setForm((f) => ({ ...f, description: text }))}
              />
            </div>
          </div>

          {/* Image de couverture */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">{tp('Image de couverture')}</label>
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                {form.image ? <img src={form.image} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-gray-300" />}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition hover:bg-muted">
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {form.image ? tp('Remplacer') : tp('Uploader')}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadCover(e.target.files?.[0])} />
              </label>
              {form.image && (
                <button type="button" onClick={() => setForm((f) => ({ ...f, image: '' }))} className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
            <div className="mt-2">
              <AiImagePromptBox compact value={form.image} aspectRatio="16:9" onGenerated={(url) => setForm((f) => ({ ...f, image: url }))} />
            </div>
          </div>

          {/* Produits */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">{tp('Produits de la collection')} <span className="font-black text-primary">({form.productIds.length})</span></label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tp('Rechercher…')} className="w-44 rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs outline-none focus:border-primary-500" />
              </div>
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
              {filteredProducts.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-muted-foreground">{tp('Aucun produit trouvé')}</p>
              )}
              {filteredProducts.map((p) => {
                const isSel = selected.has(String(p._id));
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => toggleProduct(p._id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg border p-2 text-left transition ${isSel ? 'border-primary-300 bg-primary-50/60' : 'border-transparent hover:bg-background'}`}
                  >
                    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition ${isSel ? 'border-primary-600 bg-primary text-white' : 'border-gray-300 bg-card'}`}>
                      {isSel && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>
                    {p.image ? <img src={p.image} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg object-cover" /> : <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-muted" />}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{p.name}</span>
                    {!p.isPublished && <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">{tp('Brouillon')}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} className="h-4 w-4 rounded border-gray-300 text-primary" />
            <span className="text-sm font-medium text-foreground">{tp('Collection visible sur la boutique')}</span>
          </label>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3.5">
          <button onClick={onClose} disabled={saving} className="rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-gray-200 disabled:opacity-50">{tp('Annuler')}</button>
          <button onClick={save} disabled={saving || !form.name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-800 disabled:opacity-40">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {editing ? tp('Enregistrer') : tp('Créer la collection')}
          </button>
        </div>
      </div>
    </div>
  );
};

const BoutiqueCollections = () => {
  const { activeStore, getActiveStorefrontUrl } = useStore();
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | {} (création) | collection (édition)

  const load = async () => {
    try {
      const [colRes, prodRes] = await Promise.all([
        collectionsApi.list(),
        storeProductsApi.getProducts({ limit: 200 }),
      ]);
      setCollections(colRes.data?.data || []);
      const prodData = prodRes.data?.data;
      setProducts(Array.isArray(prodData) ? prodData : prodData?.products || []);
    } catch { /* silencieux */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleEnabled = async (c) => {
    try {
      await collectionsApi.update(c._id, { enabled: !(c.enabled !== false) });
      load();
    } catch { /* noop */ }
  };

  const remove = async (c) => {
    if (!confirm(`Supprimer la collection « ${c.name} » ? (les produits ne sont pas supprimés)`)) return;
    try { await collectionsApi.remove(c._id); load(); } catch { /* noop */ }
  };

  // En local, ouvrir la route locale /store/... (le sous-domaine prod n'existe pas encore)
  const isLocalDev = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)/.test(window.location.hostname);
  const storefrontBase = isLocalDev
    ? (activeStore?.subdomain ? `/store/${activeStore.subdomain}` : '')
    : (getActiveStorefrontUrl?.() || (activeStore?.subdomain ? `https://${activeStore.subdomain}.scalor.net` : ''));

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-foreground"><Layers className="h-5 w-5 text-primary" /> {tp('Collections')}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{tp('Regroupez vos produits (page publique /collections/nom) — comme sur Shopify.')}</p>
        </div>
        <button onClick={() => setModal({})} className="inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-800">
          <Plus className="h-4 w-4" /> {tp('Nouvelle collection')}
        </button>
      </div>

      {collections.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-14 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-bold text-muted-foreground">{tp('Aucune collection pour le moment')}</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{tp('Créez par exemple « Nouveautés », « Meilleures ventes » ou « Soins visage » et ajoutez-y vos produits.')}</p>
          <button onClick={() => setModal({})} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-800">
            <Plus className="h-4 w-4" /> {tp('Créer ma première collection')}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {collections.map((c) => (
            <div key={c._id} className={`overflow-hidden rounded-2xl border bg-card shadow-sm transition ${c.enabled !== false ? 'border-border' : 'border-border opacity-60'}`}>
              <div className="flex h-28 items-center justify-center bg-background" style={c.image ? { backgroundImage: `url(${c.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
                {!c.image && <Layers className="h-7 w-7 text-gray-200" />}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-black text-foreground">{c.name}</p>
                  <span className="flex-shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold text-muted-foreground">{c.productCount ?? (c.productIds || []).length} {tp('produits')}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">/collections/{c.slug}</p>
                <div className="mt-3 flex items-center gap-1">
                  <button onClick={() => setModal(c)} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-[11.5px] font-bold text-foreground transition hover:bg-gray-200">
                    <Pencil className="h-3 w-3" /> {tp('Modifier')}
                  </button>
                  <button onClick={() => toggleEnabled(c)} title={c.enabled !== false ? tp('Masquer') : tp('Afficher')} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    {c.enabled !== false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => remove(c)} title={tp('Supprimer')} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex-1" />
                  {storefrontBase && c.enabled !== false && (
                    <a href={`${storefrontBase}/collections/${c.slug}`} target="_blank" rel="noopener noreferrer" title={tp('Voir sur la boutique')} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-primary">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <CollectionModal
          initial={modal._id ? modal : null}
          products={products}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
};

export default BoutiqueCollections;
