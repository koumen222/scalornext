'use client';

import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/Commissions.jsx';

export default function Wrapper() {
  return (
    <RequireRole requiredRole={'ecom_closeuse'}>
      <Page />
    </RequireRole>
  );
}
