/**
 * Service Worker Scalor — version "push seulement" (migration Next.js).
 * Le cache offline de l'ancien SW a été retiré : le precache Vite ne correspond
 * plus aux assets Next, et Next gère son propre versioning de chunks.
 * Les handlers push / notificationclick / notificationclose sont repris
 * de l'ancien public/sw.js (comportement identique).
 */

// Prendre le contrôle immédiatement et purger les anciens caches Vite
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// ============================================
// NOTIFICATIONS PUSH
// ============================================

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Notification push reçue');

  let notificationData = {
    title: 'Ecom Cockpit',
    body: 'Vous avez reçu une nouvelle notification',
    icon: '/ecom-logo (1).png',
    badge: '/icons/icon-72x72.png',
    tag: 'default',
    data: {
      url: '/',
      timestamp: Date.now()
    }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        image: data.image,
        tag: data.tag || notificationData.tag,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
        actions: data.actions,
        data: {
          url: data.data?.url || data.url || '/',
          ...data.data,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      console.error('[Service Worker] Erreur lors du parsing des données:', error);
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    image: notificationData.image,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    silent: notificationData.silent,
    data: notificationData.data,
    vibrate: [200, 100, 200],
    actions: notificationData.actions?.length ? notificationData.actions : [
      { action: 'view', title: 'Voir la commande' },
      { action: 'dismiss', title: 'Ignorer' }
    ],
    timestamp: notificationData.data.timestamp
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
      .then(() => {
        console.log('[Service Worker] Notification affichée:', notificationData.title);
        // Relayer au client pour mise à jour du badge et toast in-app
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clients) => {
        if (clients && clients.length > 0) {
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_RECEIVED',
              payload: notificationData
            });
          });
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Erreur lors de l\'affichage de la notification:', error);
      })
  );
});

// ============================================
// CLIC SUR UNE NOTIFICATION
// ============================================

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Clic sur la notification:', event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'dismiss' || event.action === 'close') {
    console.log('[Service Worker] Notification ignorée');
    return;
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            if (urlToOpen !== '/') {
              return client.navigate(urlToOpen);
            }
          });
        }
      }

      if (clients.openWindow) {
        const fullUrl = new URL(urlToOpen, self.location.origin).href;
        console.log('[Service Worker] Ouverture d\'une nouvelle fenêtre:', fullUrl);
        return clients.openWindow(fullUrl);
      }
    }).catch((error) => {
      console.error('[Service Worker] Erreur lors de l\'ouverture de la fenêtre:', error);
    })
  );
});

// ============================================
// FERMETURE D'UNE NOTIFICATION
// ============================================

self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification fermée:', event.notification.tag);
});
