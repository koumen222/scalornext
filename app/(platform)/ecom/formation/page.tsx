import { Suspense } from 'react';
import { Formation } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Scalor — Plateforme e-commerce');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Formation />
    </Suspense>
  );
}
