import React, { useState, useEffect } from 'react';
import { Loader2, Save, Plus, Trash2, Clock, Check, X, AlertCircle, Wand2 } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { getContextualError } from '../utils/errorMessages';
import { tp } from '../i18n/platform.js';

// Ordre d'affichage de la grille Creative Center (les libellés viennent du backend).
const CREATIVE_FEATURE_ORDER = ['text', 'image', 'voice', 'video', 'montage', 'clone', 'lipsync', 'translation'];

const LIMIT_FIELDS = [
  { key: 'maxOrders', label: 'Commandes / mois' },
  { key: 'maxCustomers', label: 'Clients max' },
  { key: 'maxProducts', label: 'Produits max' },
  { key: 'maxStores', label: 'Boutiques max' },
  { key: 'maxUsers', label: 'Utilisateurs' },
  { key: 'maxWhatsappInstances', label: 'Instances WhatsApp' },
  { key: 'maxWhatsappMessagesPerDay', label: 'Messages WA / jour' },
  { key: 'maxWhatsappMessagesPerMonth', label: 'Messages WA / mois' },
  { key: 'maxAiPageCredits', label: 'Crédits page IA / mois' }
];

const FEATURE_FIELDS = [
  { key: 'hasAiAgent', label: 'Agent IA WhatsApp' },
  { key: 'hasAiPageGen', label: 'Génération pages IA' },
  { key: 'hasPrioritySupport', label: 'Support prioritaire' },
  { key: 'hasApiWebhooks', label: 'API & webhooks' },
  { key: 'hasMultiStore', label: 'Multi-boutiques' },
  { key: 'hasAnalyticsDashboard', label: 'Tableau de bord analytique' },
  { key: 'hasCustomStore', label: 'Boutique personnalisée' }
];

const fmtDateTimeLocal = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const buildGenerationPricingForm = (pricing = {}) => ({
  currency: pricing.currency || 'FCFA',
  unitPriceRegular: pricing.unitRegular ?? pricing.unit ?? 1000,
  unitPricePromo: pricing.unitPromo ?? '',
  packPriceRegular: pricing.pack3Regular ?? pricing.pack3 ?? 2500,
  packPricePromo: pricing.pack3Promo ?? '',
  promoActive: !!pricing.promoActive,
  promoExpiresAt: pricing.promoExpiresAt || null,
});

