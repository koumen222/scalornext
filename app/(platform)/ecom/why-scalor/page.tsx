import { WhyScalor } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Pourquoi Scalor ? — Scalor');

export default function Page() {
  return <WhyScalor />;
}
