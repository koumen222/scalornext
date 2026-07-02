/**
 * robots.txt par boutique — servi sur le domaine de la boutique via le rewrite
 * middleware (/robots.txt → /sites/{sub}/robots.txt).
 */
export async function GET(req: Request) {
  const host = (req.headers.get('host') || '').split(':')[0];
  const sitemapLine = host ? `Sitemap: https://${host}/sitemap.xml\n` : '';

  const body = `User-agent: *\nAllow: /\nDisallow: /checkout\n${sitemapLine}`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
}
