'use client';

import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/ControlCenter.jsx';

export default function Wrapper() {
  return (
    <RequireRole requiredRole={['ecom_admin','ecom_closeuse','ecom_compta']}>
      <Page />
    </RequireRole>
  );
}
