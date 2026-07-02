import { SiteProductPage, productGenerateMetadata } from '@/lib/storefront/routes';

export const revalidate = 60;
export const generateMetadata = productGenerateMetadata;
export default SiteProductPage;
