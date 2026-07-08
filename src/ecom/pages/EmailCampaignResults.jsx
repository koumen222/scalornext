import React, { useEffect, useState } from 'react';
import { Link, useParams } from '@/lib/router-compat';
import { ArrowLeft, CheckCircle2, Clock3, MailCheck, RefreshCw, XCircle } from 'lucide-react';
import { marketingApi } from '../services/marketingApi.js';
import { tp } from '../i18n/platform.js';

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';

const statusMeta = {
  pending: { label: 'En attente', cls: 'bg-amber-50 text-amber-700 ring-amber-200', Icon: Clock3 },
  sent: { label: 'Accepté SMTP', cls: 'bg-green-50 text-green-700 ring-green-200', Icon: CheckCircle2 },
  failed: { label: 'Échec', cls: 'bg-red-50 text-red-700 ring-red-200', Icon: XCircle },
};

const StatusPill = ({ status }) => {
  const meta = statusMeta[status] || statusMeta.pending;
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${meta.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
};

const campaignStatusForPill = (status) => {
  if (status === 'failed') return 'failed';
  if (status === 'sent') return 'sent';
  return 'pending';
};

export default function EmailCampaignResults() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = async (nextPage = page, opts = {}) => {
    if (opts.silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const r = await marketingApi.getCampaignResults(id, { page: nextPage, limit: 100 });
      setData(r.data?.data || null);
      setPage(nextPage);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de chargement');
      if (!opts.silent) setData(null);
    } finally {
      if (opts.silent) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [id]);

  useEffect(() => {
    if (data?.campaign?.status !== 'sending') return undefined;
    const timer = setInterval(() => {
      load(page, { silent: true });
    }, 5000);
    return () => clearInterval(timer);
  }, [data?.campaign?.status, page, id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tp('Statistiques détaillées campagne')}</h1>
            <p className="text-sm text-gray-500">{tp('Journal SMTP, ouvertures et clics par destinataire')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => load(page, { silent: true })}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-100 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {tp('Actualiser')}
            </button>
            <Link to="/ecom/marketing" className="inline-flex min-h-11 items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-100">
              <ArrowLeft className="w-4 h-4" />
              {tp('Retour marketing')}
            </Link>
          </div>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">{tp('Chargement...')}</div>
        ) : !data ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">{tp('Aucune donnée')}</div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{data.campaign?.name}</h3>
                  <p className="text-sm text-gray-600">Dernière fin d'envoi : {data.campaign?.sentAt ? fmtDate(data.campaign.sentAt) : tp('Pas encore terminée')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={campaignStatusForPill(data.campaign?.status)} />
                  {data.campaign?.status === 'sending' && <span className="text-xs text-amber-700">{tp('Auto-refresh 5s')}</span>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center"><p className="text-2xl font-bold text-blue-600">{data.summary?.total || 0}</p><p className="text-xs text-gray-500">{tp('Total destinataires')}</p></div>
              <div className="bg-amber-50 p-4 rounded-lg text-center"><p className="text-2xl font-bold text-amber-600">{data.summary?.pending || 0}</p><p className="text-xs text-gray-500">{tp('En attente')}</p></div>
              <div className="bg-green-50 p-4 rounded-lg text-center"><p className="text-2xl font-bold text-green-600">{data.summary?.sent || 0}</p><p className="text-xs text-gray-500">{tp('Envoyés')}</p></div>
              <div className="bg-red-50 p-4 rounded-lg text-center"><p className="text-2xl font-bold text-red-600">{data.summary?.failed || 0}</p><p className="text-xs text-gray-500">{tp('Échecs')}</p></div>
              <div className="bg-purple-50 p-4 rounded-lg text-center"><p className="text-2xl font-bold text-purple-600">{data.summary?.opened || 0}</p><p className="text-xs text-gray-500">{tp('Ouvertures')}</p><p className="text-xs text-purple-500 font-medium">{data.summary?.openRate || 0}%</p></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50 p-3 rounded-lg"><p className="text-sm font-medium text-indigo-900">{tp('Taux clic / ouverture')}</p><p className="text-xl font-bold text-indigo-600">{data.summary?.clickToOpenRate || 0}%</p></div>
              <div className="bg-teal-50 p-3 rounded-lg"><p className="text-sm font-medium text-teal-900">{tp('Clics uniques / total')}</p><p className="text-xl font-bold text-teal-600">{data.summary?.clicked || 0} / {data.summary?.totalClicks || 0}</p></div>
            </div>

            {data.topLinks?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">{tp('Top liens cliqués')}</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {data.topLinks.map((link, idx) => (
                    <div key={`${link.url}-${idx}`} className="flex items-center justify-between gap-3 text-xs">
                      <p className="text-gray-700 truncate">{link.url}</p>
                      <p className="text-gray-500 whitespace-nowrap">{link.clicks} clics • {link.uniqueRecipients} pers.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h4 className="text-sm font-medium text-gray-700">Journal par destinataire ({data.pagination?.total || data.recipients?.length || 0})</h4>
                <p className="text-xs text-gray-500">{tp('“Accepté SMTP” signifie que Postfix a pris le mail en charge.')}</p>
              </div>
              <div className="max-h-[620px] overflow-auto border border-gray-200 rounded-lg">
                <table className="w-full min-w-[1040px] text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left">{tp('Destinataire')}</th>
                      <th className="px-3 py-2 text-center">{tp('Statut')}</th>
                      <th className="px-3 py-2 text-left">{tp('SMTP / Postfix')}</th>
                      <th className="px-3 py-2 text-left">{tp('Tentative')}</th>
                      <th className="px-3 py-2 text-center">{tp('Engagement')}</th>
                      <th className="px-3 py-2 text-left">{tp('Erreur')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data.recipients || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                          {tp('Aucun log pour cette campagne.')}
                        </td>
                      </tr>
                    ) : (data.recipients || []).map((r, i) => (
                      <tr key={`${r.email}-${r.recipientToken || i}`} className="hover:bg-gray-50">
                        <td className="px-3 py-2 align-top">
                          <p className="text-gray-900 font-medium">{r.email}</p>
                          {r.name && <p className="text-gray-500 text-xs">{r.name}</p>}
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="px-3 py-2 align-top">
                          {r.smtpQueueId ? (
                            <div className="space-y-1">
                              <div className="inline-flex items-center gap-1.5 text-green-700 font-semibold">
                                <MailCheck className="w-3.5 h-3.5" />
                                Queue <code className="font-mono text-[11px] bg-green-50 px-1.5 py-0.5 rounded">{r.smtpQueueId}</code>
                              </div>
                              <p className="max-w-[360px] truncate text-gray-500" title={r.smtpResponse || ''}>{r.smtpResponse || tp('Accepté par le SMTP')}</p>
                              {r.smtpAccepted?.length > 0 && <p className="text-[11px] text-gray-400">Accepté : {r.smtpAccepted.join(', ')}</p>}
                            </div>
                          ) : (
                            <p className="text-gray-400">{r.status === 'pending' ? 'En attente de réponse SMTP' : tp('Aucune queue SMTP')}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top text-gray-600">
                          <p>Début : {fmtDate(r.attemptedAt)}</p>
                          <p>Fin : {fmtDate(r.sentAt)}</p>
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <div className="space-y-1">
                            {r.opened ? (
                              <p className="text-green-600 font-medium">Ouvert ({r.openCount || 1})</p>
                            ) : <p className="text-gray-400">{tp('Non ouvert')}</p>}
                            {r.uniqueClicks > 0 ? (
                              <p className="text-orange-600 font-medium">{r.uniqueClicks} clic(s){r.totalClicks > r.uniqueClicks ? ` / ${r.totalClicks}` : ''}</p>
                            ) : <p className="text-gray-400">{tp('0 clic')}</p>}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top text-gray-500 max-w-[260px]">
                          <p className="truncate" title={r.error || ''}>{r.error || '—'}</p>
                          {r.smtpRejected?.length > 0 && <p className="text-[11px] text-red-500 truncate" title={r.smtpRejected.join(', ')}>Rejeté : {r.smtpRejected.join(', ')}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data.pagination?.pages > 1 && (
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-500">Page {data.pagination.page}/{data.pagination.pages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => load(page - 1)} disabled={page <= 1} className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">{tp('← Préc.')}</button>
                    <button onClick={() => load(page + 1)} disabled={page >= data.pagination.pages} className="px-3 py-1 text-xs border rounded-lg disabled:opacity-40 hover:bg-gray-50">{tp('Suiv. →')}</button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
