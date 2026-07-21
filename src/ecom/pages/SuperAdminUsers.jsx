import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from '@/lib/router-compat';
import {
  Users, Search, Filter, Crown, Briefcase, Package,
  Calculator, Truck, CheckCircle2, XCircle, Trash2,
  Clock, Building2, UserX, ChevronRight, ChevronLeft, ChevronDown,
} from 'lucide-react';
import { useEcomAuth } from '../hooks/useEcomAuth';
import ecomApi from '../services/ecommApi.js';
import { CenteredSpinner } from '../components/Skeleton.jsx';
import { getContextualError } from '../utils/errorMessages';
import SuperAdminShell from '../components/SuperAdminShell.jsx';
import UsersGrowthDashboard from '../components/UsersGrowthDashboard.jsx';
import { tp } from '../i18n/platform.js';

const PAGE_SIZE = 50;

const roleLabels = {
  super_admin: 'Super Admin',
  ecom_admin: 'Admin',
  ecom_closeuse: 'Closeuse',
  ecom_compta: 'Comptable',
  ecom_livreur: 'Livreur'
};

const roleConfig = {
  super_admin: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    icon: Crown,
  },
  ecom_admin: {
    bg: 'bg-primary-50',
    text: 'text-primary-800',
    ring: 'ring-primary-700/20',
    icon: Briefcase,
  },
  ecom_closeuse: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    ring: 'ring-teal-600/20',
    icon: Package,
  },
  ecom_compta: {
    bg: 'bg-primary-50',
    text: 'text-primary',
    ring: 'ring-primary-600/20',
    icon: Calculator,
  },
  ecom_livreur: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-600/20',
    icon: Truck,
  },
};

const planColors = { free: 'bg-slate-100 text-slate-500', pro: 'bg-primary-100 text-primary', ultra: 'bg-amber-100 text-amber-700' };
const planLabels = { free: 'Gratuit', pro: 'Pro', ultra: 'Ultra' };

const fmtLastLogin = (d) => d
  ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  : null;

