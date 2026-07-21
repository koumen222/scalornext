import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
import './styles/tailwind-base.css';
import './styles/shadcn-tokens.css'; // tokens shadcn/ui (palette Scalor) — variables CSS
import './styles/ecom.css';
import './styles/base.css';

// Métadonnées par défaut — reprises d'index.html (surchargées par generateMetadata en aval)
export const metadata: Metadata = {
  metadataBase: new URL('https://scalor.net'),
  title: 'Scalor — L\'IA au service de ton e-commerce en Afrique',
  description: 'Scalor génère ta boutique et tes contenus par IA, et pilote tout ton processus de vente e-commerce — commandes, WhatsApp, livraison — partout en Afrique.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [
      { url: '/icon.png' },
      { url: '/icon.png', sizes: '180x180' },
      { url: '/icon.png', sizes: '167x167' },
      { url: '/icon.png', sizes: '152x152' },
      { url: '/icon.png', sizes: '144x144' },
      { url: '/icon.png', sizes: '128x128' },
    ],
  },
  openGraph: {
    title: 'Scalor — L\'IA au service de ton e-commerce en Afrique',
    description: 'Scalor génère ta boutique et tes contenus par IA, et pilote tout ton processus de vente e-commerce — commandes, WhatsApp, livraison — partout en Afrique.',
    type: 'website',
    url: 'https://scalor.net/',
    siteName: 'Scalor',
    images: ['https://scalor.net/icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Scalor — L\'IA au service de ton e-commerce en Afrique',
    description: 'Scalor génère ta boutique et tes contenus par IA, et pilote tout ton processus de vente e-commerce — commandes, WhatsApp, livraison — partout en Afrique.',
    images: ['https://scalor.net/icon.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Scalor',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // Barre navigateur claire par défaut (l'app démarre en clair, quel que soit le système).
  themeColor: '#f9fafb',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning : des extensions navigateur (Grammarly, launchers…)
    // injectent des attributs sur <html> avant l'hydratation → faux positifs de mismatch.
    // Ne concerne que les attributs de cet élément, pas son contenu.
    <html lang="fr" suppressHydrationWarning>
      <body>
        {/* Thème clair/sombre — appliqué AVANT le paint (anti-flash).
            DÉFAUT = clair (blanc), même si le système est en sombre.
            Sombre UNIQUEMENT si l'utilisateur l'a explicitement choisi. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{document.documentElement.classList.toggle('dark',localStorage.getItem('theme')==='dark');}catch(e){}})();",
          }}
        />
        {/* Préconnexions + fonts — reprises d'index.html (React 19 hoiste ces balises dans <head>) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.scalor.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Syne:wght@400;500;600;700;800&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700,800&display=swap"
        />

        {children}

        {/* GTM — différé après load (comportement identique à index.html) */}
        <Script id="gtm-deferred" strategy="lazyOnload">
          {`window.dataLayer = window.dataLayer || [];
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T3KSKZLP');`}
        </Script>

        {/* Enregistrement du service worker (push) — même chemin /sw.js qu'avant */}
        <Script id="sw-register" strategy="lazyOnload">
          {`if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(function (err) {
    console.error('[SW] Échec de l\\'enregistrement:', err);
  });
}`}
        </Script>
      </body>
    </html>
  );
}
