import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { useEcomAuth } from '../hooks/useEcomAuth';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';

// Carte douce : coins arrondis, ombre légère, anneau discret au lieu d'une bordure franche
const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_16px_-8px_rgba(16,24,40,0.06)]';

// Palette : uniquement noir + vert Scalor (primary)
const SL = { prospect: 'Prospect', confirmed: 'Confirmé', delivered: 'Livré', returned: 'Retour', blocked: 'Bloqué' };
const SC = {
  prospect: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-primary-50 text-primary-700 ring-1 ring-primary-100',
  delivered: 'bg-primary-500 text-white',
  returned: 'bg-gray-900 text-white',
  blocked: 'bg-gray-900 text-white',
};
const SDOT = {
  prospect: 'bg-gray-300', confirmed: 'bg-primary-400', delivered: 'bg-primary-500', returned: 'bg-gray-800', blocked: 'bg-gray-900',
};
const srcLabel = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp', site: 'Site web', referral: 'Parrainage', other: 'Autre' };

const selectCls = 'h-10 px-3 bg-gray-50/70 rounded-xl text-sm text-gray-600 ring-1 ring-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:bg-white cursor-pointer transition-all';
const fmtF = (n) => `${(Number(n) || 0).toLocaleString('fr-FR')} FCFA`;

