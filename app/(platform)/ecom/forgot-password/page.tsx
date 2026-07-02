import { Suspense } from 'react';
import { ForgotPassword } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Mot de passe oublié — Scalor');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ForgotPassword />
    </Suspense>
  );
}
