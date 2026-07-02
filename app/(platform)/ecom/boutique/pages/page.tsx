'use client';

import { RequireStore } from '@/lib/dashboard/chrome';
import Page from '@/src/ecom/pages/BoutiquePages.jsx';

export default function Wrapper() {
  return (
    <RequireStore>
      <Page />
    </RequireStore>
  );
}
