import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import ecomApi from '../services/ecommApi.js';

// ─── Référentiels (miroir du backend) ────────────────────────────────────────
const CATEGORIES = [
  ['bug_technique', 'Bug technique'],
  ['question', 'Question'],
  ['plainte_livraison', 'Plainte livraison'],
  ['autre', 'Autre'],
];
const PRIORITIES = [
  ['low', 'Basse'],
  ['medium', 'Moyenne'],
  ['high', 'Haute'],
  ['critical', 'Critique'],
];
const STATUS_LABELS = {
  nouveau: 'Nouveau',
  analyse_en_cours: 'Analyse en cours',
  patch_propose: 'Patch proposé',
  en_review: 'En review',
  deploye: 'Déployé',
  escalade: 'Escalade',
  ferme: 'Fermé',
};
const STATUS_COLORS = {
  nouveau: 'bg-blue-100 text-blue-700',
  analyse_en_cours: 'bg-indigo-100 text-indigo-700',
  patch_propose: 'bg-violet-100 text-violet-700',
  en_review: 'bg-amber-100 text-amber-700',
  deploye: 'bg-green-100 text-green-700',
  escalade: 'bg-red-100 text-red-700',
  ferme: 'bg-gray-200 text-gray-600',
};
const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
const RISK_COLORS = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};
// Transitions manuelles autorisées (miroir de MANUAL_TRANSITIONS côté API)
const MANUAL_TRANSITIONS = {
  nouveau: ['analyse_en_cours', 'en_review', 'escalade', 'ferme'],
  analyse_en_cours: ['escalade', 'ferme'],
  patch_propose: ['en_review', 'escalade', 'ferme'],
  en_review: ['escalade', 'ferme'],
  deploye: ['ferme'],
  escalade: ['en_review', 'ferme'],
  ferme: [],
};

