# MIGRATION_LOG — Scalor React SPA → Next.js (App Router)

Migration iso-fonctionnelle du frontend `ecomcookpit/` (Vite + React 18 + React Router 6) vers `scalor-next/` (Next.js 15, App Router, TypeScript). Le backend Express (`api.scalor.net`) n'est **pas** modifié — Next consomme l'API existante à l'identique.

## Décisions validées (02/07/2026)

| Sujet | Décision |
|---|---|
| Version | Next.js 15 + React 19 (l'adaptateur Cloudflare a abandonné Next 14 en Q1 2026) |
| Langage | **TypeScript strict** (demande du 02/07) pour tout le nouveau code (configs, middleware, app/, lib/) ; le code SPA copié (`src/`) reste en JS via `allowJs` — typage progressif en amélioration future. `tsconfig.include` limité aux `.ts/.tsx` (les `.jsx` importés sont quand même vérifiés ; les pages legacy pas encore branchées ne sont pas parsées) |
| Déploiement | Cloudflare **Workers** via `@opennextjs/cloudflare` (next-on-pages déprécié) |
| Service worker | **Push seulement** — cache offline retiré, handlers push repris tels quels |
| Auth | Token localStorage conservé tel quel ; cookies httpOnly = amélioration future |
| Multi-tenant | Middleware Next lit le header `Host` → rewrite `/sites/[subdomain]/...` (interne) ; `/store/[subdomain]/...` reste l'accès par chemin (previews/dev) |

## État d'avancement

### ✅ Phase 0 — Audit (terminé)
- ~150 routes cartographiées depuis `src/ecom/App.jsx` (classification : voir plan présenté le 02/07/2026)
- Auth : `ecomToken` / `ecomUser` / `ecomWorkspace` en localStorage, guards par rôle
- WebSockets : `useSocket.js`, `useDmUnread.js`, `useThemeSocket.js`, TeamChat, StoreProductPage → `api.scalor.net`, auth par token
- 224 usages localStorage, 80 sessionStorage, 119 fichiers touchant `window`/`document`
- Deps exclues du frontend Next : `sharp`, `ffmpeg-static`, `@anthropic-ai/claude-code` (outils backend/scripts)

### ✅ Phase 1 — Setup (terminé)
- [x] Scaffold Next 15 App Router en JS (`app/`, `jsconfig.json` alias `@/`)
- [x] Tailwind 3.4 : config reprise à l'identique (seul `content` change) + CSS globaux copiés (`tailwind-base.css`, `ecom.css` = ex-`index.css`, `base.css` = ex-styles inline d'index.html)
- [x] Env : mapping `VITE_*` → `NEXT_PUBLIC_*` (voir `.env.example`)
- [x] OpenNext Cloudflare : `wrangler.jsonc`, `open-next.config.ts`, `.dev.vars`, `public/_headers`, scripts `preview`/`deploy`
- [x] `public/` copié (icônes, img, manifest, pages HTML statiques) — sauf SW/`_headers`/`_redirects`
- [x] `public/sw.js` réécrit : push/notificationclick/notificationclose repris, cache offline retiré, purge des anciens caches Vite à l'activation
- [x] Layout racine : metadata + viewport (iso index.html), fonts Satoshi/Inter/Syne, GTM différé, enregistrement SW (même chemin `/sw.js`)
- [x] `app/page.jsx` : RootRedirect iso (rôle → dashboard, sinon /ecom/landing)
- [x] Redirections statiques dans `next.config.mjs` : `/scalor/*`, `/ecom/whatsapp/connexion`, `/ecom/data`, `/ecom/stats/rapports`
- [x] `npm install` + `npm run build` vert (validé le 02/07 — note : en sandbox/CI sans binaire SWC natif, builder avec `NEXT_USE_WASM_SWC=1`)

