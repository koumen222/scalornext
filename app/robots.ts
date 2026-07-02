import type { MetadataRoute } from 'next';

/**
 * robots.txt de la plateforme (scalor.net).
 * Sur les domaines boutiques, le middleware rewrite /robots.txt vers
 * app/sites/[subdomain]/robots.txt/route.ts (robots par boutique).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/ecom/landing',
          '/ecom/why-scalor',
          '/ecom/tarifs',
          '/ecom/privacy',
          '/ecom/terms',
          '/ecom/formation',
          '/ecom/login',
          '/ecom/register',
          '/provider',
        ],
        // Dashboard privé + previews boutique par chemin (contenu dupliqué) + portail affilié
        disallow: ['/ecom/', '/store/', '/sites/', '/affiliate/'],
      },
    ],
    sitemap: 'https://scalor.net/sitemap.xml',
  };
}
