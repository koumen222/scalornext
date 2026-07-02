/**
 * Fetch serveur vers l'API Express publique (storefront) — ISR 60s.
 * Mêmes endpoints que publicStoreApi (src/ecom/services/storeApi.js), côté serveur.
 * AUCUNE logique métier ici : simple passe-plat vers api.scalor.net.
 */

export const STORE_REVALIDATE = 60;

/** Payloads de l'API Express — formes héritées de la SPA, non typées finement. */
export type StorePayload = Record<string, any> | null;
export type ProductPagePayload = Record<string, any> | null;

function apiBase(): string {
  const raw =
    process.env.NEXT_PUBLIC_STORE_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'https://api.scalor.net';
  const clean = String(raw).replace(/\/+$/, '');
  return clean.endsWith('/api/store') ? clean : `${clean}/api/store`;
}

async function fetchStoreJson(path: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: STORE_REVALIDATE },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    // API indisponible → les composants client refetchent (comportement SPA)
    return null;
  }
}

/** { store, sections, products, pixels, footer, legalPages } | null */
export function getStorePayload(subdomain: string | undefined): Promise<StorePayload> {
  if (!subdomain) return Promise.resolve(null);
  return fetchStoreJson(`/${encodeURIComponent(subdomain)}`);
}

/** { product, store, pixels, footer } | null */
export function getProductPagePayload(
  subdomain: string | undefined,
  slug: string | undefined
): Promise<ProductPagePayload> {
  if (!subdomain || !slug) return Promise.resolve(null);
  return fetchStoreJson(
    `/${encodeURIComponent(subdomain)}/product-page/${encodeURIComponent(slug)}`
  );
}
