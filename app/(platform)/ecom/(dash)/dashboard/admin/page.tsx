'use client';

import { StoreProviderClient } from '@/lib/dashboard/chrome';
import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/AdminDashboard.jsx';
import OnboardingJourney from '@/src/ecom/components/OnboardingJourney.jsx';

// iso App.jsx : <StoreProvider><LayoutRoute requiredRole="ecom_admin"><AdminDashboard/>
// + visite guidée complète (dashboard → boutique → dashboard) au premier accès
// ou après la création de la boutique.
export default function Wrapper() {
  return (
    <StoreProviderClient>
      <RequireRole requiredRole="ecom_admin">
        <Page />
        <OnboardingJourney />
      </RequireRole>
    </StoreProviderClient>
  );
}
