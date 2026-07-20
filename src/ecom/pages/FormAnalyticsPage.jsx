import React from 'react';
import { BarChart3 } from 'lucide-react';
import { tp } from '../i18n/platform.js';

const FormAnalyticsPage = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
    <div className="mb-6">
      <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        {tp('Analytique')}
      </h1>
      <p className="text-sm text-muted-foreground mt-1">{tp('Suivez les performances de vos formulaires et conversions')}</p>
    </div>
    <div className="bg-card rounded-xl border p-12 text-center">
      <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-muted-foreground font-medium">{tp('Bientôt disponible')}</p>
      <p className="text-xs text-muted-foreground mt-1">{tp('Cette fonctionnalité est en cours de développement')}</p>
    </div>
  </div>
);

export default FormAnalyticsPage;
