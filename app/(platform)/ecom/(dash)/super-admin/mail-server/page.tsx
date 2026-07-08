'use client';

import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/SuperAdminMailServer.jsx';

export default function Wrapper() {
  return (
    <RequireRole requiredRole={'super_admin'}>
      <Page />
    </RequireRole>
  );
}
