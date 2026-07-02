import { makeSiteLayout, layoutGenerateMetadata } from '@/lib/storefront/routes';

export const revalidate = 60;
export const generateMetadata = layoutGenerateMetadata;
export default makeSiteLayout(true);
