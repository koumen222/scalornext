'use client';

/**
 * StoreHtmlLang — aligne <html lang> sur la langue de la boutique (réglage marchand).
 * Le lang SSR initial vient du root layout (fr) ; on le corrige côté client,
 * même approche que PlatformPageMeta pour les titres.
 */
import { useEffect } from 'react';

const SUPPORTED = new Set(['fr', 'en', 'es']);

export default function StoreHtmlLang({ lang }: { lang?: string | null }) {
  useEffect(() => {
    const normalized = String(lang || 'fr').toLowerCase().slice(0, 2);
    document.documentElement.lang = SUPPORTED.has(normalized) ? normalized : 'fr';
    return () => {
      document.documentElement.lang = 'fr';
    };
  }, [lang]);

  return null;
}
