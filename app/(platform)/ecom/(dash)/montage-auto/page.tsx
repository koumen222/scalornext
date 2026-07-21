'use client';

import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/AutoMontage.jsx';

export default function Wrapper() {
  return (
    <RequireRole requiredRole={'ecom_admin'}>
      <Page />
    </RequireRole>
  );
}
