import { ProviderService } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Provider — Scalor');

export default function Page() {
  return <ProviderService />;
}
