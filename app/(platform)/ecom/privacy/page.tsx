import { PrivacyPolicy } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Confidentialité — Scalor');

export default function Page() {
  return <PrivacyPolicy />;
}
