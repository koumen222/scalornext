import { TermsOfService } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata("Conditions d'utilisation — Scalor");

export default function Page() {
  return <TermsOfService />;
}
