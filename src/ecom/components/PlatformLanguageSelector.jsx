'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PLATFORM_LANGUAGES, usePlatformLang, setPlatformLang, usePlatformT, applyStoredPlatformLang } from '../i18n/platform.js';

/**
 * Sélecteur de langue de la PLATEFORME (interface admin) — fr/en/es.
 * Persisté en localStorage (scalorPlatformLang), applique la langue immédiatement.
 * Même style que CurrencySelector (compact).
 */
const PlatformLanguageSelector = ({ compact = false }) => {
  const lang = usePlatformLang();
  const t = usePlatformT();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const current = PLATFORM_LANGUAGES.find((l) => l.value === lang) || PLATFORM_LANGUAGES[0];

  // Applique la langue sauvegardée après montage (rendu initial fr = HTML serveur)
  useEffect(() => { applyStoredPlatformLang(); }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [isOpen]);

  const select = (value) => {
    setPlatformLang(value);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('Langue')}
        className={compact
          ? 'flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:border-primary-500 transition'
          : 'flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-primary-500 transition'}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="font-medium text-gray-700 uppercase">{current.value}</span>
        <svg className={`w-4 h-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-44 rounded-xl border border-gray-200 bg-white py-1.5 shadow-xl">
          <p className="px-3 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">{t('Langue')}</p>
          {PLATFORM_LANGUAGES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => select(option.value)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-gray-50 ${option.value === lang ? 'font-semibold text-primary-700' : 'text-gray-700'}`}
            >
              <span className="text-base leading-none">{option.flag}</span>
              <span className="flex-1">{option.label}</span>
              {option.value === lang && (
                <svg className="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlatformLanguageSelector;