const catLabel = (c) => (CATEGORIES.find(([v]) => v === c) || [null, c])[1];
const prioLabel = (p) => (PRIORITIES.find(([v]) => v === p) || [null, p])[1];
const fmtDate = (d) => (d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');

const Badge = ({ className = '', children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>{children}</span>
);

const emptyForm = { title: '', description: '', category: 'bug_technique', priority: 'medium', customerPhone: '', customerEmail: '', screenshotUrl: '' };

const TicketsAdmin = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'error'|'success', text }

  const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000); };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      const res = await ecomApi.get('/tickets', { params });
      setTickets(res.data?.data?.tickets || []);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Impossible de charger les tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setSelected({ _id: id });
    try {
      const res = await ecomApi.get(`/tickets/${id}`);
      setSelected(res.data?.data || null);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Ticket introuvable');
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await ecomApi.post('/tickets', form);
      setShowCreate(false);
      setForm(emptyForm);
      flash('success', 'Ticket créé');
      await loadTickets();
      if (res.data?.data?._id) openDetail(res.data.data._id);
    } catch (err) {
      flash('error', err.response?.data?.message || 'Création impossible');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (nextStatus) => {
    if (!selected?._id) return;
    setBusy(true);
    try {
      const res = await ecomApi.patch(`/tickets/${selected._id}/status`, { status: nextStatus });
      setSelected(res.data?.data || selected);
      flash('success', `Statut → ${STATUS_LABELS[nextStatus] || nextStatus}`);
      loadTickets();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Transition refusée');
    } finally {
      setBusy(false);
    }
  };

  const approvePatch = async () => {
    if (!selected?._id) return;
    setBusy(true);
    try {
      const res = await ecomApi.post(`/tickets/${selected._id}/approve-patch`);
      flash('success', res.data?.message || 'Patch approuvé');
      loadTickets();
    } catch (err) {
      // 501 attendu tant que la Phase 2 (merge git) n'est pas livrée
      flash('error', err.response?.data?.message || 'Approbation impossible');
    } finally {
      setBusy(false);
    }
  };

  const rejectPatch = async () => {
    if (!selected?._id) return;
    const note = window.prompt('Motif du rejet (optionnel) :') ?? '';
    setBusy(true);
    try {
      const res = await ecomApi.post(`/tickets/${selected._id}/reject-patch`, { note });
      setSelected(res.data?.data || selected);
      flash('success', 'Patch rejeté — escalade');
      loadTickets();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Rejet impossible');
    } finally {
      setBusy(false);
    }
  };

  const dispatchToClaude = async () => {
    if (!selected?._id) return;
    setBusy(true);
    try {
      const res = await ecomApi.post(`/tickets/${selected._id}/dispatch`);
      setSelected(res.data?.data || selected);
      flash('success', 'Envoyé à Claude Code — analyse en cours');
      loadTickets();
    } catch (err) {
      flash('error', err.response?.data?.message || 'Envoi à Claude impossible (config GitHub manquante ?)');
    } finally {
      setBusy(false);
    }
  };

  const allowedTransitions = selected ? (MANUAL_TRANSITIONS[selected.status] || []) : [];
  const analysis = selected?.claudeAnalysis || {};
  const fix = analysis?.proposedFix || {};

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tickets &amp; bugs</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Service client interne — analyse et résolution des bugs.</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={loadTickets} title="Rafraîchir" className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => { setForm(emptyForm); setShowCreate(true); }} className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">Nouveau</span> ticket
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{msg.text}</div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Tous les statuts</option>
          {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{tickets.length} ticket(s)</span>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : tickets.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">Aucun ticket pour ces filtres.</div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <button key={t._id} onClick={() => openDetail(t._id)} className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 sm:p-4 hover:border-primary-300 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{t.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge className={STATUS_COLORS[t.status]}>{STATUS_LABELS[t.status] || t.status}</Badge>
                    <Badge className="bg-gray-100 text-gray-600">{catLabel(t.category)}</Badge>
                    <Badge className={PRIORITY_COLORS[t.priority]}>{prioLabel(t.priority)}</Badge>
                    {t.claudeAnalysis?.riskLevel && <Badge className={RISK_COLORS[t.claudeAnalysis.riskLevel]}>Risque {t.claudeAnalysis.riskLevel}</Badge>}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 whitespace-nowrap">{fmtDate(t.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Détail (panneau latéral) */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setSelected(null)}>
          <div className="w-full max-w-xl h-full bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 truncate pr-3">{selected.title || 'Ticket'}</h2>
              <button onClick={() => setSelected(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 flex-shrink-0"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading ? (
              <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="px-4 sm:px-6 py-4 space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status] || selected.status}</Badge>
                  <Badge className="bg-gray-100 text-gray-600">{catLabel(selected.category)}</Badge>
                  <Badge className={PRIORITY_COLORS[selected.priority]}>{prioLabel(selected.priority)}</Badge>
                  {analysis.riskLevel && <Badge className={RISK_COLORS[analysis.riskLevel]}>Risque {analysis.riskLevel}</Badge>}
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</p>
                </div>

                {/* Contexte client */}
                {selected.context?.userSnapshot && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Client concerné</p>
                    <p className="text-sm text-gray-800 font-medium">{selected.context.userSnapshot.name || '—'}</p>
                    <p className="text-xs text-gray-500">{selected.context.userSnapshot.phone} · {selected.context.userSnapshot.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Commandes : {selected.context.userSnapshot.ordersCount ?? '—'} · Total : {selected.context.userSnapshot.totalSpent ?? '—'}</p>
                  </div>
                )}

                {/* Analyse Claude */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Analyse Claude</p>
                  {(!analysis.status || analysis.status === 'skipped') ? (
                    <p className="text-sm text-gray-500">Aucune analyse (catégorie hors bug technique).</p>
                  ) : analysis.status === 'pending' ? (
                    <p className="text-sm text-amber-600">En attente d'un run Claude Code.</p>
                  ) : analysis.status === 'running' ? (
                    <p className="text-sm text-amber-600">Analyse en cours — run Claude Code en exécution…{analysis.runUrl && <> · <a href={analysis.runUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">suivre le run</a></>}</p>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-700">
                      {analysis.status === 'failed' && analysis.error && (
                        <div className="flex items-start gap-1.5 text-red-600 bg-red-50 rounded-lg p-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="whitespace-pre-wrap break-words">{analysis.error}</span>
                        </div>
                      )}
                      {analysis.diagnosis && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Ce que Claude a fait / conclu</p>
                          <p className="whitespace-pre-wrap break-words text-gray-700">{analysis.diagnosis}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {analysis.confidenceScore != null && <span>Confiance : {Math.round(analysis.confidenceScore * 100)}%</span>}
                        {analysis.recommendedAction && <span>Reco : {analysis.recommendedAction}</span>}
                        {analysis.analyzedAt && <span>Analysé : {fmtDate(analysis.analyzedAt)}</span>}
                      </div>
                      {(fix.branch || fix.prUrl || (Array.isArray(fix.filesChanged) && fix.filesChanged.length > 0)) && (
                        <div className="mt-1 bg-gray-900 text-gray-100 rounded-lg p-2 text-xs font-mono overflow-x-auto">
                          {fix.branch && <div>branche : {fix.branch}</div>}
                          {Array.isArray(fix.filesChanged) && fix.filesChanged.length > 0 && <div>fichiers ({fix.filesChanged.length}) : {fix.filesChanged.join(', ')}</div>}
                          {fix.testResults && <div>tests : {fix.testResults.passed}/{fix.testResults.total}</div>}
                          {fix.prUrl && <div>PR : <a href={fix.prUrl} target="_blank" rel="noreferrer" className="text-primary-300 underline break-all">{fix.prUrl}</a></div>}
                        </div>
                      )}
                      {analysis.runUrl && (
                        <a href={analysis.runUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium hover:underline">Voir l'exécution GitHub (logs complets) →</a>
                      )}
                      {analysis.blacklistTriggered?.length > 0 && (
                        <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertTriangle className="w-3.5 h-3.5" /> Liste noire : {analysis.blacklistTriggered.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Résolution automatique par Claude Code */}
                {selected.category === 'bug_technique' && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Résolution automatique</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button disabled={busy} onClick={dispatchToClaude} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                        {analysis.status === 'running' ? 'Relancer Claude Code' : 'Envoyer à Claude Code'}
                      </button>
                      {analysis.status === 'running' && <span className="text-xs text-amber-600">Analyse en cours…</span>}
                      {analysis.status === 'failed' && <span className="text-xs text-red-600">Échec — voir historique</span>}
                    </div>
                  </div>
                )}

                {/* Actions statut */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Changer le statut</p>
                  {allowedTransitions.length === 0 ? (
                    <p className="text-sm text-gray-400">Aucune transition disponible.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allowedTransitions.map((s) => (
                        <button key={s} disabled={busy} onClick={() => changeStatus(s)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                          → {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patch : approve / reject */}
                {['en_review', 'patch_propose'].includes(selected.status) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selected.status === 'en_review' && (
                      <button disabled={busy} onClick={approvePatch} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50">Approuver le patch</button>
                    )}
                    <button disabled={busy} onClick={rejectPatch} className="px-4 py-2 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 disabled:opacity-50">Rejeter le patch</button>
                  </div>
                )}

                {/* Historique */}
                {Array.isArray(selected.history) && selected.history.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Historique</p>
                    <ul className="space-y-1.5">
                      {selected.history.slice().reverse().map((h, i) => (
                        <li key={i} className="text-xs text-gray-500 flex gap-2">
                          <span className="text-gray-400 whitespace-nowrap">{fmtDate(h.at)}</span>
                          <span className="text-gray-700 font-medium">{h.action}</span>
                          {h.note && <span className="truncate">— {h.note}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Création */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <form onSubmit={createTicket} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 sm:p-6 space-y-3 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Nouveau ticket</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Titre *</label>
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Résumé court du problème" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description * (≥ 10 caractères)</label>
              <textarea required rows={4} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" placeholder="Étapes, comportement observé, contexte…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Catégorie *</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Priorité</label>
                <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  {PRIORITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tél. client (optionnel)</label>
                <input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Pour enrichir le contexte" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email client (optionnel)</label>
                <input value={form.customerEmail} onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="Pour enrichir le contexte" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Annuler</button>
              <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">{submitting ? 'Création…' : 'Créer le ticket'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TicketsAdmin;
