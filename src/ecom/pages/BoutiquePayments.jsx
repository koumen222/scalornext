import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import api from '../../lib/api';
import { tp } from '../i18n/platform.js';

const IcoCash = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const IcoZap = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IcoGlobe = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const IcoCard = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const IcoPhone = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const IcoWallet = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 000 4h4v-4h-4z" /></svg>;

const SCALOR_PAY_COMMISSION = '2%';

// Passerelles externes (le marchand branche ses propres clés API).
const PROVIDERS = [
  {
    id: 'cod',
    name: 'Paiement à la livraison',
    icon: <IcoCash />,
    color: '#059669',
    get desc() { return tp('Le client paie en espèces à la réception'); },
    fields: [],
    popular: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Order',
    icon: <IcoPhone />,
    color: '#25D366',
    get desc() { return tp('Le client commande via WhatsApp'); },
    fields: [
      { key: 'whatsappNumber', get label() { return tp('Numéro WhatsApp'); }, placeholder: '+237612345678' },
    ],
    popular: true,
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    icon: <IcoZap />,
    color: '#F5A623',
    desc: 'Mobile Money, Carte bancaire — Afrique',
    fields: [
      { key: 'flutterwavePublicKey', get label() { return tp('Clé publique'); }, placeholder: 'FLWPUBK-...' },
      { key: 'flutterwaveSecretKey', get label() { return tp('Clé secrète'); }, placeholder: 'FLWSECK-...' },
    ],
    popular: false,
  },
  {
    id: 'cinetpay',
    name: 'CinetPay',
    icon: <IcoGlobe />,
    color: '#1E3A5F',
    desc: 'Mobile Money — Afrique de l\'Ouest & Centrale',
    fields: [
      { key: 'cinetpayApiKey', label: 'API Key', placeholder: 'Votre API key CinetPay' },
      { key: 'cinetpaySiteId', label: 'Site ID', placeholder: 'Votre Site ID' },
      { key: 'cinetpaySecretKey', label: 'Secret Key', placeholder: 'Votre secret key' },
    ],
    popular: false,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    icon: <IcoCard />,
    color: '#635BFF',
    desc: 'Carte bancaire internationale — Visa, Mastercard',
    fields: [
      { key: 'stripePublishableKey', get label() { return tp('Clé publiable'); }, placeholder: 'pk_live_...' },
      { key: 'stripeSecretKey', get label() { return tp('Clé secrète'); }, placeholder: 'sk_live_...' },
    ],
    popular: false,
  },
];

