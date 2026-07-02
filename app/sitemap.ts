import type { MetadataRoute } from 'next';

/**
 * Sitemap de la plateforme (scalor.net) : pages publiques SaaS.
 * Les boutiques ont chacune leur propre sitemap sur leur domaine
 * (middleware → app/sites/[subdomain]/sitemap.xml/route.ts).
 */
const BASE = 'https://scalor.net';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: Array<{ path: string; priority: number }> = [
    { path: '/ecom/landing', priority: 1 },
    { path: '/ecom/why-scalor', priority: 0.8 },
    { path: '/ecom/tarifs', priority: 0.9 },
    { path: '/ecom/formation', priority: 0.6 },
    { path: '/provider', priority: 0.6 },
    { path: '/ecom/privacy', priority: 0.3 },
    { path: '/ecom/terms', priority: 0.3 },
  ];

  return pages.map(({ path, priority }) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority,
  }));
}