const SuperAdminUsers = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useEcomAuth();
  const [users, setUsers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterWorkspace, setFilterWorkspace] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [stats, setStats] = useState(null);

  // Combobox espaces (recherche dans 600+ workspaces)
  const [wsOpen, setWsOpen] = useState(false);
  const [wsQuery, setWsQuery] = useState('');
  const wsBoxRef = useRef(null);

  const fetchUsers = async () => {
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterWorkspace) params.workspaceId = filterWorkspace;
      if (filterStatus) params.isActive = filterStatus;
      const res = await ecomApi.get('/super-admin/users', { params });
      const d = res.data.data;
      setUsers(d.users);
      setPagination({ total: d.pagination?.total ?? d.users.length, pages: d.pagination?.pages ?? 1 });
      setStats(d.stats || null);
    } catch (err) { setError(getContextualError(err, 'load_users')); }
  };

  const fetchWorkspaces = async () => {
    try {
      const res = await ecomApi.get('/super-admin/workspaces');
      setWorkspaces(res.data.data.workspaces);
    } catch { }
  };

  useEffect(() => {
    const load = async () => { setLoading(true); await Promise.all([fetchUsers(), fetchWorkspaces()]); setLoading(false); };
    load();
  }, []);

  useEffect(() => { if (!loading) fetchUsers(); }, [search, filterRole, filterWorkspace, filterStatus, page]);

  // Fermer le combobox espaces au clic extérieur
  useEffect(() => {
    const onDoc = (e) => { if (wsBoxRef.current && !wsBoxRef.current.contains(e.target)) setWsOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const resetPage = () => setPage(1);

  const filteredWs = useMemo(() => {
    const q = wsQuery.trim().toLowerCase();
    const list = q ? workspaces.filter((w) => (w.name || '').toLowerCase().includes(q)) : workspaces;
    return list.slice(0, 60);
  }, [wsQuery, workspaces]);

  const selectedWs = workspaces.find((w) => w._id === filterWorkspace) || null;

  const handleToggleUser = async (userId) => {
    try { const res = await ecomApi.put(`/super-admin/users/${userId}/toggle`); setSuccess(res.data.message); fetchUsers(); }
    catch (err) { setError(getContextualError(err, 'save_user')); }
  };

  const handleChangeRole = async (userId, newRole) => {
    try { const res = await ecomApi.put(`/super-admin/users/${userId}/role`, { role: newRole }); setSuccess(res.data.message); fetchUsers(); }
    catch (err) { setError(getContextualError(err, 'save_user')); }
  };

  const handleSetPlan = async (workspaceId, plan) => {
    if (!workspaceId) return;
    try {
      await ecomApi.patch(`/super-admin/workspaces/${workspaceId}/plan`, { plan, durationMonths: 1 });
      setSuccess(`Plan mis à jour : ${plan}`);
      fetchWorkspaces();
    } catch (err) { setError(getContextualError(err, 'save_user')); }
  };

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`Supprimer définitivement ${email} ?`)) return;
    try { await ecomApi.delete(`/super-admin/users/${userId}`); setSuccess('Utilisateur supprimé'); fetchUsers(); }
    catch (err) { setError(getContextualError(err, 'delete_user')); }
  };

  useEffect(() => { if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); } }, [success]);
  useEffect(() => { if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); } }, [error]);

  if (loading) return <CenteredSpinner message="Chargement des utilisateurs…" />;

  const totalUsers = stats?.totalUsers ?? pagination.total;
  const totalActive = stats?.totalActive ?? users.filter(u => u.isActive).length;
  const totalBlocked = stats?.totalInactive ?? users.filter(u => !u.isActive).length;

  return (
    <SuperAdminShell
      title={tp('Gestion des utilisateurs')}
      subtitle={`${totalUsers} utilisateurs · ${totalActive} actifs · ${totalBlocked} bloqués`}
      icon={Users}
      success={success}
      error={error}
      refreshing={loading}
      onRefresh={() => fetchUsers()}
    >
      <div className="space-y-5">
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total', value: totalUsers, icon: Users, accent: '#059669', accentLight: '#d1fae5' },
            { label: 'Actifs', value: totalActive, icon: CheckCircle2, accent: '#2563eb', accentLight: '#dbeafe' },
            { get label() { return tp('Bloqués'); }, value: totalBlocked, icon: XCircle, accent: '#f59e0b', accentLight: '#fef3c7' },
          ].map(k => (
            <div key={k.label} className="bg-card rounded-2xl border border-slate-100 p-4 hover:shadow-lg transition-all">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ backgroundColor: k.accentLight }}>
                <k.icon className="w-4 h-4" style={{ color: k.accent }} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k.label}</p>
              <p className="text-2xl font-extrabold text-slate-900">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Dashboard croissance (inscriptions, actifs, temps passé) */}
        <UsersGrowthDashboard />

        {/* Filters */}
        <div className="bg-card rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{tp('Filtres')}</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={tp('Rechercher par email ou nom...')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPage(); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all"
              />
            </div>
            <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); resetPage(); }} className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all cursor-pointer">
              <option value="">{tp('Tous les rôles')}</option>
              <option value="super_admin">{tp('Super Admin')}</option>
              <option value="ecom_admin">{tp('Admin')}</option>
              <option value="ecom_closeuse">{tp('Closeuse')}</option>
              <option value="ecom_compta">{tp('Comptable')}</option>
              <option value="ecom_livreur">{tp('Livreur')}</option>
            </select>

            {/* Combobox espaces avec recherche */}
            <div className="relative min-w-[220px]" ref={wsBoxRef}>
              <button
                type="button"
                onClick={() => { setWsOpen(o => !o); setWsQuery(''); }}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all cursor-pointer"
              >
                <span className="truncate">{selectedWs?.name || tp('Tous les espaces')}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${wsOpen ? 'rotate-180' : ''}`} />
              </button>
              {wsOpen && (
                <div className="absolute z-30 mt-1.5 w-[280px] bg-card border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <input
                      autoFocus
                      value={wsQuery}
                      onChange={(e) => setWsQuery(e.target.value)}
                      placeholder={tp('Rechercher un espace…')}
                      className="w-full px-3 py-2 bg-slate-50 rounded-lg text-sm font-medium outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => { setFilterWorkspace(''); resetPage(); setWsOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 text-[13px] font-bold hover:bg-slate-50 transition-colors ${!filterWorkspace ? 'text-primary bg-primary-50/60' : 'text-slate-700'}`}
                    >
                      {tp('Tous les espaces')}
                    </button>
                    {filteredWs.map(ws => (
                      <button
                        key={ws._id}
                        type="button"
                        onClick={() => { setFilterWorkspace(ws._id); resetPage(); setWsOpen(false); }}
                        className={`w-full text-left px-3.5 py-2 text-[13px] font-medium hover:bg-slate-50 transition-colors truncate ${filterWorkspace === ws._id ? 'text-primary bg-primary-50/60 font-bold' : 'text-slate-600'}`}
                      >
                        {ws.name || '—'}
                      </button>
                    ))}
                    {filteredWs.length === 0 && (
                      <p className="px-3.5 py-3 text-xs text-slate-400">{tp('Aucun espace trouvé')}</p>
                    )}
                    {filteredWs.length === 60 && (
                      <p className="px-3.5 py-2 text-[10px] text-slate-400 border-t border-slate-50">{tp('60 premiers résultats — affinez la recherche')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }} className="px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 transition-all cursor-pointer">
              <option value="">{tp('Tous les statuts')}</option>
              <option value="true">{tp('Actifs')}</option>
              <option value="false">{tp('Bloqués')}</option>
            </select>
          </div>
        </div>

        {/* Users table */}
        {users.length === 0 ? (
          <div className="bg-card rounded-2xl border border-slate-200 p-20 text-center shadow-sm">
            <UserX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-black text-slate-400">{tp('Aucun utilisateur trouvé')}</p>
            <p className="text-sm text-slate-400 mt-2">{tp('Essayez de modifier vos filtres')}</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header desktop */}
            <div className="hidden lg:grid grid-cols-[minmax(0,1fr)_180px_150px_360px] items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span>{tp('Utilisateur')}</span>
              <span>{tp('Espace / Plan')}</span>
              <span>{tp('Dernière connexion')}</span>
              <span className="text-right pr-1">{tp('Actions')}</span>
            </div>

            {users.map(u => {
              const config = roleConfig[u.role] || roleConfig.ecom_admin;
              const RoleIcon = config.icon;
              const wsId = u.workspaceId?._id || u.workspaceId;
              const ws = workspaces.find(w => w._id === wsId);
              const plan = ws?.plan || 'free';
              const lastLogin = fmtLastLogin(u.lastLogin);
              const goDetail = () => navigate(`/ecom/super-admin/users/${u._id}`);
              return (
                <div
                  key={u._id}
                  className={`grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_180px_150px_360px] items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 transition-colors hover:bg-slate-50/70 ${!u.isActive ? 'bg-amber-50/40' : ''}`}
                >
                  {/* Identité */}
                  <div className="flex items-center gap-3 min-w-0 cursor-pointer group" onClick={goDetail}>
                    <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ring-2 ring-inset ${u.isActive ? `${config.bg} ${config.text} ${config.ring}` : 'bg-amber-50 text-amber-600 ring-amber-200'}`}>
                      {u.email?.charAt(0).toUpperCase()}
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${u.isActive ? 'bg-primary' : 'bg-amber-500'} ring-2 ring-white`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[13px] font-black text-slate-900 truncate group-hover:text-primary transition-colors">{u.email}</p>
                        {!u.isActive && (
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-black flex-shrink-0">BLOQUÉ</span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <div className={`flex items-center gap-1 text-[11px] font-bold ${config.text}`}>
                        <RoleIcon className="w-3 h-3" />
                        {roleLabels[u.role] || u.role}
                        {u.name && <span className="text-slate-400 font-medium truncate">· {u.name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Espace / plan (desktop) */}
                  <div className="hidden lg:block min-w-0">
                    {u.workspaceId?.name ? (
                      <p className="flex items-center gap-1 text-xs text-slate-600 font-semibold truncate">
                        <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{u.workspaceId.name}</span>
                      </p>
                    ) : <p className="text-xs text-slate-300">—</p>}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${planColors[plan]}`}>
                      <Crown className="w-2.5 h-2.5" />
                      {planLabels[plan]}
                    </span>
                  </div>

                  {/* Dernière connexion (desktop) */}
                  <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium">
                    <Clock className="w-3 h-3 text-slate-300 flex-shrink-0" />
                    {lastLogin
                      ? <span className="text-slate-500">{lastLogin}</span>
                      : <span className="text-amber-600 font-bold">{tp('Jamais connecté')}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 justify-end flex-shrink-0">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u._id, e.target.value)}
                      disabled={u._id === currentUser?.id}
                      className="text-[11px] font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hidden sm:block cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all"
                    >
                      <option value="ecom_admin">{tp('Admin')}</option>
                      <option value="ecom_closeuse">{tp('Closeuse')}</option>
                      <option value="ecom_compta">{tp('Comptable')}</option>
                      <option value="ecom_livreur">{tp('Livreur')}</option>
                    </select>
                    {u.role === 'ecom_admin' && (
                      <select
                        value={plan}
                        onChange={(e) => handleSetPlan(wsId, e.target.value)}
                        disabled={!wsId}
                        className="text-[11px] font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-600 transition-all"
                        title={tp('Changer le plan')}
                      >
                        <option value="free">{tp('Gratuit')}</option>
                        <option value="pro">Pro</option>
                        <option value="ultra">Ultra</option>
                      </select>
                    )}
                    <button
                      onClick={() => handleToggleUser(u._id)}
                      disabled={u._id === currentUser?.id}
                      title={u.isActive ? tp('Bloquer') : tp('Activer')}
                      className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${u.isActive ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-primary bg-primary-50 hover:bg-primary-100'}`}
                    >
                      {u.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u._id, u.email)}
                      disabled={u._id === currentUser?.id}
                      title={tp('Supprimer')}
                      className="p-2 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Meta mobile : espace / plan / dernière connexion */}
                  <div className="lg:hidden col-span-2 flex items-center gap-2 flex-wrap pl-12 -mt-1">
                    {u.workspaceId?.name && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {u.workspaceId.name}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${planColors[plan]}`}>
                      <Crown className="w-2.5 h-2.5" />
                      {planLabels[plan]}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                      <Clock className="w-3 h-3 text-slate-300" />
                      {lastLogin
                        ? <span className="text-slate-400">{lastLogin}</span>
                        : <span className="text-amber-600 font-bold">{tp('Jamais connecté')}</span>}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between bg-card rounded-2xl border border-slate-200 px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">
              {pagination.total} {tp('utilisateurs')} · {tp('page')} {page}/{pagination.pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> {tp('Précédent')}
              </button>
              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold rounded-xl bg-slate-50 border-2 border-slate-200 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {tp('Suivant')} <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </SuperAdminShell>
  );
};

export default SuperAdminUsers;
