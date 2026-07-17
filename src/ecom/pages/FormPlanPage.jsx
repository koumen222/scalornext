import React from 'react';
import { CreditCard } from 'lucide-react';
import { tp } from '../i18n/platform.js';

const FormPlanPage = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <div className="mb-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        {tp('Forfait')}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{tp('Gérez votre abonnement et votre forfait EasySell')}</p>
    </div>
    <div className="bg-card rounded-xl border p-12 text-center">
      <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground font-medium">{tp('Bientôt disponible')}</p>
      <p className="text-xs text-muted-foreground mt-1">{tp('Cette fonctionnalité est en cours de développement')}</p>
    </div>
  </div>
);

export default FormPlanPage;
