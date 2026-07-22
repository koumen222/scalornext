'use client';

import React, { useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { authApi } from '../services/ecommApi.js';
import { COUNTRY_PHONE_OPTIONS } from '../utils/phoneCodes.js';
import { ACQUISITION_SOURCES } from '../utils/acquisitionSources.js';
import { tp } from '../i18n/platform.js';

// ─────────────────────────────────────────────────────────────────────────────
// /ecom/onboarding/profil — complétion du profil après une inscription Google
// (téléphone avec indicatif + « Comment avez-vous connu Scalor ? »).
// L'inscription classique collecte déjà ces infos dans le formulaire.
// Après soumission → relais /ecom/onboarding/boutique (wizard ou dashboard).
// ─────────────────────────────────────────────────────────────────────────────

const readLocalUser = () => {
  try { return JSON.parse(localStorage.getItem('ecomUser') || 'null'); } catch { return null; }
};

const ProfileOnboarding = () => {
  const navigate = useNavigate();
  const localUser = readLocalUser();

  const [name, setName] = useState(localUser?.name || '');
  const [phoneCode, setPhoneCode] = useState('+237');
  const [phone, setPhone] = useState('');
  const [acquisitionSource, setAcquisitionSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const phoneDigits = phone.replace(/\D/g, '');
  const canSubmit = name.trim().length >= 2 && phoneDigits.length >= 6 && !!acquisitionSource && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true); setError('');
    try {
      const res = await authApi.completeProfile({
        name: name.trim(),
        phone: `${phoneCode} ${phone.trim()}`,
        acquisitionSource,
      });
      const freshUser = res.data?.data?.user;
      if (freshUser) {
        try { localStorage.setItem('ecomUser', JSON.stringify(freshUser)); } catch { /* privé */ }
      }
      // Le relais standard décide de la suite (wizard boutique ou dashboard).
      navigate('/ecom/onboarding/boutique', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || tp('Impossible d\'enregistrer votre profil. Réessayez.'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-card flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-[440px] relative">
        <div className="text-center mb-7">
          <img src="/logo.png" alt="Scalor" className="h-8 object-contain mx-auto" />
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm p-6 sm:p-7">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-foreground">{tp('Faisons connaissance')}</h1>
            <p className="text-muted-foreground text-sm mt-1">{tp('Encore deux infos pour finaliser votre compte.')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-500 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">{tp('Nom complet')}</label>
              <input type="text" required placeholder={tp('Votre nom et prenom')}
                value={name} onChange={e => setName(e.target.value)}
                className="block w-full px-4 py-3 bg-card border border-gray-300 rounded-xl text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition" />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">{tp('Téléphone (WhatsApp)')}</label>
              <div className="flex items-stretch gap-2">
                <select
                  value={phoneCode}
                  onChange={e => setPhoneCode(e.target.value)}
                  className="w-[118px] flex-shrink-0 px-2 py-3 bg-card border border-gray-300 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition"
                >
                  {COUNTRY_PHONE_OPTIONS.map(opt => (
                    <option key={`${opt.country}-${opt.code}`} value={opt.code}>{opt.flag} {opt.code}</option>
                  ))}
                </select>
                <input type="tel" required inputMode="tel" placeholder="6XX XXX XXX"
                  value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s-]/g, ''))}
                  className="block w-full px-4 py-3 bg-card border border-gray-300 rounded-xl text-foreground placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 uppercase tracking-wide">{tp('Comment avez-vous connu Scalor ?')}</label>
              <select
                required
                value={acquisitionSource}
                onChange={e => setAcquisitionSource(e.target.value)}
                className={`block w-full px-4 py-3 bg-card border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition ${acquisitionSource ? 'text-foreground' : 'text-gray-400'}`}
              >
                <option value="" disabled>{tp('Choisissez une option')}</option>
                {ACQUISITION_SOURCES.map(src => (
                  <option key={src} value={src} className="text-foreground">{src}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {tp('Continuer')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileOnboarding;
