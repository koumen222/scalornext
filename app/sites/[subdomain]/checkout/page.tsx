import { SiteCheckoutPage, checkoutGenerateMetadata } from '@/lib/storefront/routes';

export const revalidate = 60;
export const generateMetadata = checkoutGenerateMetadata;
export default SiteCheckoutPage;
