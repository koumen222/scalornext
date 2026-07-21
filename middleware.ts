/**
 * Middleware multi-tenant — réplique la logique de src/ecom/hooks/useSubdomain.js
 * côté serveur (header Host), pour permettre le SSR/ISR des boutiques :
 *
 *  - scalor.net, www.scalor.net, localhost, *.workers.dev, … → plateforme SaaS (pas de rewrite)
 *  - koumen.scalor.net/...   → rewrite interne /sites/koumen/...
 *  - maboutique.com/...      → résolution API (resolve-domain) → /sites/{sub}/...
 *  - /store/[subdomain]/...  → inchangé (previews iframe & dev, comme la SPA)
 *
 * NB : le préfixe interne est /sites (et non /_sites : underscore = dossier privé
 * App Router, qui ne génère AUCUNE route). L'accès direct à /sites est bloqué (404).
 */

import { NextRequest, NextResponse } from 'next/server';

// Repris de useSubdomain.js
const ROOT_DOMAINS = ['scalor.net', 'ecomcookpit.site', 'ecomcookpit.pages.dev'];
const IGNORED_SUBS = ['www', 'api', 'staging', 'api-staging'];
const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// Hôtes plateforme supplémentaires (dev/preview Next)
const PLATFORM_SUFFIXES = ['.workers.dev', '.pages.dev', '.railway.app', '.railway.internal'];

function isPlatformHost(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')
  ) {
    return true;
  }
  return PLATFORM_SUFFIXES.some((s) => hostname.endsWith(s));
}

/** koumen.scalor.net → "koumen" ; scalor.net / www.scalor.net / api.scalor.net → null */
function subdomainFromRootDomains(hostname: string): string | null | undefined {
  for (const root of ROOT_DOMAINS) {
    if (hostname === root || hostname === `www.${root}`) return null;
    if (hostname.endsWith(`.${root}`)) {
      const prefix = hostname.slice(0, -(root.length + 1));
      const sub = prefix.startsWith('www.') ? prefix.slice(4) : prefix;
      if (IGNORED_SUBS.includes(sub)) return null;
      return SUBDOMAIN_RE.test(sub) ? sub : null;
    }
  }
  return undefined; // pas un ROOT_DOMAIN → domaine custom potentiel
}

// Cache de résolution des domaines custom (TTL 10 min, iso au cache localStorage de la SPA)
const DOMAIN_TTL_MS = 10 * 60 * 1000;
const domainCache = new Map<string, { subdomain: string | null; expires: number }>();

async function resolveCustomDomain(hostname: string): Promise<string | null> {
  const cached = domainCache.get(hostname);
  if (cached && Date.now() < cached.expires) return cached.subdomain;

  const raw =
    process.env.NEXT_PUBLIC_STORE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.scalor.net';
  const base = String(raw).replace(/\/+$/, '');
  const apiBase = base.endsWith('/api/store') ? base : `${base}/api/store`;

  let subdomain: string | null = null;
  try {
    const res = await fetch(`${apiBase}/resolve-domain/${encodeURIComponent(hostname)}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.data?.subdomain) subdomain = data.data.subdomain;
    }
    domainCache.set(hostname, { subdomain, expires: Date.now() + DOMAIN_TTL_MS });
  } catch {
    // API injoignable : ne pas cacher l'échec, retomber sur la plateforme
  }
  return subdomain;
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const hostname = (req.headers.get('host') || '').split(':')[0].toLowerCase();

  // /sites est un préfixe interne (cible des rewrites host→boutique) — jamais accessible
  // directement. Sur un domaine boutique, le catch-all [...rest] redirige vers l'accueil.
  if (pathname === '/sites' || pathname.startsWith('/sites/')) {
    return new NextResponse(null, { status: 404 });
  }

  if (!hostname || isPlatformHost(hostname)) return NextResponse.next();

  let subdomain = subdomainFromRootDomains(hostname);
  if (subdomain === null) return NextResponse.next(); // domaine racine / www / api
  if (subdomain === undefined) {
    subdomain = await resolveCustomDomain(hostname); // domaine custom marchand
    if (!subdomain) return NextResponse.next(); // introuvable → plateforme (iso SPA)
  }

  const target = url.clone();
  target.pathname = `/sites/${subdomain}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(target);
}

export const config = {
  // Exclut _next et tout chemin de fichier statique (contenant un point),
  // SAUF sitemap.xml et robots.txt : sur un domaine boutique ils sont réécrits
  // vers les handlers par-boutique (app/sites/[subdomain]/…), sur la plateforme
  // le middleware laisse passer (next()) vers app/sitemap.ts / app/robots.ts.
  matcher: ['/((?!_next/|.*\\..*).*)', '/sitemap.xml', '/robots.txt'],
};
