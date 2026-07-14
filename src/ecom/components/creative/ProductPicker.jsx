import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, Loader2, Package, Check, AlertCircle, Store } from 'lucide-react';
import { storeProductsApi, storeManageApi } from '../../services/storeApi.js';
import { formatMoney } from '../../utils/currency.js';
import { tp } from '../../i18n/platform.js';

const PAGE_SIZE = 12;

/** Normalise un produit boutique en objet réutilisable par les studios. */
function normalizeProduct(p, subdomain) {
  const url = subdomain && p.slug ? `https://${subdomain}.scalor.net/product/${p.slug}` : null;
  return {
    id: p._id,
    name: p.name || p.title || tp('Produit sans nom'),
    description: p.description || '',
    imageUrl: p.images?.[0]?.url || null,
    images: (p.images || []).map(i => i?.url).filter(Boolean),
    price: p.price,
    currency: p.currency || 'XAF',
    slug: p.slug,
    url,
  };
}

const ProductPicker = ({ open, onClose, onSelect }) => {
  const [products, setProducts] = useState([]);
  const [subdomain, setSubdomain] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Sous-domaine (pour l'URL publique) — une seule fois à l'ouverture
  useEffect(() => {
    if (!open) return;
    storeManageApi.getStoreConfig()
      .then(r => setSubdomain(r.data?.data?.subdomain || null))
      .catch(() => setSubdomain(null));
  }, [open]);

  const fetchProducts = useCallback(async (p = 1, term = '') => {
    setLoading(true); setError('');
    try {
      const params = { page: p, limit: PAGE_SIZE };
      if (term) params.search = term;
      const res = await storeProductsApi.getProducts(params);
      const data = res.data?.data || {};
      setProducts(data.products || []);
      setPage(data.pagination?.page || 1);
      setPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total ?? (data.products || []).length);
    } catch (err) {
      setError(err.response?.data?.message || err.message || tp('Impossible de charger les produits'));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (open) fetchProducts(1, ''); }, [open, fetchProducts]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  // Recherche debouncée
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => fetchProducts(1, search), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center"><Store size={18} className="text-primary-600" /></div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{tp('Importer un produit')}</h3>
                <p className="text-[12px] text-gray-400">{tp('Depuis le catalogue de votre boutique')}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={18} /></button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={tp('Rechercher un produit…')}
              className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-gray-50 border border-gray-200 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50 transition" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertCircle size={16} className="shrink-0" /> {error}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-2.5 space-y-2"><div className="h-3 bg-gray-100 rounded w-3/4" /><div className="h-2 bg-gray-100 rounded w-1/2" /></div>
                </div>
              ))}
            </div>
          )}

          {!loading && products.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-gray-100"><Package size={24} className="text-gray-300" /></div>
              <p className="text-[15px] font-semibold text-gray-700">{search ? tp('Aucun résultat') : tp('Aucun produit dans la boutique')}</p>
              <p className="text-[13px] text-gray-400 mt-1">{search ? tp('Essayez un autre terme.') : tp('Ajoutez des produits pour les importer ici.')}</p>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map(p => {
                const img = p.images?.[0]?.url;
                return (
                  <button key={p._id} onClick={() => onSelect?.(normalizeProduct(p, subdomain))}
                    className="group text-left rounded-2xl border border-gray-100 overflow-hidden bg-white hover:border-primary-300 hover:shadow-md transition-all">
                    <div className="aspect-square bg-gray-50 relative overflow-hidden">
                      {img
                        ? <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={28} /></div>}
                      <div className="absolute inset-0 bg-primary-600/0 group-hover:bg-primary-600/10 transition-colors flex items-center justify-center">
                        <span className="w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Check size={16} className="text-primary-600" /></span>
                      </div>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[12.5px] font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-[11px] text-primary-600 font-medium mt-0.5">{formatMoney(p.price, p.currency || 'XAF')}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / pagination */}
        <div className="px-5 sm:px-6 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <span className="text-[12px] text-gray-400">{total} {tp('produit(s)')}</span>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => fetchProducts(page - 1, search)} disabled={page <= 1 || loading}
                className="h-8 px-3 text-[13px] font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">←</button>
              <span className="text-[12px] text-gray-500">{page}/{pages}</span>
              <button onClick={() => fetchProducts(page + 1, search)} disabled={page >= pages || loading}
                className="h-8 px-3 text-[13px] font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">→</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductPicker;
