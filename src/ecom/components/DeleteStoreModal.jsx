import React, { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useStore } from '../contexts/StoreContext.jsx';
import { storesApi } from '../services/storeApi.js';
import { tp } from '../i18n/platform.js';

/**
 * Modal partagée de suppression de boutique (Paramètres + sélecteur de boutiques).
 * Confirmation par saisie du nom, erreurs visibles, puis :
 *  - boutique(s) restante(s) → bascule si l'active a été supprimée ;
 *  - plus aucune boutique  → retour au wizard de création.
 */
const DeleteStoreModal = ({ store, onClose }) => {
  const navigate = useNavigate();
  const { activeStore, refreshStores, switchStore } = useStore();
  const [input, setInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!store) return null;

  const name = (store.storeSettings?.storeName || store.name || '').trim();
  const canConfirm = input.trim().toLowerCase() === name.toLowerCase() && !deleting;

  const handleDelete = async () => {
    if (!canConfirm) return;
    setDeleting(true);
    setError('');
    try {
      await storesApi.deleteStore(store._id);

      let remaining = [];
      try {
        const freshRes = await storesApi.getStores();
        remaining = (freshRes.data?.data || []).filter((st) => st._id !== store._id);
      } catch { /* non bloquant */ }
      await refreshStores?.();

      const deletedActive = activeStore?._id === store._id;
      if (remaining.length === 0) {
        switchStore?.(null);
        navigate('/ecom/boutique/wizard', { replace: true });
      } else if (deletedActive) {
        switchStore?.(remaining[0]);
        navigate('/ecom/boutique', { replace: true });
      }
      onClose?.(true);
    } catch (err) {
      setError(err?.response?.data?.message || tp('Suppression impossible — réessayez.'));
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 px-4" onClick={() => !deleting && onClose?.(false)}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
            <AlertTriangle size={19} />
          </span>
          <div>
            <h3 className="text-base font-black text-foreground">{tp('Supprimer définitivement ?')}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-5">
              {tp('La boutique')} <span className="font-bold text-foreground">{name}</span>{' '}
              {tp('sera mise hors ligne immédiatement. Ses produits, commandes et pages ne seront plus accessibles. Cette action ne peut pas être annulée depuis l\'interface.')}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-xs font-bold text-foreground">
            {tp('Tapez le nom de la boutique pour confirmer :')}{' '}
            <span className="text-red-600">{name}</span>
          </label>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); }}
            placeholder={name}
            className="mt-2 w-full px-4 py-2.5 bg-background border-2 border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
          />
        </div>

        {error && <p className="mt-3 text-xs font-bold text-red-600">{error}</p>}

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={() => onClose?.(false)}
            disabled={deleting}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground bg-muted hover:bg-gray-200 transition disabled:opacity-50"
          >
            {tp('Annuler')}
          </button>
          <button
            onClick={handleDelete}
            disabled={!canConfirm}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            {deleting ? tp('Suppression…') : tp('Supprimer définitivement')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteStoreModal;