const SuperAdminPlans = () => {
  const [plans, setPlans] = useState([]);
  const [generationPricing, setGenerationPricing] = useState(() => buildGenerationPricingForm());
  const [creativePricing, setCreativePricing] = useState(null); // { pricePerCreditFcfa, features }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [generationPricingSaving, setGenerationPricingSaving] = useState(false);
  const [creativePricingSaving, setCreativePricingSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPlans = async () => {
    try {
      const res = await ecomApi.get('/super-admin/plans');
      setPlans(res.data.plans || []);
    } catch (err) {
      setError(getContextualError(err, 'load_dashboard'));
    }
  };

  const fetchGenerationPricing = async () => {
    try {
      const res = await ecomApi.get('/super-admin/generation-pricing');
      setGenerationPricing(buildGenerationPricingForm(res.data?.pricing));
    } catch (err) {
      setError(getContextualError(err, 'load_dashboard'));
    }
  };

  const fetchCreativePricing = async () => {
    try {
      const res = await ecomApi.get('/super-admin/creative-pricing');
      if (res.data?.success && res.data.pricing) setCreativePricing(res.data.pricing);
    } catch (err) {
      setError(getContextualError(err, 'load_dashboard'));
    }
  };

  useEffect(() => {
    Promise.all([fetchPlans(), fetchGenerationPricing(), fetchCreativePricing()]).finally(() => setLoading(false));
  }, []);

  const update = (key, patch) => {
    setPlans(prev => prev.map(p => p.key === key ? { ...p, ...patch } : p));
  };

  const updateLimits = (key, field, value) => {
    setPlans(prev => prev.map(p => p.key === key ? { ...p, limits: { ...p.limits, [field]: value } } : p));
  };

  const updateFeatures = (key, field, value) => {
    setPlans(prev => prev.map(p => p.key === key ? { ...p, features: { ...p.features, [field]: value } } : p));
  };

  const updateGenerationPricing = (patch) => {
    setGenerationPricing(prev => ({ ...prev, ...patch }));
  };

  const handleSave = async (plan) => {
    setSaving(s => ({ ...s, [plan.key]: true }));
    setError(''); setSuccess('');
    try {
      const payload = {
        displayName: plan.displayName,
        tagline: plan.tagline,
        priceRegular: Number(plan.priceRegular) || 0,
        pricePromo: plan.pricePromo === '' || plan.pricePromo == null ? null : Number(plan.pricePromo),
        promoActive: !!plan.promoActive,
        promoExpiresAt: plan.promoExpiresAt || null,
        currency: plan.currency || 'FCFA',
        limits: Object.fromEntries(LIMIT_FIELDS.map(f => [f.key, Number(plan.limits?.[f.key] ?? -1)])),
        features: Object.fromEntries(FEATURE_FIELDS.map(f => [f.key, !!plan.features?.[f.key]])),
        featuresList: plan.featuresList || [],
        highlighted: !!plan.highlighted,
        ctaLabel: plan.ctaLabel || 'Commencer',
        order: Number(plan.order) || 0
      };
      await ecomApi.patch(`/super-admin/plans/${plan.key}`, payload);
      setSuccess(`Plan "${plan.displayName}" sauvegardé`);
      fetchPlans();
    } catch (err) {
      setError(getContextualError(err, 'update_settings'));
    } finally {
      setSaving(s => ({ ...s, [plan.key]: false }));
    }
  };

  // ── Tarifs Creative Center ──
  const updateCreativeCredits = (key, value) => {
    setCreativePricing(prev => prev ? {
      ...prev,
      features: { ...prev.features, [key]: { ...prev.features[key], credits: value } },
    } : prev);
  };

  const handleSaveCreativePricing = async () => {
    if (!creativePricing) return;
    setCreativePricingSaving(true);
    setError(''); setSuccess('');
    try {
      const features = {};
      for (const [k, f] of Object.entries(creativePricing.features || {})) {
        const n = Number(f.credits);
        if (!Number.isFinite(n) || n < 0) {
          setError(`Coût invalide pour « ${f.label} » — entier ≥ 0 requis (0 = gratuit).`);
          setCreativePricingSaving(false);
          return;
        }
        features[k] = Math.round(n);
      }
      const payload = { pricePerCreditFcfa: Number(creativePricing.pricePerCreditFcfa) || 80, features };
      const res = await ecomApi.patch('/super-admin/creative-pricing', payload);
      if (res.data?.pricing) setCreativePricing(res.data.pricing);
      setSuccess('Tarifs Creative Center sauvegardés — appliqués aux prochaines générations.');
    } catch (err) {
      setError(getContextualError(err, 'update_settings'));
    } finally {
      setCreativePricingSaving(false);
    }
  };

  const handleSaveGenerationPricing = async () => {
    setGenerationPricingSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        currency: generationPricing.currency || 'FCFA',
        unitPriceRegular: Number(generationPricing.unitPriceRegular) || 0,
        unitPricePromo: generationPricing.unitPricePromo === '' || generationPricing.unitPricePromo == null
          ? null
          : Number(generationPricing.unitPricePromo),
        packPriceRegular: Number(generationPricing.packPriceRegular) || 0,
        packPricePromo: generationPricing.packPricePromo === '' || generationPricing.packPricePromo == null
          ? null
          : Number(generationPricing.packPricePromo),
        promoActive: !!generationPricing.promoActive,
        promoExpiresAt: generationPricing.promoExpiresAt || null,
      };

      const res = await ecomApi.patch('/super-admin/generation-pricing', payload);
      setGenerationPricing(buildGenerationPricingForm(res.data?.pricing));
      setSuccess('Tarifs des credits IA sauvegardes');
    } catch (err) {
      setError(getContextualError(err, 'update_settings'));
    } finally {
      setGenerationPricingSaving(false);
    }
  };

  const addFeatureLine = (key) => {
    update(key, { featuresList: [...(plans.find(p => p.key === key)?.featuresList || []), ''] });
  };
  const updateFeatureLine = (key, idx, value) => {
    const list = [...(plans.find(p => p.key === key)?.featuresList || [])];
    list[idx] = value;
    update(key, { featuresList: list });
  };
  const removeFeatureLine = (key, idx) => {
    const list = [...(plans.find(p => p.key === key)?.featuresList || [])];
    list.splice(idx, 1);
    update(key, { featuresList: list });
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#0F6B4F]" /></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{tp('Gestion des plans')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tp('Configurez les prix, les limites et les fonctionnalités de chaque plan. Les comptes sans abonnement utilisent automatiquement le plan')} <strong>{tp('Gratuit')}</strong>.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      <div className="mb-6 bg-card rounded-xl border p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{tp('Tarifs credits IA pages produit')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{tp('Modifiez les prix affiches dans le studio produit et appliquez une promo temporaire sans toucher au code.')}</p>
          </div>
          <a
            href="/ecom/super-admin/promo-codes"
            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-[#0F6B4F] bg-[#E6F4EF] rounded-lg hover:bg-[#D8EEE6] transition"
          >
            {tp('Gérer les codes promo')}
          </a>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 mb-4">
          <label className="text-xs text-muted-foreground">
            Prix unitaire normal ({generationPricing.currency || tp('FCFA')})
            <input
              type="number"
              value={generationPricing.unitPriceRegular ?? 0}
              onChange={e => updateGenerationPricing({ unitPriceRegular: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Prix unitaire promo ({generationPricing.currency || tp('FCFA')})
            <input
              type="number"
              value={generationPricing.unitPricePromo ?? ''}
              onChange={e => updateGenerationPricing({ unitPricePromo: e.target.value })}
              placeholder="—"
              className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Pack 3 normal ({generationPricing.currency || tp('FCFA')})
            <input
              type="number"
              value={generationPricing.packPriceRegular ?? 0}
              onChange={e => updateGenerationPricing({ packPriceRegular: e.target.value })}
              className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Pack 3 promo ({generationPricing.currency || tp('FCFA')})
            <input
              type="number"
              value={generationPricing.packPricePromo ?? ''}
              onChange={e => updateGenerationPricing({ packPricePromo: e.target.value })}
              placeholder="—"
              className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
            />
          </label>
        </div>

        <div className={`mb-4 p-3 rounded-lg border ${generationPricing.promoActive ? 'bg-orange-50 border-orange-200' : 'bg-background border-border'}`}>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!generationPricing.promoActive}
              onChange={e => updateGenerationPricing({ promoActive: e.target.checked })}
              className="w-4 h-4 rounded accent-orange-600"
            />
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-foreground">{tp('Promo credits IA active')}</span>
          </label>
          {generationPricing.promoActive && (
            <label className="block mt-2 text-xs text-muted-foreground">
              {tp('Expire le')}
              <input
                type="datetime-local"
                value={fmtDateTimeLocal(generationPricing.promoExpiresAt)}
                onChange={e => updateGenerationPricing({ promoExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="mt-1 w-full max-w-sm px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
              />
            </label>
          )}
        </div>

        <button
          onClick={handleSaveGenerationPricing}
          disabled={generationPricingSaving}
          className="w-full sm:w-auto bg-[#0F6B4F] hover:bg-[#0C5840] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition"
        >
          {generationPricingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder les tarifs IA
        </button>
      </div>

      {/* ── Tarifs Creative Center — crédits par fonctionnalité ── */}
      <div className="mb-6 bg-card rounded-xl border p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4EF] flex items-center justify-center shrink-0">
            <Wand2 className="w-5 h-5 text-[#0F6B4F]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{tp('Tarifs Creative Center')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{tp('Coût en crédits de chaque fonctionnalité, débité à la génération. 0 = gratuit. Appliqué en moins de 30 secondes, sans redéploiement.')}</p>
          </div>
        </div>

        {!creativePricing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> {tp('Chargement de la grille…')}
          </div>
        ) : (
          <>
            <label className="block text-xs text-muted-foreground mb-4 max-w-xs">
              {tp('Prix du crédit (FCFA) — packs de recharge')}
              <input
                type="number"
                min="1"
                value={creativePricing.pricePerCreditFcfa ?? 80}
                onChange={e => setCreativePricing(prev => ({ ...prev, pricePerCreditFcfa: e.target.value }))}
                className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
              />
            </label>

            <div className="border border-border rounded-lg overflow-hidden mb-4">
              <div className="grid grid-cols-[1fr_110px_110px] gap-2 px-3 py-2 bg-background text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span>{tp('Fonctionnalité')}</span>
                <span className="text-center">{tp('Crédits')}</span>
                <span className="text-right">{tp('Équivalent')}</span>
              </div>
              {CREATIVE_FEATURE_ORDER.filter(k => creativePricing.features?.[k]).map(key => {
                const f = creativePricing.features[key];
                const n = Number(f.credits);
                const valid = Number.isFinite(n) && n >= 0;
                const fcfa = valid ? n * (Number(creativePricing.pricePerCreditFcfa) || 0) : null;
                return (
                  <div key={key} className="grid grid-cols-[1fr_110px_110px] gap-2 items-center px-3 py-2 border-t border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{f.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{f.unit}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={f.credits}
                      onChange={e => updateCreativeCredits(key, e.target.value)}
                      className={`w-full px-2 py-1.5 border rounded focus:outline-none text-sm text-center font-semibold ${valid ? 'border-gray-300 focus:border-[#0F6B4F]' : 'border-red-400 bg-red-50'}`}
                    />
                    <span className={`text-right text-xs font-medium ${valid && n === 0 ? 'text-[#0F6B4F]' : 'text-muted-foreground'}`}>
                      {!valid ? '—' : n === 0 ? tp('Gratuit') : `${fcfa} FCFA`}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-muted-foreground mb-4">{tp('Les générations échouées sont remboursées automatiquement. La grille est visible par les marchands dans Creative Center → Paramètres.')}</p>

            <button
              onClick={handleSaveCreativePricing}
              disabled={creativePricingSaving}
              className="w-full sm:w-auto bg-[#0F6B4F] hover:bg-[#0C5840] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              {creativePricingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {tp('Sauvegarder les tarifs Creative Center')}
            </button>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {plans.map(plan => {
          const promoExpired = plan.promoActive && plan.promoExpiresAt && new Date(plan.promoExpiresAt).getTime() < Date.now();
          return (
            <div key={plan.key} className={`bg-card rounded-xl border-2 ${plan.highlighted ? 'border-[#0F6B4F]' : 'border-border'} p-5 shadow-sm`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{plan.key}</span>
                    {plan.highlighted && <span className="text-[10px] font-bold text-[#0F6B4F] bg-[#E6F4EF] px-2 py-0.5 rounded">POPULAIRE</span>}
                  </div>
                  <input
                    value={plan.displayName}
                    onChange={e => update(plan.key, { displayName: e.target.value })}
                    className="text-lg font-bold text-foreground mt-2 w-full border-b border-transparent hover:border-gray-300 focus:border-[#0F6B4F] focus:outline-none"
                  />
                  <input
                    value={plan.tagline || ''}
                    onChange={e => update(plan.key, { tagline: e.target.value })}
                    placeholder={tp('Sous-titre')}
                    className="text-sm text-muted-foreground mt-1 w-full border-b border-transparent hover:border-gray-300 focus:border-[#0F6B4F] focus:outline-none"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="text-xs text-muted-foreground">
                  {tp('Prix normal (FCFA)')}
                  <input
                    type="number"
                    value={plan.priceRegular ?? 0}
                    onChange={e => update(plan.key, { priceRegular: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  {tp('Prix promo (FCFA)')}
                  <input
                    type="number"
                    value={plan.pricePromo ?? ''}
                    onChange={e => update(plan.key, { pricePromo: e.target.value })}
                    placeholder="—"
                    className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
                  />
                </label>
              </div>

              {/* Promo toggle */}
              <div className={`mb-4 p-3 rounded-lg border ${plan.promoActive ? 'bg-orange-50 border-orange-200' : 'bg-background border-border'}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!plan.promoActive}
                    onChange={e => update(plan.key, { promoActive: e.target.checked })}
                    className="w-4 h-4 rounded accent-orange-600"
                  />
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-foreground">{tp('Offre limitée active')}</span>
                  {promoExpired && <span className="text-xs text-red-600 font-medium">{tp('(expirée)')}</span>}
                </label>
                {plan.promoActive && (
                  <label className="block mt-2 text-xs text-muted-foreground">
                    {tp('Expire le')}
                    <input
                      type="datetime-local"
                      value={fmtDateTimeLocal(plan.promoExpiresAt)}
                      onChange={e => update(plan.key, { promoExpiresAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                      className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
                    />
                  </label>
                )}
              </div>

              {/* Limits */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">{tp('Limites (–1 = illimité)')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {LIMIT_FIELDS.map(f => (
                    <label key={f.key} className="text-xs text-muted-foreground">
                      {f.label}
                      <input
                        type="number"
                        value={plan.limits?.[f.key] ?? -1}
                        onChange={e => updateLimits(plan.key, f.key, e.target.value)}
                        className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">{tp('Fonctionnalités')}</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {FEATURE_FIELDS.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-xs text-foreground py-0.5">
                      <input
                        type="checkbox"
                        checked={!!plan.features?.[f.key]}
                        onChange={e => updateFeatures(plan.key, f.key, e.target.checked)}
                        className="w-4 h-4 rounded accent-[#0F6B4F]"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Features list (bullets) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{tp('Bullets affichés')}</h3>
                  <button
                    onClick={() => addFeatureLine(plan.key)}
                    className="text-xs text-[#0F6B4F] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Ajouter
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(plan.featuresList || []).map((line, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        value={line}
                        onChange={e => updateFeatureLine(plan.key, idx, e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
                      />
                      <button onClick={() => removeFeatureLine(plan.key, idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Misc */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <label className="text-xs text-muted-foreground">
                  {tp('Label du bouton')}
                  <input
                    value={plan.ctaLabel || ''}
                    onChange={e => update(plan.key, { ctaLabel: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Ordre d'affichage
                  <input
                    type="number"
                    value={plan.order ?? 0}
                    onChange={e => update(plan.key, { order: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 border border-gray-300 rounded focus:border-[#0F6B4F] focus:outline-none text-sm"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 mb-4 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={!!plan.highlighted}
                  onChange={e => update(plan.key, { highlighted: e.target.checked })}
                  className="w-4 h-4 rounded accent-[#0F6B4F]"
                />
                Mettre en avant (carte "populaire")
              </label>

              <button
                onClick={() => handleSave(plan)}
                disabled={saving[plan.key]}
                className="w-full bg-[#0F6B4F] hover:bg-[#0C5840] disabled:opacity-50 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
              >
                {saving[plan.key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Sauvegarder
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuperAdminPlans;