### ✅ Phase 2a — Storefront multi-tenant (SSR + ISR) — terminé le 02/07
- [x] `middleware.ts` : Host → rewrite interne `/sites/{sub}/...` (sous-domaines *.scalor.net + domaines custom via `resolve-domain`, cache 10 min) ; accès direct `/sites` bloqué (404)
- [x] Deux arbres de routes partageant les mêmes fabriques (`lib/storefront/routes.tsx`) :
  - `app/sites/[subdomain]/` = accès par domaine (hostMode) — **piège évité : `_sites` avec underscore = dossier privé App Router, aucune route générée**
  - `app/store/[subdomain]/` = accès par chemin (previews iframe & dev, iso SPA)
  - 7 routes chacun : `/`, `/products`, `/products/[slug]` (+ alias `/product`, `/produit`), `/legal/[pageType]`, `/checkout`, catch-all → accueil
- [x] `generateMetadata` boutique + produit (title, description, OG/Twitter, image produit) — règles iso `Backend/routes/publicStorefront.js`
- [x] ISR `revalidate: 60` sur les fetchs serveur (`lib/storefront/api.ts`, passe-plat sans logique métier)
- [x] Frontière server/client : barrel `lib/storefront/clients.tsx` (`'use client'` + types d'interop des composants legacy)
- [x] Guard SSR : `prodLogger.js` (sessionStorage/navigator à l'échelle module) — même pattern que useEcomAuth
- [x] Validé en local (build prod + `next start`) : Host boutique → 200 SSR (35 Ko HTML), `/store/demo` → 200, produit → 200, `/sites` direct → 404, plateforme → 200, 0 erreur serveur
- [ ] À valider au déploiement (API joignable) : metadata réelles par boutique/produit (en sandbox l'API est injoignable → fallback plateforme, comportement prévu)

### ✅ Phase 2b — Pages publiques SaaS + SEO — terminé le 02/07
- [x] `app/(platform)/` : groupe de routes SaaS avec layout providers iso EcomApp (`lib/platform/providers.tsx` : ErrorBoundary > Auth > Currency > Theme > PlanGate + PageViewTracker + VersionWatcher). PlatformPageMeta non porté : titres/OG via exports `metadata` Next (`lib/platform/meta.ts`)
- [x] Pages **statiques** (prerender build, HTML complet — vérifié : landing 155 Ko SSR avec h1) : landing, why-scalor, tarifs, privacy, terms, provider (+ `/ecom/provider`)
- [x] Pages publiques sans SEO (Suspense — useSearchParams) : formation, login, register, forgot/reset-password, setup-admin, workspace-setup, invite/[token], affiliate login/register
- [x] `/ecom` → RootRedirect ; catch-all plateforme (`not-found.tsx`) → `/ecom/login` (iso SPA)
- [x] SEO : `app/robots.ts` + `app/sitemap.ts` (plateforme) ; **par boutique** : `/sitemap.xml` et `/robots.txt` réécrits par le middleware vers `app/sites/[subdomain]/…/route.ts` (URLs absolues depuis le Host — sous-domaine ou domaine custom ; produits via cache ISR 60s)
- [x] Guards SSR : `LandingPage.jsx` (SupportChat sessionId), `providerApi.js` (providerStorage)
- [x] Build vert (40 routes) + validations curl : titres par page ✓, robots/sitemap plateforme ✓, robots/sitemap boutique via Host ✓
- Note : en sandbox l'API est injoignable → le sitemap boutique ne liste que home/products ; les URLs produits s'ajouteront automatiquement en prod

### ✅ Phase 3 — Dashboard privé (113 routes, "use client") — terminé le 02/07
- [x] Structure : `app/(platform)/ecom/(dash)/` (93 pages sous EcomLayout **persistant** entre navigations, iso StableLayout) ; `app/(platform)/ecom/boutique/` (33 pages : layout racine Protected(ecom_admin)+StoreProvider, sous-groupe `(chrome)` RequireStore+BoutiqueLayout keyé) ; billing ×3 et portail affilié ×4 hors chrome (iso SPA)
- [x] Guards portés 1:1 (`lib/dashboard/guards.tsx`) : Protected/RequireRole (auth+rôle+Rita), RequireStore (redirect wizard + state `from`), DashboardRedirect. Nuance assumée : décision en useEffect → bref loader au lieu du <Navigate> immédiat (pas de mismatch d'hydratation)
- [x] Rôles par route repris d'App.jsx dans chaque wrapper (`RequireRole requiredRole={...}`)
- [x] `PlatformPageMeta` porté (PLATFORM_TITLE_RULES complet + matchPath) — titres du dashboard iso SPA à chaque navigation
- [x] `BoutiqueLayout`/`StoreProvider` : `<Outlet/>` → `children` (App Router)
- [x] `react-quill` → **react-quill-new@3.8.3** (React 19) + `MarketingCompose` en `next/dynamic ssr:false` (Quill touche `document` à l'import)
- [x] `react-dnd` **non installé** : PageBuilder/PageBuilderFixed/EnhancedVisualBuilder sont du code mort (aucun import, aucune route) — décision : ne pas les porter
- [x] Guards SSR au rendu : TeamChat, ChatWidget, BillingPage, GenerationSuccess, ProductPageGeneratorModal
- [x] Build vert : **170 routes** (136 statiques + dynamiques), `tsc --noEmit` OK, smoke tests 200 sur login/dashboard/products/orders/boutique/super-admin/livreur/billing/affilié, 404+redirect login sur route inconnue, 0 erreur serveur

### ✅ Phase 4 — Auth / redirections — couvert par la Phase 3
- Auth localStorage conservée telle quelle (`ecomToken`/`ecomUser`/`ecomWorkspace`), contexte EcomAuthProvider monté sur tout (platform)
- Login/logout : navigations via router-compat (`useNavigate` → router.push/replace) — inchangées dans les pages
- Portail affilié : token séparé géré par les pages elles-mêmes (iso SPA, aucune route protégée côté App.jsx)

### ⏳ Phase 5 — Validation finale (build complet, checklist routes vs audit, WebSocket, Lighthouse, doc déploiement)

## Points de vigilance

1. **Accès browser à l'échelle du module** : `useEcomAuth.jsx` lit localStorage à l'import, `useSocket.js` résout l'URL socket à l'import → à guarder (sinon crash au prerender du build).
2. **Location state React Router** (`Navigate state={{from}}`) : pas d'équivalent `next/navigation` → géré dans le shim (sessionStorage).
3. **`Outlet`** (BoutiqueLayout, StoreProvider en route-element) → layouts imbriqués App Router (children).
4. **ISR durable** : nécessite le bucket R2 (`NEXT_INC_CACHE_R2_BUCKET`) — commenté dans `wrangler.jsonc`, à activer au déploiement. Sans R2 : SSR à chaque miss, pas d'erreur.
5. **VersionWatcher** : `__BUILD_VERSION__` → `NEXT_PUBLIC_BUILD_VERSION` (injecté dans `next.config.ts`).
6. **Fonts** : chargées en stylesheets bloquants (l'astuce `media="print"` de Vite n'est pas transposable proprement) — impact perf mineur, SEO non affecté.
7. **`engine.io-client` / `@socket.io/component-emitter`** : retirés du package.json (dépendances transitives de socket.io-client).

## Améliorations futures recommandées (hors périmètre)

- Auth cookies httpOnly (supprime le flash de redirection client + activerait le SSR des pages privées)
- Réactivation d'un cache offline SW adapté aux assets Next
- `next/image` sur le storefront (CLS/LCP)
- ISR avancé : `revalidateTag` par boutique lors des updates produits (webhook API → route handler)
- Typage progressif de `src/` (legacy JS sous `allowJs` ; nouveau code déjà en TS strict)

## Notes build (sandbox Cowork)

- Builder dans le clone local rapide `/sessions/<vm>/tmp/nb/` (le montage est lent) puis rsync vers le projet ; `npm install` sur le montage se corrompt (ENOTEMPTY) → installer dans le clone.
- `next build` complet (typecheck inclus) ≈ 25-40 s une fois le cache chaud ; `NEXT_USE_WASM_SWC=1` inutile ici (binaire SWC natif arm64 fonctionnel).
