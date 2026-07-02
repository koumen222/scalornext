import { LandingPage } from '@/lib/platform/clients';
import { platformMetadata } from '@/lib/platform/meta';

export const metadata = platformMetadata('Accueil — Scalor');

export default function Page() {
  return <LandingPage />;
}
