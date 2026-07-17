import React from 'react';
import { Link } from '@/lib/router-compat';
import { tp } from '../i18n/platform.js';

const WhatsAppEnSavoirPlus = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-primary-50 to-teal-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/ecom/campaigns" className="inline-flex items-center text-green-600 hover:text-green-700 mb-4">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {tp('Retour au Marketing')}
          </Link>

          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">{tp('WhatsApp Pro pour votre Business')}</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {tp('Transformez votre communication client avec votre propre numéro WhatsApp')}
          </p>
        </div>

        {/* Hero Section */}
        <div className="bg-card rounded-2xl shadow-xl p-8 mb-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">
                📱 Actuellement vs WhatsApp Pro
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{tp('Messages envoyés avec NOTRE numéro')}</p>
                    <p className="text-sm text-muted-foreground">{tp('Les clients voient un numéro inconnu → Moins de confiance')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{tp('Messages envoyés avec VOTRE numéro')}</p>
                    <p className="text-sm text-muted-foreground">{tp('Les clients reconnaissent votre numéro → Plus de réponses')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-primary-50 rounded-xl p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">+40%</div>
                <div className="text-sm text-muted-foreground">{tp('Taux de réponse moyen')}</div>
                <div className="text-3xl font-bold text-green-600 mb-2 mt-4">+25%</div>
                <div className="text-sm text-muted-foreground">{tp('Taux de conversion')}</div>
                <div className="text-3xl font-bold text-green-600 mb-2 mt-4">+60%</div>
                <div className="text-sm text-muted-foreground">{tp('Confiance client')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bénéfices */}
        <div className="bg-card rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            🚀 Pourquoi utiliser votre propre numéro ?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{tp('Confiance accrue')}</h3>
              <p className="text-sm text-muted-foreground">
                Vos clients reconnaissent votre numéro et sont plus enclins ù  répondre et ù  faire confiance ù  vos messages.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{tp('Réponse rapide')}</h3>
              <p className="text-sm text-muted-foreground">
                Les clients répondent plus rapidement aux messages provenant d'un numéro qu'ils connaissent déjù .
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">{tp('Image professionnelle')}</h3>
              <p className="text-sm text-muted-foreground">
                Renforcez votre image de marque en utilisant un numéro professionnel associé ù  votre entreprise.
              </p>
            </div>
          </div>
        </div>

        {/* Comment ça marche */}
        <div className="bg-card rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            🛠️ Comment ça marche ?
          </h2>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{tp('Postulez pour WhatsApp Pro')}</h3>
                <p className="text-sm text-muted-foreground">
                  Remplissez le formulaire de postulation avec vos informations et votre numéro WhatsApp personnel.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{tp('Validation technique')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tp('Notre équipe technique configure votre numéro et réalise les tests nécessaires (24-48h).')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{tp('Activation')}</h3>
                <p className="text-sm text-muted-foreground">
                  {tp('Une fois activé, toutes vos campagnes sont automat votre numéro personnel automatiquement.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="bg-card rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            â“ Questions fréquentes
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-2">{tp('Est-ce que mon numéro personnel reste privé ?')}</h3>
              <p className="text-sm text-muted-foreground">
                Oui, votre numéro n'est utilisé que pour l'envoi de vos campagnes marketing. Les clients peuvent vous répondre mais vos informations personnelles restent protégées.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">{tp('Puis-je toujours utiliser mon numéro personnel ?')}</h3>
              <p className="text-sm text-muted-foreground">
                Absolument ! La configuration ne perturbe pas votre usage personnel du numéro. Vous pouvez continuer ù  l'utiliser normalement.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">{tp('Y a-t-il des limites d\'envoi ?')}</h3>
              <p className="text-sm text-muted-foreground">
                Oui, pour éviter le spam, nous appliquons les mêmes limites que pour le numéro partagé : 1 message toutes les 30 secondes avec une pause de 5 minutes après 10 envois.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2">{tp('Que se passe-t-il si je change de numéro ?')}</h3>
              <p className="text-sm text-muted-foreground">
                Pas de problème ! Il suffit de faire une nouvelle postulation et nous reconfigurerons le système avec votre nouveau numéro.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-green-600 to-primary-600 rounded-2xl shadow-xl p-8 text-white text-center">
          <h2 className="text-xl sm:text-3xl font-bold mb-4">{tp('Prêt ù  transformer votre communication ?')}</h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Rejoignez les entreprises qui utilisent déjù  WhatsApp Pro pour améliorer leur relation client et augmenter leurs ventes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/ecom/whatsapp-postulation"
              className="px-8 py-3 bg-card text-green-600 font-bold rounded-lg hover:bg-muted transition shadow-lg"
            >
              📝 Postuler maintenant
            </Link>
            <Link
              to="/ecom/campaigns"
              className="px-8 py-3 bg-card/20 text-white font-semibold rounded-lg hover:bg-card/30 transition border border-white/30"
            >
              {tp('Retour au Marketing')}
            </Link>
          </div>
        </div>

        {/* Contact */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>{tp('📞 Besoin d\'aide ? Contactez notre équipe')}</p>
          <p className="mt-1">{tp('⏰ Délai de traitement : 24-48h')}</p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppEnSavoirPlus;
