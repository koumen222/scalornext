import { useState, useEffect, useCallback } from 'react';
import { tp } from '../i18n/platform.js';
import { pushApi } from '../services/ecommApi';

/**
 * Convertit une clé base64 URL-safe en Uint8Array
 * Nécessaire pour l'API PushManager.subscribe()
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Hook pour gérer les notifications push natives
 * 
 * Gère :
 * - Demande de permission
 * - Abonnement push via VAPID
 * - Envoi de la subscription au backend
 * - État de l'abonnement
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [swRegistration, setSwRegistration] = useState(null);

  // Vérifier si les push notifications sont supportées
  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  // Initialiser : vérifier l'état actuel
  useEffect(() => {
    if (!isSupported) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        // Récupérer la permission actuelle
        setPermission(Notification.permission);

        // Récupérer le Service Worker
        const registration = await navigator.serviceWorker.ready;
        setSwRegistration(registration);

        // Vérifier si déjà abonné
        const existingSub = await registration.pushManager.getSubscription();
        if (existingSub) {
          setSubscription(existingSub);
          setIsSubscribed(true);
        }
      } catch (err) {
        console.error('❌ Erreur init push:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [isSupported]);

  // Demander la permission et s'abonner
  const subscribeToPush = useCallback(async () => {
    if (!isSupported || !swRegistration) {
      setError(tp('Push notifications non supportées sur cet appareil'));
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Demander la permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError(tp('Permission refusée. Activez les notifications dans les paramètres du navigateur.'));
        setLoading(false);
        return false;
      }

      // 2. Récupérer la clé VAPID depuis le backend
      let vapidPublicKey;
      try {
        const res = await pushApi.getVapidPublicKey();
        vapidPublicKey = res.data?.publicKey;
      } catch (e) {
        console.error('❌ Erreur récupération clé VAPID:', e);
        setError(tp('Impossible de récupérer la configuration push du serveur'));
        setLoading(false);
        return false;
      }

      if (!vapidPublicKey) {
        setError(tp('Clé VAPID non configurée sur le serveur'));
        setLoading(false);
        return false;
      }

      // 3. S'abonner via le PushManager du navigateur
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const pushSubscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });

      // 4. Envoyer la subscription au backend
      const subscriptionJSON = pushSubscription.toJSON();
      await pushApi.subscribe({
        endpoint: subscriptionJSON.endpoint,
        keys: subscriptionJSON.keys,
        userAgent: navigator.userAgent
      });

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      console.log('✅ Abonnement push activé');
      setLoading(false);
      return true;

    } catch (err) {
      console.error('❌ Erreur abonnement push:', err);
      setError(err.message || 'Erreur lors de l\'activation des notifications');
      setLoading(false);
      return false;
    }
  }, [isSupported, swRegistration]);

  // Se désabonner
  const unsubscribeFromPush = useCallback(async () => {
    if (!subscription) return false;

    setLoading(true);
    setError(null);

    try {
      // Désabonner côté navigateur
      await subscription.unsubscribe();

      // Désabonner côté backend
      try {
        await pushApi.unsubscribe({ endpoint: subscription.endpoint });
      } catch (e) {
        console.warn('⚠️ Erreur désabonnement serveur:', e);
      }

      setSubscription(null);
      setIsSubscribed(false);
      console.log('📴 Notifications push désactivées');
      setLoading(false);
      return true;

    } catch (err) {
      console.error('❌ Erreur désabonnement push:', err);
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [subscription]);

  // Envoyer une notification de test
  const sendTestNotification = useCallback(async () => {
    try {
      await pushApi.sendTest();
      return true;
    } catch (err) {
      console.error('❌ Erreur notification test:', err);
      return false;
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestNotification
  };
}

export default usePushNotifications;
