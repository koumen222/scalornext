import React, { useState, useEffect } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { useEcomAuth } from '../hooks/useEcomAuth';
import ecomApi from '../services/ecommApi.js';
import { CenteredSpinner } from '../components/Skeleton.jsx';
import { tp } from '../i18n/platform.js';

const SecurityDashboard = () => {
  const navigate = useNavigate();
  const { user } = useEcomAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [securityInfo, setSecurityInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [logsPage, setLogsPage] = useState(1);
  const [logsPagination, setLogsPagination] = useState(null);

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        const res = await ecomApi.get('/super-admin/security-info');
        setSecurityInfo(res.data.data);
      } catch (err) {
        console.error('Erreur chargement sécurité:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSecurity();
  }, []);

  const fetchAuditLogs = async (page = 1) => {
    if (!isSuperAdmin) return;
    setLogsLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filterAction) params.action = filterAction;
      const res = await ecomApi.get('/super-admin/audit-logs', { params });
      setAuditLogs(res.data.data.logs);
      setAuditStats(res.data.data.stats);
      setLogsPagination(res.data.data.pagination);
      setLogsPage(page);
    } catch (err) {
      console.error('Erreur audit logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) fetchAuditLogs();
  }, [filterAction]);

  const actionColors = {
    LOGIN: 'bg-green-100 text-green-800',
    LOGOUT: 'bg-muted text-foreground',
    LOGIN_FAILED: 'bg-red-100 text-red-800',
    VIEW_USERS: 'bg-primary-100 text-primary-800',
    VIEW_ORDERS: 'bg-primary-100 text-primary-800',
    CREATE_ORDER: 'bg-primary-100 text-primary-800',
    UPDATE_ORDER: 'bg-yellow-100 text-yellow-800',
    DELETE_ORDER: 'bg-red-100 text-red-800',
    DELETE_USER: 'bg-red-100 text-red-800',
    CHANGE_ROLE: 'bg-primary-100 text-primary-900',
    TOGGLE_USER: 'bg-orange-100 text-orange-800',
    TOGGLE_WORKSPACE: 'bg-orange-100 text-orange-800',
    IMPERSONATE_USER: 'bg-red-100 text-red-800',
    VIEW_SENSITIVE_DATA: 'bg-red-100 text-red-800',
    SECURITY_EVENT: 'bg-red-100 text-red-800',
    EXPORT_DATA: 'bg-yellow-100 text-yellow-800',
    SETTINGS_CHANGE: 'bg-primary-100 text-primary-900',
  };

  const actionIcons = {
    LOGIN: '🔑',
    LOGOUT: '🚪',
    LOGIN_FAILED: '🚫',
    VIEW_USERS: '👁️',
    VIEW_ORDERS: '📦',
    DELETE_USER: '🗑️',
    CHANGE_ROLE: '🔥',
    TOGGLE_USER: '⚡',
    TOGGLE_WORKSPACE: '🏢',
    IMPERSONATE_USER: '🎭',
    VIEW_SENSITIVE_DATA: '🔐',
    SECURITY_EVENT: '⚠️',
    EXPORT_DATA: '📥',
    SETTINGS_CHANGE: '⚙️',
  };

  if (loading) return <CenteredSpinner message="Chargement de la sécurité…" />;

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Sécurité & Protection des Données</h1>
            <p className="text-sm text-muted-foreground">{tp('Mesures de sécurité actives et journal d\'audit')}</p>
          </div>
        </div>
      </div>

      {/* Stats en temps réel */}
      {securityInfo?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
            <p className="text-2xl font-bold text-primary">{securityInfo.stats.totalAuditLogs}</p>
            <p className="text-xs text-muted-foreground mt-1">{tp('Actions tracées')}</p>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
            <p className="text-2xl font-bold text-primary">{securityInfo.stats.last24hActions}</p>
            <p className="text-xs text-muted-foreground mt-1">{tp('Actions (24h)')}</p>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{securityInfo.stats.failedLoginsLast24h}</p>
            <p className="text-xs text-muted-foreground mt-1">{tp('Tentatives échouées (24h)')}</p>
          </div>
          <div className="bg-card rounded-xl shadow-sm border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">10</p>
            <p className="text-xs text-muted-foreground mt-1">{tp('Mesures actives')}</p>
          </div>
        </div>
      )}

      {/* Mesures de sécurité */}
      <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {tp('Mesures de sécurité en place')}
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {securityInfo?.measures?.map((measure) => (
            <div key={measure.id} className="px-4 py-3 flex items-center gap-3 hover:bg-background transition">
              <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{measure.name}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-100 text-primary-800">
                    {measure.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{measure.desc}</p>
              </div>
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                  {tp('Actif')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ce que cela signifie pour vous */}
      <div className="bg-gradient-to-br from-primary-50 to-cyan-50 rounded-xl border border-primary-200 p-5 mb-6">
        <h3 className="text-base font-semibold text-primary-900 mb-3">{tp('Ce que cela signifie concrètement pour vous :')}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: '🔒', text: 'Personne ne peut lire votre mot de passe — ni l\'admin, ni le propriétaire, ni les développeurs' },
            { icon: '📋', text: 'Chaque action de l\'admin est enregistrée dans un journal immuable — impossible à supprimer ou modifier' },
            { icon: '🏗️', text: 'Vos données sont isolées — aucun autre espace de travail ne peut y accéder' },
            { icon: '🚫', text: 'Aucun cookie publicitaire — vos habitudes ne sont pas tracées ni vendues' },
            { icon: '⚖️', text: 'L\'admin ne peut accéder qu\'aux données nécessaires à son rôle — pas plus' },
            { icon: '🛡️', text: 'Les tentatives de piratage sont bloquées automatiquement par le rate limiting' },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-card/60 rounded-lg p-3">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-primary-800">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/ecom/privacy')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {tp('Politique de confidentialité complète')}
          </button>
        </div>
      </div>

      {/* Journal d'audit — Super Admin uniquement */}
      {isSuperAdmin && (
        <div className="bg-card rounded-xl shadow-sm border border-border">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Journal d'audit immuable
              <span className="text-xs font-normal text-muted-foreground">{tp('(impossible à modifier/supprimer)')}</span>
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{tp('Toutes les actions')}</option>
                <option value="LOGIN">{tp('Connexions')}</option>
                <option value="LOGIN_FAILED">{tp('Connexions échouées')}</option>
                <option value="VIEW_USERS">{tp('Consultation utilisateurs')}</option>
                <option value="CHANGE_ROLE">{tp('Changements de rôle')}</option>
                <option value="DELETE_USER">{tp('Suppressions')}</option>
                <option value="TOGGLE_USER">{tp('Activations/Désactivations')}</option>
                <option value="VIEW_SENSITIVE_DATA">{tp('Accès données sensibles')}</option>
              </select>
              <button
                onClick={() => fetchAuditLogs(logsPage)}
                className="p-1.5 text-muted-foreground hover:text-primary transition"
                title={tp('Rafraîchir')}
              >
                <svg className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats actions */}
          {auditStats && (
            <div className="px-4 py-2 bg-background border-b border-border flex flex-wrap gap-2">
              {auditStats.actionStats?.slice(0, 6).map((stat) => (
                <span key={stat._id} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${actionColors[stat._id] || 'bg-muted text-muted-foreground'}`}>
                  {actionIcons[stat._id] || '📌'} {stat._id}: {stat.count}
                </span>
              ))}
            </div>
          )}

          {/* Logs table */}
          <div className="overflow-x-auto">
            {logsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Aucun log d'audit trouvé
              </div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">{tp('Date')}</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">{tp('Action')}</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase">{tp('Utilisateur')}</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase hidden sm:table-cell">{tp('Rôle')}</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase hidden md:table-cell">{tp('Détails')}</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-muted-foreground uppercase hidden lg:table-cell">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-background transition">
                      <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${actionColors[log.action] || 'bg-muted text-muted-foreground'}`}>
                          {actionIcons[log.action] || '📌'} {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground max-w-[150px] truncate">{log.userEmail}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground hidden sm:table-cell">{log.userRole}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground max-w-[250px] truncate hidden md:table-cell" title={log.details}>{log.details}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground font-mono hidden lg:table-cell">{log.userIp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {logsPagination && logsPagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{logsPagination.total} logs au total</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchAuditLogs(logsPage - 1)}
                  disabled={logsPage <= 1}
                  className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-background disabled:opacity-30 transition"
                >
                  {tp('Préc.')}
                </button>
                <span className="text-xs text-muted-foreground px-2">{logsPage}/{logsPagination.pages}</span>
                <button
                  onClick={() => fetchAuditLogs(logsPage + 1)}
                  disabled={logsPage >= logsPagination.pages}
                  className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-background disabled:opacity-30 transition"
                >
                  {tp('Suiv.')}
                </button>
              </div>
            </div>
          )}

          {/* Hash d'intégrité */}
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 rounded-b-xl">
            <p className="text-[10px] text-red-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Chaque log contient un hash SHA-256 d'intégrité. Les logs ne peuvent être ni modifiés, ni supprimés — même par le super administrateur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;
