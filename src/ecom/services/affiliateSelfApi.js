import ecomApi from './ecommApi.js';

// ─── Affiliation intégrée au compte Scalor ───────────────────────────────────
// Aucun compte affilié séparé : les endpoints /affiliates/me/* sont
// authentifiés par la session Scalor (Bearer ecom) et auto-provisionnent le
// profil affilié au premier appel (cf. Backend/routes/affiliate.js).
export const affiliateSelfApi = {
  dashboard: () => ecomApi.get('/affiliates/me/dashboard'),
  summary: (params = {}) => ecomApi.get('/affiliates/me/stats/summary', { params }),
  timeseries: (params = {}) => ecomApi.get('/affiliates/me/stats/timeseries', { params }),
  linksStats: (params = {}) => ecomApi.get('/affiliates/me/stats/links', { params }),
  links: () => ecomApi.get('/affiliates/me/links'),
  createLink: (payload) => ecomApi.post('/affiliates/me/links', payload),
  referrals: () => ecomApi.get('/affiliates/me/referrals'),
  conversions: (params = {}) => ecomApi.get('/affiliates/me/conversions', { params }),
  payouts: () => ecomApi.get('/affiliates/me/payouts'),
  requestPayout: (payload) => ecomApi.post('/affiliates/me/payouts/request', payload)
};

// URL publique COURTE d'un code affilié (SCL…) ou de campagne (LNK…).
// Le middleware Next redirige scalor.net/CODE vers le tracker /api/affiliate/r/.
export function affiliateSelfTrackingUrl(trackingCode) {
  const path = `/${encodeURIComponent(trackingCode || '')}`;
  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return `${window.location.origin}${path}`;
  }
  return `https://scalor.net${path}`;
}
