'use client';

import { StoreProviderClient } from '@/lib/dashboard/chrome';
import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/AdminDashboard.jsx';

// iso App.jsx : <StoreProvider><LayoutRoute requiredRole="ecom_admin"><AdminDashboard/>
export default function Wrapper() {
  return (
    <StoreProviderClient>
      <RequireRole requiredRole="ecom_admin">
        <Page />
      </RequireRole>
    </StoreProviderClient>
  );
}
