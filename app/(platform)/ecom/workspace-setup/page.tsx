import { Suspense } from 'react';
import { WorkspaceSetup } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Configuration workspace — Scalor');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WorkspaceSetup />
    </Suspense>
  );
}
