'use client';

/**
 * Section boutique "gérée" — iso RequireStore + KeyedBoutiqueLayout d'App.jsx.
 */
import type { ReactNode } from 'react';
import { BoutiqueChrome } from '@/lib/dashboard/chrome';

export default function BoutiqueChromeLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <BoutiqueChrome>
      {children}
      {modal}
    </BoutiqueChrome>
  );
}
