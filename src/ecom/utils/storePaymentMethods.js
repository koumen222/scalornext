import { publicStoreApi } from '../services/storeApi.js';

// Libellés des modes de paiement affichés au client dans les formulaires de commande.
export const PAYMENT_METHOD_META = {
  cod: { label: 'Paiement à la livraison', sub: 'Payez en espèces à la réception', icon: '💵' },
  scalor_pay: {
    label: 'Payer avec Scalor Pay',
    sub: 'Paiement en ligne sécurisé',
    icon: '⚡',
    // Badges opérateurs affichés sous l'option (couleurs des marques)
    badges: [
      { label: 'MTN MoMo', bg: '#FFCC00', color: '#111827' },
      { label: 'Orange Money', bg: '#FF7900', color: '#FFFFFF' },
      { label: 'Wave', bg: '#1DC8FF', color: '#0B3B57' },
      { label: 'Moov Money', bg: '#0079C1', color: '#FFFFFF' },
      { label: 'Visa', bg: '#1A1F71', color: '#FFFFFF' },
      { label: 'Mastercard', bg: '#EB001B', color: '#FFFFFF' },
    ],
  },
};

/**
 * Modes de paiement réellement activés par le marchand (issus du payload public
 * `store.paymentMethods`). COD activé par défaut pour les boutiques legacy où le
 * champ est absent. Renvoie toujours au moins un mode (['cod']).
 */
export function resolveAvailablePaymentMethods(store) {
  const pm = store?.paymentMethods || {};
  const list = [];
  if (pm.cod !== false) list.push('cod');
  if (pm.scalorPay === true) list.push('scalor_pay');
  return list.length ? list : ['cod'];
}

/**
 * Ouvre le paiement en ligne Scalor Pay pour une commande fraîchement créée et
 * redirige le client vers MoneyFusion.
 * @returns {Promise<boolean>} true si la redirection est enclenchée (le navigateur
 *   quitte la page), false s'il faut retomber sur le flux classique (confirmation).
 */
export async function startScalorPayRedirect(subdomain, orderData, { phone } = {}) {
  try {
    const res = await publicStoreApi.startScalorPayment(subdomain, {
      orderId: orderData?._id,
      orderNumber: orderData?.orderNumber,
      phone,
      returnUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    });
    if (res?.data?.paymentUrl && typeof window !== 'undefined') {
      window.location.href = res.data.paymentUrl;
      return true;
    }
  } catch {
    /* paiement en ligne indisponible → fallback confirmation classique */
  }
  return false;
}
