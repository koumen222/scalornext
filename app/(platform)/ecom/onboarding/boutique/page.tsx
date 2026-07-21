'use client';

import { Protected } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/StoreOnboarding.jsx';

export default function Wrapper() {
  return (
    <Protected requiredRole={'ecom_admin'}>
      <Page />
    </Protected>
  );
}
