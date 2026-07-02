import { Suspense } from 'react';
import { AffiliateLogin } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Connexion affilié — Scalor');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AffiliateLogin />
    </Suspense>
  );
}
