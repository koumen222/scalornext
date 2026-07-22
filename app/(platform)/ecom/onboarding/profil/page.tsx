'use client';

import { Protected } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/ProfileOnboarding.jsx';

// Complétion du profil post-Google (téléphone + canal d'acquisition),
// avant le funnel boutique.
export default function Wrapper() {
  return (
    <Protected requiredRole={'ecom_admin'}>
      <Page />
    </Protected>
  );
}
