import React, { useEffect, useState } from 'react';
import { Settings, ShoppingCart, Check } from 'lucide-react';
import { tp } from '../i18n/platform.js';
import { storeManageApi } from '../services/storeApi.js';

const FormSettingsPage = () => {
  const [cartEnabled, setCartEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await storeManageApi.getStoreConfig();
        const s = res.data?.data?.storeSettings || {};
        if (alive) setCartEnabled(s.cartEnabled === true);
      } catch {
        if (alive) setError(tp('Impossible de charger les paramètres'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const toggleCart = async () => {
    const next = !cartEnabled;
    setCartEnabled(next); // optimiste
    setSaving(true); setError(''); setSaved(false);
    try {
      await storeManageApi.updateStoreConfig({ cartEnabled: next });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setCartEnabled(!next); // rollback
      setError(tp("Échec de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-600" />
          {tp('Paramètres du formulaire')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{tp('Configurez le comportement de votre boutique et du tunnel de commande.')}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Mode panier */}
      <div className="rounded-2xl border border-gray-200/80 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-gray-900">{tp('Activer le panier (mode boutique)')}</h2>
              <p className="text-[13px] text-gray-500 mt-0.5">
                {tp("Ajoute un bouton « Ajouter au panier » sur les pages produit et active le tunnel panier → checkout multi-produits. Le formulaire de commande directe reste disponible.")}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium">
                {cartEnabled
                  ? <span className="inline-flex items-center gap-1 text-primary-600"><Check className="w-3.5 h-3.5" />{tp('Panier actif sur votre boutique')}</span>
                  : <span className="text-gray-400">{tp('Panier désactivé — commande directe uniquement')}</span>}
                {saving && <span className="text-gray-400">· {tp('enregistrement…')}</span>}
                {saved && !saving && <span className="text-primary-500">· {tp('enregistré')}</span>}
              </div>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={cartEnabled}
            disabled={loading || saving}
            onClick={toggleCart}
            className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${cartEnabled ? 'bg-primary-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${cartEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormSettingsPage;
