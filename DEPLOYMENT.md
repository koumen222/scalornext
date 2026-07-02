# Déploiement — scalor-next sur Cloudflare Workers (OpenNext)

> Voie officielle 2026 : `@opennextjs/cloudflare` sur **Workers**. `@cloudflare/next-on-pages` (Pages) est déprécié et ne supporte pas l'ISR utilisé par le storefront.

## 1. Prérequis

- Node ≥ 18, compte Cloudflare avec la zone `scalor.net`
- `npm install` à la racine de `scalor-next/`
- Wrangler authentifié : `npx wrangler login`

## 2. Build & vérifications locales

```bash
npm run build        # next build complet (type-check inclus) — doit passer sans erreur
npm run preview      # build OpenNext + preview dans le runtime Workers local
```

Vérifier en preview : landing (`/ecom/landing`), login, une boutique via Host
(`curl -H "Host: <sub>.scalor.net" http://localhost:8787/`), `/sitemap.xml`, `/robots.txt`.

## 3. Cache ISR durable (R2) — requis pour le storefront

Le storefront (boutiques/produits) utilise l'ISR (`revalidate: 60`). Sans R2 : chaque miss
retombe en SSR (fonctionnel mais plus de latence et plus d'appels à l'API Express).

```bash
npx wrangler r2 bucket create scalor-next-cache
```

Puis dans `wrangler.jsonc`, décommenter :

```jsonc
"r2_buckets": [
  { "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "scalor-next-cache" }
]
```

`open-next.config.ts` référence déjà le cache R2 (`r2IncrementalCache`).

## 4. Variables d'environnement

Build-time (CI ou `.env` local au moment du build) — voir `.env.example` :

| Variable | Valeur prod |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.scalor.net` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.scalor.net` |
| `NEXT_PUBLIC_STORE_API_URL` | (vide — retombe sur API_URL) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | id OAuth Google (Login) |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_POSTHOG_HOST` | analytics |
| `NEXT_PUBLIC_BUILD_VERSION` | sha du commit (VersionWatcher) |

⚠️ Ne JAMAIS utiliser les flags sandbox (`NEXT_SKIP_TYPECHECK`, `NEXT_SKIP_TRACING`,
`NEXT_SKIP_MINIFY`, `NEXT_USE_WASM_SWC`) pour un build déployé.

## 5. Déploiement

```bash
npm run deploy       # opennextjs-cloudflare build && deploy
```

## 6. Domaines

1. **Plateforme** : router `scalor.net` et `www.scalor.net` vers le Worker
   (Workers → Settings → Domains & Routes → Custom Domain `scalor.net`).
2. **Sous-domaines boutiques** : route wildcard `*.scalor.net/*` → même Worker
   (le middleware lit le Host et réécrit vers `/sites/{sub}/…`). Laisser `api.scalor.net`
   pointer vers le VPS Express (le middleware l'ignore : sous-domaine `api` exclu).
3. **Domaines custom marchands** : conserver le mécanisme actuel (DNS/proxy Caddy) en
   changeant la cible : l'origin frontend devient le Worker au lieu de Cloudflare Pages.
   La résolution logique ne change pas (`/api/store/resolve-domain/:hostname`, cache 10 min
   dans le middleware). Pour une gestion 100 % Cloudflare, envisager Cloudflare for SaaS
   (Custom Hostnames) — amélioration future.

## 7. Après le premier déploiement

- Login + navigation entre workspaces, création de commande, notifications temps réel
  (WebSocket vers `api.scalor.net` — inchangé), déconnexion
- `curl https://<boutique>.scalor.net/` : HTML complet + `<title>` boutique (metadata réelles
  maintenant que l'API est joignable), `curl https://<boutique>.scalor.net/sitemap.xml` : URLs produits
- Web push : vérifier l'enregistrement de `/sw.js` (DevTools → Application) et un push de test
  (le SW ne fait plus de cache offline — décision validée)
- Lighthouse sur `/ecom/landing` et une page boutique : **SEO > 90 attendu** (title/description/OG/
  robots/sitemap/H1 rendus serveur — vérifiés par curl en local, à confirmer en prod)

## 8. CI (optionnel)

Connecter le repo à Workers Builds (Cloudflare) : build command `npx opennextjs-cloudflare build`,
deploy command `npx opennextjs-cloudflare deploy`, variables du §4 dans les settings du projet.
