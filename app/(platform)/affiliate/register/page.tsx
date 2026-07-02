import { Suspense } from 'react';
import { AffiliateRegister } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Inscription affilié — Scalor');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AffiliateRegister />
    </Suspense>
  );
}
