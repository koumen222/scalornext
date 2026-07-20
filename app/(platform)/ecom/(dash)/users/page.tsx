'use client';

import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/TeamAssignments.jsx';

export default function Wrapper() {
  return (
    <RequireRole requiredRole={'ecom_admin'}>
      <Page />
    </RequireRole>
  );
}
