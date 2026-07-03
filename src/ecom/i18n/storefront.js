/**
 * i18n du chrome storefront — fr (défaut) / en / es.
 * La langue vient du réglage marchand `storeSettings.language` (Paramètres boutique),
 * exposé par l'API publique dans `store.language` (cf. BACKEND_PATCH_I18N.md).
 *
 * Ne concerne QUE les chaînes en dur du storefront (boutons, totaux, erreurs…).
 * Les textes saisis par le marchand (labels de champs, contenus produits) restent tels quels.
 *
 * Usage : const t = getStorefrontT(store?.language);  t('cta.orderNow')  t('phone.invalid', { n: 9, code: '+237' })
 */

export const STOREFRONT_LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
];

const MESSAGES = {
  fr: {
    'offer.chooseYours': 'Choisissez votre offre',
    'quantity': 'Quantité',
    'form.fillBelowCod': 'Remplissez le formulaire ci-dessous — paiement à la livraison.',
    'cta.orderNow': 'Commander maintenant',
    'cta.buyNow': 'ACHETER MAINTENANT - {total}',
    'cta.processing': 'Traitement…',
    'success.thanks': 'Merci {name} !',
    'success.recorded': 'Votre commande a été enregistrée avec succès.',
    'success.reference': 'Référence',
    'success.product': 'Produit',
    'success.total': 'Total',
    'success.status': 'Statut',
    'success.pendingConfirmation': 'En attente de confirmation',
    'success.orderAgain': 'Commander à nouveau',
    'error.phoneInvalid': 'Numéro invalide — {n} chiffres requis pour {code}',
    'error.emailInvalid': 'Adresse e-mail invalide',
    'error.orderFailed': 'Erreur lors de la commande. Réessayez.',
    'shipping.codTitle': 'Paiement à la livraison',
    'shipping.payOnReceipt': 'vous payez à la réception',
    'shipping.free': 'Livraison gratuite 🎉',
    'shipping.fee': 'Frais de livraison',
    'shipping.remainingForFree': '+ {amount} pour la livraison gratuite',
    'urgency.lowStock': 'Stock presque épuisé. La promotion se termine bientôt.',
    'customer.fallback': 'Client',
    'success.confirmWhatsappHint': 'Confirmez-la sur WhatsApp pour accélérer le traitement.',
    'success.confirmOnWhatsapp': 'Confirmer sur WhatsApp',
  },
  en: {
    'offer.chooseYours': 'Choose your offer',
    'quantity': 'Quantity',
    'form.fillBelowCod': 'Fill in the form below — cash on delivery.',
    'cta.orderNow': 'Order now',
    'cta.buyNow': 'BUY NOW - {total}',
    'cta.processing': 'Processing…',
    'success.thanks': 'Thank you {name}!',
    'success.recorded': 'Your order has been placed successfully.',
    'success.reference': 'Reference',
    'success.product': 'Product',
    'success.total': 'Total',
    'success.status': 'Status',
    'success.pendingConfirmation': 'Awaiting confirmation',
    'success.orderAgain': 'Order again',
    'error.phoneInvalid': 'Invalid number — {n} digits required for {code}',
    'error.emailInvalid': 'Invalid email address',
    'error.orderFailed': 'Something went wrong with your order. Please try again.',
    'shipping.codTitle': 'Cash on delivery',
    'shipping.payOnReceipt': 'you pay upon receipt',
    'shipping.free': 'Free delivery 🎉',
    'shipping.fee': 'Delivery fee',
    'shipping.remainingForFree': '+ {amount} to get free delivery',
    'urgency.lowStock': 'Stock is almost gone. The promotion ends soon.',
    'customer.fallback': 'Customer',
    'success.confirmWhatsappHint': 'Confirm it on WhatsApp to speed up processing.',
    'success.confirmOnWhatsapp': 'Confirm on WhatsApp',
  },
  es: {
    'offer.chooseYours': 'Elige tu oferta',
    'quantity': 'Cantidad',
    'form.fillBelowCod': 'Rellena el formulario — pago contra entrega.',
    'cta.orderNow': 'Pedir ahora',
    'cta.buyNow': 'COMPRAR AHORA - {total}',
    'cta.processing': 'Procesando…',
    'success.thanks': '¡Gracias {name}!',
    'success.recorded': 'Tu pedido se ha registrado correctamente.',
    'success.reference': 'Referencia',
    'success.product': 'Producto',
    'success.total': 'Total',
    'success.status': 'Estado',
    'success.pendingConfirmation': 'Pendiente de confirmación',
    'success.orderAgain': 'Pedir de nuevo',
    'error.phoneInvalid': 'Número inválido — se requieren {n} dígitos para {code}',
    'error.emailInvalid': 'Correo electrónico inválido',
    'error.orderFailed': 'Hubo un error con tu pedido. Inténtalo de nuevo.',
    'shipping.codTitle': 'Pago contra entrega',
    'shipping.payOnReceipt': 'pagas al recibir',
    'shipping.free': 'Envío gratis 🎉',
    'shipping.fee': 'Gastos de envío',
    'shipping.remainingForFree': '+ {amount} para el envío gratis',
    'urgency.lowStock': 'Quedan pocas unidades. La promoción termina pronto.',
    'customer.fallback': 'Cliente',
    'success.confirmWhatsappHint': 'Confírmalo por WhatsApp para acelerar el procesamiento.',
    'success.confirmOnWhatsapp': 'Confirmar por WhatsApp',
  },
};

export function normalizeStoreLanguage(value) {
  const raw = String(value || '').trim().toLowerCase().slice(0, 2);
  return MESSAGES[raw] ? raw : 'fr';
}

/** t(key, vars) — repli : fr, puis la clé elle-même (jamais de crash sur clé manquante). */
export function getStorefrontT(language) {
  const lang = normalizeStoreLanguage(language);
  const dict = MESSAGES[lang];
  return function t(key, vars) {
    let msg = dict[key] ?? MESSAGES.fr[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        msg = msg.replaceAll(`{${k}}`, String(v));
      });
    }
    return msg;
  };
}
