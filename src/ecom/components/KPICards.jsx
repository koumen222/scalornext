import React from 'react';
import { tp } from '../i18n/platform.js';

const KPICards = ({ stats, fmt }) => {
  const deliveryRate = stats.total ? ((stats.delivered || 0) / stats.total * 100).toFixed(1) : 0;
  const returnRate = stats.total ? ((stats.returned || 0) / stats.total * 100).toFixed(1) : 0;

  const kpis = [
    {
      title: 'Revenu livré',
      value: fmt(stats.totalRevenue),
      subtitle: `${stats.delivered || 0} commandes livrées`,
      color: 'green',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )
    },
    {
      title: 'Taux livraison',
      value: `${deliveryRate}%`,
      subtitle: 'Performance globale',
      color: 'copper',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      ),
      progress: deliveryRate
    },
    {
      title: 'Taux retour',
      value: `${returnRate}%`,
      get subtitle() { return tp('Retours traités'); },
      color: 'warning',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"/>
        </svg>
      ),
      progress: returnRate
    },
    {
      title: 'En cours',
      value: (stats.pending || 0) + (stats.confirmed || 0) + (stats.shipped || 0),
      subtitle: `${stats.pending || 0} en attente · ${stats.shipped || 0} expédiées`,
      color: 'graphite',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      )
    }
  ];

  // Accents tokens shadcn/Scalor : puce d'icône + barre de progression.
  // Les libellés restent en muted-foreground (contraste AA garanti).
  const getAccent = (color) => {
    const accents = {
      green:    { chip: 'bg-primary',      iconText: 'text-primary-foreground', fill: 'bg-primary' },
      copper:   { chip: 'bg-brand-copper', iconText: 'text-white',              fill: 'bg-brand-copper' },
      warning:  { chip: 'bg-brand-warning', iconText: 'text-foreground',        fill: 'bg-brand-warning' },
      graphite: { chip: 'bg-chart-5',      iconText: 'text-white',              fill: 'bg-chart-5' },
    };
    return accents[color] || accents.green;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {kpis.map((kpi, index) => {
        const a = getAccent(kpi.color);
        return (
          <div
            key={index}
            className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 hover:shadow-md active:scale-[0.98] transition-all duration-200 cursor-default"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {kpi.title}
              </p>
              <div
                className={`w-8 h-8 ${a.chip} ${a.iconText} rounded-md flex items-center justify-center`}
                aria-hidden="true"
              >
                {kpi.icon}
              </div>
            </div>
            <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-xs text-muted-foreground font-medium mt-1">{kpi.subtitle}</p>
            {kpi.progress !== undefined && (
              <div
                className="w-full bg-muted rounded-full h-2 mt-2"
                role="progressbar"
                aria-valuenow={Math.min(kpi.progress, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={kpi.title}
              >
                <div
                  className={`${a.fill} h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(kpi.progress, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KPICards;
