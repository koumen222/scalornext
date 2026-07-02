import { Suspense } from 'react';
import { InviteAccept } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Invitation — Scalor');

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InviteAccept />
    </Suspense>
  );
}
