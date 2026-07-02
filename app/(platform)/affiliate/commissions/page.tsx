'use client';

import { Suspense } from 'react';
import { PageLoader } from '@/lib/dashboard/guards';
import Page from '@/src/ecom/pages/AffiliateCommissions.jsx';

export default function Wrapper() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  );
}
