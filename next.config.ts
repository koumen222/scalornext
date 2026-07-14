import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Le proxy des rewrites dev coupe les requêtes longues (~30s) : la génération
  // d'images IA peut durer 2-3 min — on aligne le timeout du proxy dessus.
  experimental: {
    proxyTimeout: 300_000,
  },
  // NEXT_USE_WASM_SWC=1 : force le binding SWC WASM (utile en CI/sandbox où le
  // binaire natif n'est pas utilisable). Sans effet en usage normal.
  ...(process.env.NEXT_USE_WASM_SWC === '1'
    ? { experimental: { cpus: 1, workerThreads: false, useWasmBinary: true, proxyTimeout: 300_000 } }
    : {}),
  // NEXT_SKIP_TYPECHECK=1 : saute le type-check pendant `next build` (sandbox CI
  // à fenêtre courte uniquement — `npx tsc --noEmit` est alors exécuté à part).
  // Ne JAMAIS activer pour un build de déploiement.
  ...(process.env.NEXT_SKIP_TYPECHECK === '1'
    ? { typescript: { ignoreBuildErrors: true } }
    : {}),
  // NEXT_SKIP_TRACING=1 : neutralise la collecte des traces de fichiers (sandbox CI
  // uniquement — les traces réelles sont indispensables au build OpenNext de déploiement).
  ...(process.env.NEXT_SKIP_TRACING === '1'
    ? { outputFileTracingExcludes: { '*': ['**/*'] } }
    : {}),
  // NEXT_SKIP_MINIFY=1 : désactive la minification (sandbox CI uniquement,
  // pour tenir dans la fenêtre d'exécution — jamais pour un build déployé).
  ...(process.env.NEXT_SKIP_MINIFY === '1'
    ? {
        webpack: (config: any) => {
          config.optimization = { ...config.optimization, minimize: false };
          return config;
        },
      }
    : {}),
  // Migration iso-fonctionnelle : on garde les <img> existants (pas de next/image imposé)
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BUILD_VERSION:
      process.env.NEXT_PUBLIC_BUILD_VERSION ||
      process.env.CF_PAGES_COMMIT_SHA ||
      process.env.WORKERS_CI_COMMIT_SHA ||
      String(Date.now()),
  },
  // Équivalent du proxy dev de vite.config.js : certains services legacy utilisent
  // une base RELATIVE « /api/ecom » en développement. On forwarde vers l'API
  // (NEXT_PUBLIC_API_URL) — en dev uniquement, la prod appelle l'API en direct.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    const raw =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:8080';
    let origin = 'http://localhost:8080';
    try {
      origin = new URL(raw).origin;
    } catch {
      /* valeur env malformée → fallback localhost */
    }
    return [{ source: '/api/:path*', destination: `${origin}/api/:path*` }];
  },
  async redirects() {
    return [
      // Scalor standalone → section Développeur (iso App.jsx)
      { source: '/scalor/login', destination: '/ecom/developer', permanent: false },
      { source: '/scalor/register', destination: '/ecom/developer', permanent: false },
      { source: '/scalor/dashboard', destination: '/ecom/developer', permanent: false },
      // Alias (iso App.jsx)
      { source: '/ecom/whatsapp/connexion', destination: '/ecom/whatsapp/service', permanent: false },
      { source: '/ecom/data', destination: '/ecom/dashboard', permanent: false },
      { source: '/ecom/stats/rapports', destination: '/ecom/reports', permanent: false },
    ];
  },
};

export default nextConfig;

// Intégration dev locale OpenNext Cloudflare (bindings en `next dev`)
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
