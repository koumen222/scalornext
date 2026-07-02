'use client';

import type { ComponentType } from 'react';
import StoreCreationWizardJs from '@/src/ecom/pages/StoreCreationWizard.jsx';

// Typage d'interop : onComplete est optionnelle à l'exécution (onComplete?.()),
// rendue sans prop comme dans la SPA.
const Page = StoreCreationWizardJs as ComponentType<{ onComplete?: () => void }>;

export default function Wrapper() {
  return <Page />;
}
