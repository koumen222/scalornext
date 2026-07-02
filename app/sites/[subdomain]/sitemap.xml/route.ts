import { getStorePayload } from '@/lib/storefront/api';

/**
 * Sitemap par boutique — servi sur le domaine de la boutique via le rewrite
 * middleware (/sitemap.xml → /sites/{sub}/sitemap.xml).
 * URLs absolues construites depuis le Host entrant (sous-domaine OU domaine custom).
 * Les données passent par le cache fetch ISR 60s de getStorePayload.
 */

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params;
  const host = (req.headers.get('host') || `${subdomain}.scalor.net`).split(':')[0];
  const base = `https://${host}`;

  const payload = await getStorePayload(subdomain);
  const products: Array<Record<string, any>> = Array.isArray(payload?.products)
    ? payload.products
    : [];

  const urls: string[] = [
    `${base}/`,
    `${base}/products`,
    ...products
      .map((p) => (typeof p?.slug === 'string' && p.slug ? `${base}/products/${encodeURIComponent(p.slug)}` : null))
      .filter((u): u is string => !!u),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
