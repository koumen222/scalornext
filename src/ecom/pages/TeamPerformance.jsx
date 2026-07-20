import React, { useState, useEffect } from 'react';
import { Link } from '@/lib/router-compat';
import ecomApi from '../services/ecommApi.js';
import { getContextualError } from '../utils/errorMessages';
import { tp } from '../i18n/platform.js';

const PerfSkeleton = () => (
  <div className="p-4 sm:p-6">
    <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const roleLabels = {
  ecom_admin: 'Admin',
  ecom_closeuse: 'Closeuse',
  ecom_compta: 'Comptable',
  ecom_livreur: 'Livreur'
};

const roleColors = {
  ecom_admin: 'bg-primary-100 text-primary-800',
  ecom_closeuse: 'bg-primary-100 text-primary',
  ecom_compta: 'bg-green-100 text-green-700',
  ecom_livreur: 'bg-orange-100 text-orange-700'
};

const roleAvatarColors = {
  ecom_admin: 'bg-primary-100 text-primary',
  ecom_closeuse: 'bg-primary-100 text-primary',
  ecom_compta: 'bg-green-100 text-green-600',
  ecom_livreur: 'bg-orange-100 text-orange-600'
};

function timeAgo(date) {
  if (!date) return 'Jamais';
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ù€ l\'instant';
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `Il y a ${d}j`;
  return `Il y a ${Math.floor(d / 30)} mois`;
}

function fmtNum(n) {
  if (!n) return '0';
  return n.toLocaleString('fr-FR');
}

function fmtMoney(n) {
  if (!n) return '0 FCFA';
  return n.toLocaleString('fr-FR') + ' FCFA';
}

const TeamPerformance = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchPerformance();
  }, [period]);

  const fetchPerformance = async () => {
    setLoading(true); setError('');
    try {
      const res = await ecomApi.get(`/users/team/performance?period=${period}`);
      setData(res.data.data);
    } catch (err) {
      setError(getContextualError(err, 'load_stats'));
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = data?.members?.filter(m =>
    filterRole === 'all' || m.role === filterRole
  ) || [];

  if (loading) return <PerfSkeleton />;

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
      </div>
    );
  }

  const global = data?.global || {};

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/ecom/users" className="text-muted-foreground hover:text-muted-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{tp('Performances Équipe')}</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-8">{global.totalMembers || 0} membres · {global.activeMembers || 0} actifs sur la période</p>
        </div>
        {/* Sélecteur de période */}
        <div className="flex items-center gap-2">
          {['7', '30', '90'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                period === p
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-gray-200'
              }`}
            >
              {p}j
            </button>
          ))}
        </div>
      </div>

      {/* Cartes globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{fmtNum(global.totalOrders)}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium mt-1">{tp('Commandes')}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{fmtNum(global.totalDelivered)}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium mt-1">{tp('Livrées')}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-primary">{global.totalOrders > 0 ? Math.round((global.totalDelivered / global.totalOrders) * 100) : 0}%</div>
          <div className="text-xs text-muted-foreground uppercase font-medium mt-1">{tp('Taux livraison')}</div>
        </div>
        <div className="bg-card rounded-xl shadow-sm border p-4 text-center">
          <div className="text-lg font-bold text-primary">{fmtMoney(global.totalRevenue)}</div>
          <div className="text-xs text-muted-foreground uppercase font-medium mt-1">{tp('Revenus')}</div>
        </div>
      </div>

      {/* Filtres par rôle */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { key: 'all', label: 'Tous' },
          { key: 'ecom_closeuse', label: 'Closeuses' },
          { key: 'ecom_livreur', label: 'Livreurs' },
          { key: 'ecom_admin', label: 'Admins' },
          { key: 'ecom_compta', label: 'Comptables' }
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterRole(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filterRole === f.key
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1 opacity-70">
                ({data?.members?.filter(m => m.role === f.key).length || 0})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grille des membres */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map(member => (
          <MemberCard key={member._id} member={member} period={period} />
        ))}
      </div>

      {filteredMembers.length === 0 && (
        <div className="bg-card rounded-xl border p-10 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          </div>
          <p className="text-sm text-muted-foreground">{tp('Aucun membre dans cette catégorie')}</p>
        </div>
      )}
    </div>
  );
};

const MemberCard = ({ member, period }) => {
  const initials = (member.name || member.email)
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const avatarColor = roleAvatarColors[member.role] || 'bg-muted text-muted-foreground';
  const roleBadge = roleColors[member.role] || 'bg-muted text-muted-foreground';
  const stats = member.stats || {};

  const isRecentlyActive = member.lastLogin &&
    (Date.now() - new Date(member.lastLogin).getTime()) < 24 * 60 * 60 * 1000;

  return (
    <div className="bg-card rounded-xl shadow-sm border hover:shadow-md transition overflow-hidden">
      {/* Header membre */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate text-sm">{member.name || member.email.split('@')[0]}</p>
              {isRecentlyActive && (
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title={tp('Actif récemment')}></span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${roleBadge}`}>
            {roleLabels[member.role] || member.role}
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          {tp('Dernière connexion :')} <span className="font-medium text-muted-foreground">{timeAgo(member.lastLogin)}</span>
        </div>
      </div>

      {/* Stats selon le rôle */}
      <div className="p-4">
        {member.role === 'ecom_livreur' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Commandes assignées')}</span>
              <span className="font-bold text-foreground">{fmtNum(stats.assigned)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Livrées')}</span>
              <span className="font-bold text-green-600">{fmtNum(stats.delivered)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Retours')}</span>
              <span className="font-bold text-red-500">{fmtNum(stats.returned)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('En cours')}</span>
              <span className="font-bold text-yellow-600">{fmtNum(stats.pending)}</span>
            </div>
            {/* Barre de taux de livraison */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{tp('Taux de livraison')}</span>
                <span className={`text-xs font-bold ${
                  (stats.deliveryRate || 0) >= 70 ? 'text-green-600' :
                  (stats.deliveryRate || 0) >= 40 ? 'text-yellow-600' : 'text-red-500'
                }`}>{stats.deliveryRate || 0}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    (stats.deliveryRate || 0) >= 70 ? 'bg-green-500' :
                    (stats.deliveryRate || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(stats.deliveryRate || 0, 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{tp('Revenus générés')}</span>
                <span className="text-xs font-bold text-primary">{fmtMoney(stats.revenue)}</span>
              </div>
            </div>
          </div>
        )}

        {member.role === 'ecom_closeuse' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Commandes traitées')}</span>
              <span className="font-bold text-foreground">{fmtNum(stats.totalProcessed)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Confirmées')}</span>
              <span className="font-bold text-green-600">{fmtNum(stats.confirmed)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Annulées')}</span>
              <span className="font-bold text-red-500">{fmtNum(stats.cancelled)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Injoignables')}</span>
              <span className="font-bold text-yellow-600">{fmtNum(stats.unreachable)}</span>
            </div>
            {/* Taux de confirmation */}
            {stats.totalProcessed > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{tp('Taux de confirmation')}</span>
                  <span className={`text-xs font-bold ${
                    Math.round((stats.confirmed / stats.totalProcessed) * 100) >= 60 ? 'text-green-600' :
                    Math.round((stats.confirmed / stats.totalProcessed) * 100) >= 30 ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {Math.round((stats.confirmed / stats.totalProcessed) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      Math.round((stats.confirmed / stats.totalProcessed) * 100) >= 60 ? 'bg-green-500' :
                      Math.round((stats.confirmed / stats.totalProcessed) * 100) >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(Math.round((stats.confirmed / stats.totalProcessed) * 100), 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            <div className="pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{tp('Valeur confirmée')}</span>
                <span className="text-xs font-bold text-primary">{fmtMoney(stats.revenue)}</span>
              </div>
            </div>
          </div>
        )}

        {member.role === 'ecom_compta' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Transactions créées')}</span>
              <span className="font-bold text-foreground">{fmtNum(stats.totalTransactions)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Entrées')}</span>
              <span className="font-bold text-green-600">{fmtNum(stats.income)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{tp('Dépenses')}</span>
              <span className="font-bold text-red-500">{fmtNum(stats.expense)}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{tp('Total entrées')}</span>
                <span className="text-xs font-bold text-green-600">{fmtMoney(stats.totalIncome)}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">{tp('Total dépenses')}</span>
                <span className="text-xs font-bold text-red-500">{fmtMoney(stats.totalExpense)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{tp('Solde net')}</span>
                <span className={`text-sm font-bold ${
                  (stats.netBalance || 0) >= 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {(stats.netBalance || 0) >= 0 ? '+' : ''}{fmtMoney(stats.netBalance)}
                </span>
              </div>
            </div>
          </div>
        )}

        {member.role === 'ecom_admin' && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${avatarColor}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <p className="text-xs text-muted-foreground">Gestion & supervision</p>
            <p className="text-xs text-muted-foreground mt-1">
              Membre depuis {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }) : '-'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPerformance;
