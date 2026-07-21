import { useEffect, useState } from 'react';
import { Check, X, ArrowRight, Package, Bot, Zap, Sparkles } from 'lucide-react';
import { getPublicPlans } from '../services/billingApi.js';
import { useNavigate } from '@/lib/router-compat';
import { tp } from '../i18n/platform.js';

/**
 * UpgradeWall — mur d'upgrade affiché quand une fonctionnalité dépasse le plan
 * courant. Les VRAIS plans (mêmes tiers/prix que BillingPage) : Scalor / Scalor + IA /
 * Scalor IA Pro. Prix statiques par défaut, écrasés à chaud par /billing/plans/public
 * (promo incluse). Le clic déclenche le checkout mensuel via /ecom/billing.
 * Design plat, sobre, aux couleurs Scalor. Pas d'essai gratuit.
 */

const PLANS = [
  {
    tier: 'starter',
    checkoutId: 'starter_1',
    name: 'Scalor',
    tagline: 'Gestion complète de vos commandes',
    price: 6900,
    icon: Package,
    features: [
      'Commandes illimitées',
      'Gestion clients complète',
      'Catalogue produits illimité',
      'Boutique en ligne personnalisée',
    ],
  },
  {
    tier: 'pro',
    checkoutId: 'pro_1',
    name: 'Scalor + IA',
    tagline: 'Vendez automatiquement sur WhatsApp',
    price: 14900,
    icon: Bot,
    badge: 'Populaire',
    highlight: true,
    features: [
      'Tout Scalor inclus',
      '1 agent IA commercial WhatsApp',
      'Réponses automatiques 24h/7j',
      '10 crédits page produit IA / mois',
    ],
  },
  {
    tier: 'ultra',
    checkoutId: 'ultra_1',
    name: 'Scalor IA Pro',
    tagline: 'La puissance maximale pour scaler',
    price: 29899,
    icon: Zap,
    features: [
      'Tout Scalor + IA inclus',
      '5 agents IA simultanés',
      'Messages illimités',
      '20 crédits page produit IA / mois',
    ],
  },
];

const formatAmount = (n) => new Intl.NumberFormat('fr-FR').format(n);

export default function UpgradeWall({ onDismiss }) {
  const navigate = useNavigate();
  const [prices, setPrices] = useState({});

  // Prix réels depuis la DB (promo appliquée) — fallback sur les prix statiques.
  useEffect(() => {
    let alive = true;
    getPublicPlans()
      .then((res) => {
        if (!alive || !res?.success || !Array.isArray(res.plans)) return;
        const map = {};
        res.plans.forEach((p) => {
          const monthly = p.effectivePrice ?? p.priceRegular;
          if (p.key && typeof monthly === 'number') map[p.key] = monthly;
        });
        setPrices(map);
      })
      .catch(() => { /* silencieux : on garde les prix statiques */ });
    return () => { alive = false; };
  }, []);

  const handleUpgrade = (checkoutId) => {
    navigate('/ecom/billing', { state: { selectedPlan: checkoutId } });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label={tp('Fermer')}
            className="absolute top-4 right-4 z-10 p-2 text-muted-foreground hover:text-foreground rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* En-tête sobre */}
        <div className="px-6 pt-8 pb-6 text-center sm:px-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-scalor-green/10 px-3 py-1 text-xs font-semibold text-scalor-green">
            <Sparkles className="h-3.5 w-3.5" />
            {tp('Passez à la vitesse supérieure')}
          </span>
          <h2 className="mt-3 text-2xl font-extrabold text-foreground">{tp('Choisissez votre plan Scalor')}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {tp('Gérez vos commandes, vendez sur WhatsApp et générez vos pages produit IA.')}
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-4 px-6 pb-8 sm:grid-cols-3 sm:px-10">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = prices[plan.tier] ?? plan.price;
            const highlighted = plan.highlight;
            return (
              <div
                key={plan.tier}
                className={`relative flex flex-col rounded-2xl bg-card p-5 ${
                  highlighted
                    ? 'border-2 border-scalor-green shadow-lg shadow-scalor-green/10'
                    : 'border border-border'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-scalor-green px-3 py-1 text-[11px] font-bold text-white">
                    {tp(plan.badge)}
                  </span>
                )}

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    highlighted ? 'bg-scalor-green/10 text-scalor-green' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <p className="mt-3 text-base font-bold text-foreground">{plan.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{tp(plan.tagline)}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">{formatAmount(price)}</span>
                  <span className="text-sm font-medium text-muted-foreground">{tp('FCFA/mois')}</span>
                </div>

                <ul className="mt-4 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px] text-foreground/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-scalor-green" />
                      <span>{tp(f)}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.checkoutId)}
                  className={`mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    highlighted
                      ? 'bg-scalor-green text-white hover:bg-scalor-green-dark'
                      : 'border border-scalor-green text-scalor-green hover:bg-scalor-green/5'
                  }`}
                >
                  {tp('Choisir')} {plan.name}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
