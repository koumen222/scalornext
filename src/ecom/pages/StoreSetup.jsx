import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Store, Globe, Palette, Phone, Save, CheckCircle, AlertCircle, ExternalLink, Loader2, Zap } from 'lucide-react';
import { storeManageApi } from '../services/storeApi.js';
import api from '../../lib/api';
import { tp } from '../i18n/platform.js';

/**
 * StoreSetup — Dashboard page for creating/configuring the public store.
 * Handles subdomain selection, store branding, and enable/disable toggle.
 */
const StoreSetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Store config state
  const [config, setConfig] = useState({
    subdomain: '',
    storeName: '',
    storeDescription: '',
    storeLogo: '',
    storeBanner: '',
    storePhone: '',
    storeWhatsApp: '',
    storeThemeColor: '#0F6B4F',
    storeCurrency: 'XAF',
    isStoreEnabled: false
  });

  // Subdomain check
  const [subdomainInput, setSubdomainInput] = useState('');
  const [subdomainAvailable, setSubdomainAvailable] = useState(null);
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [existingSubdomain, setExistingSubdomain] = useState(null);
  const [generatingSubdomain, setGeneratingSubdomain] = useState(false);

  // Load current config
  useEffect(() => {
    (async () => {
      try {
        const res = await storeManageApi.getStoreConfig();
        const data = res.data?.data;
        if (data) {
          setConfig({
            subdomain: data.subdomain || '',
            storeName: data.storeSettings?.storeName || '',
            storeDescription: data.storeSettings?.storeDescription || '',
            storeLogo: data.storeSettings?.storeLogo || '',
            storeBanner: data.storeSettings?.storeBanner || '',
            storePhone: data.storeSettings?.storePhone || '',
            storeWhatsApp: data.storeSettings?.storeWhatsApp || '',
            storeThemeColor: data.storeSettings?.storeThemeColor || '#0F6B4F',
            storeCurrency: data.storeSettings?.storeCurrency || 'XAF',
            isStoreEnabled: data.storeSettings?.isStoreEnabled || false
          });
          setSubdomainInput(data.subdomain || '');
          setExistingSubdomain(data.subdomain || null);
        }
      } catch (err) {
        setError('Impossible de charger la configuration');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Check subdomain availability with debounce
  useEffect(() => {
    if (!subdomainInput || subdomainInput.length < 3 || subdomainInput === existingSubdomain) {
      setSubdomainAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingSubdomain(true);
      try {
        const res = await storeManageApi.checkSubdomain(subdomainInput);
        setSubdomainAvailable(res.data?.data?.available ?? false);
      } catch {
        setSubdomainAvailable(null);
      } finally {
        setCheckingSubdomain(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [subdomainInput, existingSubdomain]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setError('');
    setSuccess('');
  };

  const generateSubdomainFromStoreName = async () => {
    const storeName = config.storeName;
    
    if (!storeName || storeName.trim().length === 0) {
      setError('Veuillez d\'abord entrer le nom de votre boutique');
      return;
    }

    setGeneratingSubdomain(true);
    setError('');
    try {
      const res = await api.post('/store-manage/generate-subdomain', { 
        storeName: storeName.trim() 
      });
      
      if (res.data?.success) {
        const generatedSubdomain = res.data.data.subdomain;
        setSubdomainInput(generatedSubdomain);
        setSubdomainAvailable(true);
        setSuccess(`✅ Domaine généré: ${res.data.data.fullDomain}`);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors de la génération du domaine');
    } finally {
      setGeneratingSubdomain(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Save subdomain if changed
      if (subdomainInput && subdomainInput !== existingSubdomain) {
        await storeManageApi.setSubdomain(subdomainInput);
        setExistingSubdomain(subdomainInput);
      }

      // Save store settings
      await storeManageApi.updateStoreConfig({
        storeName: config.storeName,
        storeDescription: config.storeDescription,
        storeLogo: config.storeLogo,
        storeBanner: config.storeBanner,
        storePhone: config.storePhone,
        storeWhatsApp: config.storeWhatsApp,
        storeThemeColor: config.storeThemeColor,
        storeCurrency: config.storeCurrency,
        isStoreEnabled: config.isStoreEnabled
      });

      setSuccess(tp('Configuration sauvegardée avec succès'));
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const storeUrl = existingSubdomain ? `https://${existingSubdomain}.scalor.net` : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Store className="w-6 h-6 text-primary" />
            {tp('Ma Boutique en Ligne')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tp('Configurez votre boutique publique accessible par vos clients')}
          </p>
        </div>
        {storeUrl && config.isStoreEnabled && (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary bg-primary-50 rounded-lg hover:bg-primary-100 transition"
          >
            <ExternalLink className="w-4 h-4" />
            {tp('Voir la boutique')}
          </a>
        )}
      </div>

      {/* Status messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Enable/Disable Store */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{tp('Activer la boutique')}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {tp('Rendez votre boutique visible aux clients')}
            </p>
          </div>
          <button
            onClick={() => handleChange('isStoreEnabled', !config.isStoreEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.isStoreEnabled ? 'bg-primary' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                config.isStoreEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Subdomain */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{tp('Adresse de la boutique')}</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">{tp('Sous-domaine')}</label>
          <div className="space-y-2">
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={subdomainInput}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  setSubdomainInput(val);
                }}
                placeholder={tp('ma-boutique')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                maxLength={30}
              />
              <span className="px-3 py-2 bg-muted border border-l-0 border-gray-300 rounded-r-lg text-sm text-muted-foreground">
                .scalor.net
              </span>
            </div>

            <button
              onClick={generateSubdomainFromStoreName}
              disabled={generatingSubdomain || !config.storeName?.trim()}
              className="w-full px-3 py-2 bg-primary-50 text-primary border border-primary-200 rounded-lg text-sm font-medium hover:bg-primary-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {generatingSubdomain ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tp('Génération en cours...')}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {tp('Générer depuis le nom de la boutique')}
                </>
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {checkingSubdomain && (
              <span className="text-xs text-muted-foreground">{tp('Vérification...')}</span>
            )}
            {!checkingSubdomain && subdomainAvailable === true && (
              <span className="text-xs text-primary flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Disponible
              </span>
            )}
            {!checkingSubdomain && subdomainAvailable === false && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Déjà pris
              </span>
            )}
            {subdomainInput === existingSubdomain && existingSubdomain && (
              <span className="text-xs text-muted-foreground">{tp('Votre sous-domaine actuel')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Store Identity */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{tp('Identité de la boutique')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{tp('Nom de la boutique')}</label>
            <input
              type="text"
              value={config.storeName}
              onChange={(e) => handleChange('storeName', e.target.value)}
              placeholder={tp('Ma Super Boutique')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{tp('Devise')}</label>
            <select
              value={config.storeCurrency}
              onChange={(e) => handleChange('storeCurrency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="XAF">{tp('XAF (Franc CFA - CEMAC)')}</option>
              <option value="XOF">{tp('XOF (Franc CFA - UEMOA)')}</option>
              <option value="NGN">{tp('NGN (Naira)')}</option>
              <option value="GHS">{tp('GHS (Cedi)')}</option>
              <option value="KES">{tp('KES (Shilling kenyan)')}</option>
              <option value="ZAR">{tp('ZAR (Rand)')}</option>
              <option value="MAD">{tp('MAD (Dirham)')}</option>
              <option value="USD">{tp('USD (Dollar)')}</option>
              <option value="EUR">{tp('EUR (Euro)')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{tp('Description')}</label>
          <textarea
            value={config.storeDescription}
            onChange={(e) => handleChange('storeDescription', e.target.value)}
            placeholder={tp('Décrivez votre boutique en quelques mots...')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{tp('URL du logo')}</label>
            <input
              type="url"
              value={config.storeLogo}
              onChange={(e) => handleChange('storeLogo', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{tp('URL de la bannière')}</label>
            <input
              type="url"
              value={config.storeBanner}
              onChange={(e) => handleChange('storeBanner', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">{tp('Couleur du thème')}</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.storeThemeColor}
              onChange={(e) => handleChange('storeThemeColor', e.target.value)}
              className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">{config.storeThemeColor}</span>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{tp('Contact')}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{tp('Téléphone')}</label>
            <input
              type="tel"
              value={config.storePhone}
              onChange={(e) => handleChange('storePhone', e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">WhatsApp</label>
            <input
              type="tel"
              value={config.storeWhatsApp}
              onChange={(e) => handleChange('storeWhatsApp', e.target.value)}
              placeholder="+237 6XX XXX XXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveConfig}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-700 disabled:opacity-50 transition"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Sauvegarde...' : tp('Sauvegarder')}
        </button>
      </div>
    </div>
  );
};

export default StoreSetup;
