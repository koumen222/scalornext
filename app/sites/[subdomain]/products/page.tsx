import { SiteProductsPage, productsGenerateMetadata } from '@/lib/storefront/routes';

export const revalidate = 60;
export const generateMetadata = productsGenerateMetadata;
export default SiteProductsPage;
