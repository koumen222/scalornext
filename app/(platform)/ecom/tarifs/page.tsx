import { Tarifs } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Tarifs — Scalor');

export default function Page() {
  return <Tarifs />;
}
