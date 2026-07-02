import { Suspense } from 'react';
import { SetupSuperAdmin } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Configuration admin — Scalor');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SetupSuperAdmin />
    </Suspense>
  );
}
