import { Suspense } from 'react';
import { Login } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Connexion — Scalor');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
