'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Bouton de bascule clair/sombre.
 * S'appuie sur la classe `dark` de <html> (déjà posée avant le paint par le
 * script du layout racine) et persiste le choix dans localStorage('theme').
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      /* stockage indisponible : la bascule reste effective pour la session */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={dark ? 'Mode clair' : 'Mode sombre'}
      className={`inline-flex items-center justify-center p-1.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${className}`}
    >
      {/* Avant le montage, on affiche l'icône lune par défaut pour éviter tout écart d'hydratation */}
      {mounted && dark ? (
        <Sun className="w-[18px] h-[18px]" />
      ) : (
        <Moon className="w-[18px] h-[18px]" />
      )}
    </button>
  );
}

export default ThemeToggle;