const ClientsList = () => {
  const { user } = useEcomAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncStatuses, setSyncStatuses] = useState(['delivered', 'confirmed', 'pending', 'shipped']);

  const availableSyncStatuses = [
    { key: 'delivered', get label() { return tp('Livré'); }, dot: 'bg-primary-500', clientStatus: 'Client' },
    { key: 'confirmed', get label() { return tp('Confirmé'); }, dot: 'bg-primary-400', clientStatus: 'Confirmé' },
    { key: 'shipped', get label() { return tp('Expédié'); }, dot: 'bg-primary-300', clientStatus: 'Expédié' },
    { key: 'pending', label: 'En attente', dot: 'bg-gray-400', clientStatus: 'En attente' },
    { key: 'returned', label: 'Retour', dot: 'bg-gray-800', clientStatus: 'Retour' },
    { key: 'cancelled', get label() { return tp('Annulé'); }, dot: 'bg-gray-400', clientStatus: 'Annulé' },
    { key: 'unreachable', label: 'Injoignable', dot: 'bg-gray-400', clientStatus: 'Injoignable' },
    { key: 'called', get label() { return tp('Appelé'); }, dot: 'bg-gray-400', clientStatus: 'Appelé' },
    { key: 'postponed', get label() { return tp('Reporté'); }, dot: 'bg-gray-400', clientStatus: 'Reporté' },
  ];
  const allSyncKeys = availableSyncStatuses.map(s => s.key);

  const fetchClients = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterSource) params.source = filterSource;
      if (filterCity) params.city = filterCity;
      if (filterProduct) params.product = filterProduct;
      if (filterTag) params.tag = filterTag;
      const res = await ecomApi.get('/clients', { params });
      setClients(res.data.data.clients);
      setStats(res.data.data.stats);
    } catch { setError('Erreur chargement clients'); }
  };

  const handleSyncClients = async () => {
    if (syncStatuses.length === 0) { setError(tp('Veuillez sélectionner au moins un statut')); return; }
    setSyncing(true); setError(''); setSuccess('');
    try {
      const res = await ecomApi.post('/orders/sync-clients', { statuses: syncStatuses });
      const { created, updated, total } = res.data?.data || {};
      setSuccess(`Synchronisation terminée — ${total} clients traités (${created} créés, ${updated} mis à jour)`);
      fetchClients(); setShowSyncModal(false);
    } catch (err) { setError(err.response?.data?.message || 'Erreur synchronisation'); }
    finally { setSyncing(false); }
  };

  const handleDelete = async (e, clientId, name) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(`Supprimer ${name} ?`)) return;
    try { await ecomApi.delete(`/ecom/clients/${clientId}`); setSuccess('Client supprimé'); fetchClients(); }
    catch { setError('Erreur suppression'); }
  };

  const handleDeleteAll = async () => {
    if (!confirm(tp('Supprimer TOUS les clients ? Action irréversible.'))) return;
    if (!confirm(tp('Confirmez la suppression définitive de tous les clients.'))) return;
    setDeletingAll(true); setError('');
    try { const res = await ecomApi.delete('/ecom/clients/bulk'); setSuccess(res.data.message); fetchClients(); }
    catch (err) { setError(err.response?.data?.message || 'Erreur suppression'); }
    finally { setDeletingAll(false); }
  };

  const resetAllFilters = () => { setSearch(''); setFilterStatus(''); setFilterSource(''); setFilterCity(''); setFilterProduct(''); setFilterTag(''); };

  useEffect(() => { fetchClients().finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!loading) fetchClients(); }, [search, filterStatus, filterSource, filterCity, filterProduct, filterTag]);
  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); } }, [error]);

  // Synchro automatique et silencieuse au chargement (une fois par session) — garde les clients alignés sur les commandes
  useEffect(() => {
    if (user?.role !== 'ecom_admin') return;
    const key = `clientsAutoSync:${user?._id || 'ws'}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
    try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
    let cancelled = false;
    setAutoSyncing(true);
    ecomApi.post('/orders/sync-clients', { statuses: allSyncKeys })
      .then(() => { if (!cancelled) fetchClients(); })
      .catch(() => { /* synchro silencieuse : on n'alerte pas l'utilisateur */ })
      .finally(() => { if (!cancelled) setAutoSyncing(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.role]);

  const uniqueCities = useMemo(() => [...new Set(clients.map(c => c.city).filter(Boolean))].sort(), [clients]);
  const uniqueProducts = useMemo(() => [...new Set(clients.flatMap(c => c.products || []).filter(Boolean))].sort(), [clients]);
  const uniqueTags = useMemo(() => [...new Set(clients.flatMap(c => c.tags || []).filter(Boolean))].sort(), [clients]);

  const activeFilters = [
    filterStatus && { key: 'status', label: SL[filterStatus] || filterStatus, clear: () => setFilterStatus('') },
    filterSource && { key: 'source', label: srcLabel[filterSource] || filterSource, clear: () => setFilterSource('') },
    filterCity && { key: 'city', label: filterCity, clear: () => setFilterCity('') },
    filterProduct && { key: 'product', label: filterProduct, clear: () => setFilterProduct('') },
    filterTag && { key: 'tag', label: filterTag, clear: () => setFilterTag('') },
  ].filter(Boolean);

  const summary = [
    { label: 'prospects', value: stats.prospects || 0, dot: 'bg-gray-300' },
    { label: 'confirmés', value: stats.confirmed || 0, dot: 'bg-primary-400' },
    { label: 'livrés', value: stats.delivered || 0, dot: 'bg-primary-500' },
    { label: 'retours', value: stats.returned || 0, dot: 'bg-gray-800' },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <div className="p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto">
        {success && (
          <div className="mb-4 flex items-center gap-2.5 p-3 bg-primary-50 text-primary-700 rounded-2xl text-sm ring-1 ring-primary-100">
            <svg className="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-gray-900 text-white rounded-2xl text-sm">{error}</div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900">{tp('Clients')}</h1>
            {autoSyncing && (
              <span className="inline-flex items-center gap-1 text-xs text-primary-500">
                <span className="w-3 h-3 border-2 border-primary-300 border-t-transparent rounded-full animate-spin"/>
                {tp('Synchro…')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'ecom_admin' && (
              <button
                onClick={() => setShowSyncModal(true)}
                disabled={syncing}
                className="h-9 px-3 bg-white ring-1 ring-gray-200 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50 hover:ring-gray-300 transition-all disabled:opacity-50"
              >
                {syncing ? (
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"/>
                ) : (
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                )}
                <span className="hidden sm:inline">{syncing ? 'Sync...' : tp('Sync')}</span>
              </button>
            )}
            <Link
              to="/ecom/clients/new"
              className="h-9 px-4 bg-gray-900 text-white rounded-xl text-sm font-medium flex items-center gap-1.5 hover:bg-black transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4"/></svg>
              <span className="hidden sm:inline">{tp('Ajouter un client')}</span>
            </Link>
          </div>
        </div>

        {/* Résumé */}
        <div className={`${CARD} px-4 py-3 mb-3 flex items-center gap-x-4 gap-y-1 flex-wrap`}>
          <span className="text-sm font-semibold text-gray-900">{stats.total || 0} {tp('clients')}</span>
          <span className="hidden sm:block w-px h-4 bg-gray-100"/>
          {summary.map(s => (
            <span key={s.label} className="inline-flex items-center gap-1.5 text-sm text-gray-400">
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
              <span className="font-medium text-gray-700">{s.value}</span> {s.label}
            </span>
          ))}
          {user?.role === 'ecom_admin' && (stats.total || 0) > 0 && (
            <button onClick={handleDeleteAll} disabled={deletingAll} className="ml-auto text-xs font-medium text-gray-400 hover:text-gray-900 transition-colors disabled:opacity-50">
              {deletingAll ? 'Suppression...' : tp('Tout supprimer')}
            </button>
          )}
        </div>

        {/* Liste */}
        <div className={`${CARD} overflow-hidden`}>
          {/* Barre de recherche + filtres */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-50">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"/></svg>
            <input
              type="text"
              placeholder={tp('Rechercher des clients')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 h-9 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 px-3 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all flex-shrink-0 ${showFilters || activeFilters.length > 0 ? 'bg-primary-50 text-primary-600 ring-1 ring-primary-100' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
              <span className="hidden sm:inline">{tp('Filtres')}</span>
              {activeFilters.length > 0 && <span className="w-4 h-4 bg-primary-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">{activeFilters.length}</span>}
            </button>
          </div>

          {/* Filtres dépliables */}
          {showFilters && (
            <div className="px-3 py-2.5 border-b border-gray-50 bg-gray-50/40 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
                <option value="">{tp('Tous statuts')}</option>
                <option value="prospect">{tp('Prospect')}</option>
                <option value="confirmed">{tp('Confirmé')}</option>
                <option value="delivered">{tp('Livré')}</option>
                <option value="returned">{tp('Retour')}</option>
                <option value="blocked">{tp('Bloqué')}</option>
              </select>
              <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={selectCls}>
                <option value="">{tp('Toutes sources')}</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="site">{tp('Site web')}</option>
                <option value="referral">{tp('Parrainage')}</option>
                <option value="other">{tp('Autre')}</option>
              </select>
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className={selectCls}>
                <option value="">{tp('Toutes les villes')}</option>
                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className={selectCls}>
                <option value="">{tp('Tous les produits')}</option>
                {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={selectCls}>
                <option value="">{tp('Tous les tags')}</option>
                {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {/* Chips filtres actifs */}
          {activeFilters.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 px-3 py-2 border-b border-gray-50">
              {activeFilters.map(f => (
                <button key={f.key} onClick={f.clear} className="inline-flex items-center gap-1 h-6 px-2 bg-gray-50 text-gray-500 ring-1 ring-gray-100 rounded-full text-xs font-medium hover:bg-gray-100 transition-colors">
                  {f.label} <span className="text-gray-400">×</span>
                </button>
              ))}
              <button onClick={resetAllFilters} className="text-xs font-medium text-gray-400 hover:text-gray-900 ml-1">{tp('Tout effacer')}</button>
            </div>
          )}

          {loading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0"/>
                  <div className="h-3 bg-gray-100 rounded w-40"/>
                  <div className="hidden lg:block h-3 bg-gray-100 rounded w-28 ml-auto"/>
                  <div className="hidden lg:block h-3 bg-gray-100 rounded w-24"/>
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center px-6">
              <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </div>
              <p className="text-sm font-semibold text-gray-800 mb-1">{activeFilters.length > 0 || search ? 'Aucun résultat' : tp('Aucun client')}</p>
              <p className="text-sm text-gray-400 mb-4">{activeFilters.length > 0 || search ? 'Modifie les filtres pour élargir la recherche.' : tp('Ajoute un premier client pour démarrer.')}</p>
              {(activeFilters.length > 0 || search) && (
                <button onClick={resetAllFilters} className="h-9 px-4 ring-1 ring-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">{tp('Effacer les filtres')}</button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse min-w-[760px]">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[16%]" />
                  <col className="w-[24%]" />
                  <col className="w-[9%]" />
                  <col className="w-[15%]" />
                  <col className="w-[4%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-50">
                    {[['Nom du client', 'text-left'], ['Téléphone', 'text-left'], ['Emplacement', 'text-left'], ['Commandes', 'text-right'], ['Montant dépensé', 'text-right']].map(([h, cls]) => (
                      <th key={h} className={`px-4 py-2.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide ${cls}`}>{tp(h)}</th>
                    ))}
                    <th className="px-2 py-2.5"/>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => {
                    const location = [c.city, c.address].filter(Boolean).join(', ');
                    const goEdit = () => navigate(`/ecom/clients/${c._id}/edit`);
                    return (
                      <tr
                        key={c._id}
                        onClick={goEdit}
                        className="group border-b border-gray-50 last:border-0 hover:bg-primary-50/40 cursor-pointer transition-colors"
                      >
                        {/* Nom + statut */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SDOT[c.status] || 'bg-gray-300'}`}/>
                            <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-primary-700 transition-colors">
                              {`${c.firstName || ''} ${c.lastName || ''}`.trim() || c.phone || '—'}
                            </span>
                            <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${SC[c.status] || 'bg-gray-100 text-gray-600'}`}>
                              {SL[c.status] || c.status}
                            </span>
                          </div>
                        </td>

                        {/* Téléphone */}
                        <td className="px-4 py-3 text-sm text-gray-500 truncate">{c.phone || <span className="text-gray-300">—</span>}</td>

                        {/* Emplacement */}
                        <td className="px-4 py-3 text-sm text-gray-500 truncate">{location || <span className="text-gray-300">—</span>}</td>

                        {/* Commandes */}
                        <td className="px-4 py-3 text-sm text-gray-500 text-right tabular-nums">{c.totalOrders || 0}</td>

                        {/* Montant dépensé */}
                        <td className="px-4 py-3 text-sm font-medium text-gray-800 text-right tabular-nums whitespace-nowrap">{fmtF(c.totalSpent)}</td>

                        {/* Action */}
                        <td className="px-2 py-3 text-right">
                          {user?.role === 'ecom_admin' ? (
                            <button
                              onClick={(e) => handleDelete(e, c._id, `${c.firstName} ${c.lastName}`)}
                              className="h-7 w-7 inline-flex items-center justify-center text-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors opacity-0 group-hover:opacity-100"
                              title={tp('Supprimer')}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          ) : (
                            <svg className="w-4 h-4 inline text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={() => setShowSyncModal(false)}>
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-1 sm:hidden"/>
            <div className="px-5 pt-4 pb-7 sm:pb-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-primary-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{tp('Synchroniser les clients')}</h3>
                  <p className="text-xs text-gray-400">{tp('Importer les contacts depuis les commandes')}</p>
                </div>
              </div>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{tp('Statuts à synchroniser')}</p>
              <div className="space-y-1.5 mb-5 max-h-60 overflow-y-auto">
                {availableSyncStatuses.map(s => (
                  <label key={s.key} className={`flex items-center gap-3 h-10 px-3 rounded-xl ring-1 cursor-pointer transition-colors ${syncStatuses.includes(s.key) ? 'ring-primary-300 bg-primary-50/50' : 'ring-gray-100 hover:bg-gray-50'}`}>
                    <input
                      type="checkbox"
                      checked={syncStatuses.includes(s.key)}
                      onChange={e => setSyncStatuses(prev => e.target.checked ? [...prev, s.key] : prev.filter(x => x !== s.key))}
                      className="w-4 h-4 accent-[#0F6B4F]"
                    />
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`}/>
                    <span className="text-sm text-gray-600 flex-1">{s.label}</span>
                    <span className="text-xs text-gray-400">→ {s.clientStatus}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2.5">
                <button onClick={() => setShowSyncModal(false)} className="flex-1 h-11 bg-gray-100 text-gray-600 rounded-2xl text-sm font-semibold hover:bg-gray-200 transition-colors">{tp('Annuler')}</button>
                <button
                  onClick={handleSyncClients}
                  disabled={syncing || syncStatuses.length === 0}
                  className="flex-1 h-11 bg-primary-600 text-white rounded-2xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
                >
                  {syncing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : null}
                  {syncing ? 'Sync...' : tp('Lancer la sync')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;
