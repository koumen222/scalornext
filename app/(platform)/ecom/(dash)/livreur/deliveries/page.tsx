'use client';

import { RequireRole } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/LivreurDeliveries.jsx';

export default function Wrapper() {
  return (
    <RequireRole requiredRole={'ecom_livreur'}>
      <Page />
    </RequireRole>
  );
}