// ── Scalor Pay — carte spéciale (encaissement géré, sans clés) ────────────────
const ScalorPayCard = ({ config, onToggle }) => {
  const isEnabled = config?.enabled;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
        isEnabled ? 'border-[#0F6B4F] shadow-lg' : 'border-[#0F6B4F]/30'
      }`}
      style={{ background: 'linear-gradient(135deg, #0F6B4F 0%, #0A5740 100%)' }}
    >
      <div className="px-5 py-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-card/15 backdrop-blur flex items-center justify-center text-white flex-shrink-0">
            <IcoWallet />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base font-extrabold text-white">Scalor Pay</p>
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-300 text-amber-900 rounded-full">{tp('RECOMMANDÉ')}</span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              {tp('Encaissez vos commandes en ligne — Mobile Money & carte. Aucune clé API requise.')}
            </p>
          </div>
          <button
            onClick={() => onToggle('scalor_pay')}
            aria-label="toggle-scalor-pay"
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isEnabled ? 'bg-card' : 'bg-card/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${isEnabled ? 'translate-x-5 bg-[#0F6B4F]' : 'bg-card'}`} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { k: tp('Commission'), v: SCALOR_PAY_COMMISSION },
            { k: tp('Versement'), v: tp('Sur votre solde') },
            { k: tp('Mise en place'), v: tp('Instantanée') },
          ].map((s) => (
            <div key={s.k} className="rounded-xl bg-card/10 px-3 py-2">
              <p className="text-[10px] text-white/70">{s.k}</p>
              <p className="text-xs font-bold text-white mt-0.5">{s.v}</p>
            </div>
          ))}
        </div>

        {isEnabled && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {tp('Vos paiements sont crédités sur votre solde')} <span className="font-semibold text-foreground">({tp('commission')} {SCALOR_PAY_COMMISSION})</span>.
            </p>
            <Link
              to="/ecom/boutique/wallet"
              className="flex-shrink-0 text-xs font-bold text-[#0F6B4F] hover:underline whitespace-nowrap"
            >
              {tp('Voir mon solde')} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

const ProviderCard = ({ provider, config, onToggle, onUpdate }) => {
  const isEnabled = config?.enabled;

  return (
    <div className={`bg-card rounded-2xl border-2 transition-all ${isEnabled ? 'border-[#6CB198] shadow-md' : 'border-border'}`}>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: provider.color + '15', color: provider.color }}>
          {provider.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{provider.name}</p>
            {provider.popular && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-700 rounded-full">{tp('POPULAIRE')}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{provider.desc}</p>
        </div>
        <button
          onClick={() => onToggle(provider.id)}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isEnabled ? 'bg-[#0F6B4F]' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-card rounded-full shadow transition-transform ${isEnabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {isEnabled && provider.fields.length > 0 && (
        <div className="px-5 pb-4 space-y-3 border-t border-border pt-4">
          {provider.fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">{f.label}</label>
              <input
                type={f.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                value={config?.[f.key] || ''}
                onChange={(e) => onUpdate(provider.id, f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-[#0F6B4F] focus:border-transparent transition bg-background focus:bg-card"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 mt-1">{children}</h2>
);

const BoutiquePayments = () => {
  const [config, setConfig] = useState({ cod: { enabled: true } });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/store/payments');
        const data = res.data?.data || {};
        // Cash on delivery activé par défaut si jamais configuré.
        if (!data.cod) data.cod = { enabled: true };
        setConfig(data);
      } catch {
        setConfig({ cod: { enabled: true } });
      }
    };
    load();
  }, []);

  const toggleProvider = (id) => {
    setConfig(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), enabled: !(prev[id]?.enabled) }
    }));
    setSaved(false);
  };

  const updateField = (providerId, key, value) => {
    setConfig(prev => ({
      ...prev,
      [providerId]: { ...(prev[providerId] || {}), [key]: value }
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/store/payments', config);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{tp('Paiements')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tp('Configurez vos modes de paiement')}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md ${
            saved ? 'bg-green-500' : 'bg-[#0F6B4F] hover:bg-[#0A5740]'
          } disabled:opacity-60`}
        >
          {saving ? tp('Enregistrement...') : saved ? '✓ ' + tp('Sauvegardé') : tp('Sauvegarder')}
        </button>
      </div>

      {/* Scalor Pay — encaissement géré */}
      <div>
        <SectionTitle>{tp('Encaissement en ligne')}</SectionTitle>
        <ScalorPayCard config={config.scalor_pay} onToggle={toggleProvider} />
      </div>

      {/* Autres modes */}
      <div className="space-y-3">
        <SectionTitle>{tp('Autres modes de paiement')}</SectionTitle>
        {PROVIDERS.map(p => (
          <ProviderCard
            key={p.id}
            provider={p}
            config={config[p.id]}
            onToggle={toggleProvider}
            onUpdate={updateField}
          />
        ))}
      </div>

      {/* Security note */}
      <div className="bg-background border border-border rounded-2xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div>
          <p className="text-xs font-semibold text-foreground">{tp('Sécurité des données')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tp('Vos clés API sont chiffrées et stockées de manière sécurisée. Elles ne sont jamais exposées côté client.')}
          </p>
        </div>
      </div>

    </div>
  );
};

export default BoutiquePayments;
