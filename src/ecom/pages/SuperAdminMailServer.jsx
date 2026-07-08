import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Inbox,
  Mail,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Server,
  ShieldCheck,
  Terminal,
  XCircle,
} from 'lucide-react';
import ecomApi from '../services/ecommApi.js';
import { tp } from '../i18n/platform.js';

const tabs = [
  { id: 'overview', label: 'Vue globale', icon: Activity },
  { id: 'sends', label: 'Envois', icon: Send },
  { id: 'logs', label: 'Logs', icon: Terminal },
  { id: 'mailbox', label: 'Mails recus', icon: Inbox },
  { id: 'dns', label: 'DNS', icon: ShieldCheck },
  { id: 'config', label: 'Config', icon: FileText },
  { id: 'test', label: 'Test SMTP', icon: Send },
];

const sendSourceLabels = {
  otp: 'Code OTP',
  notification: 'Notification',
  custom: 'Email custom',
  campaign: 'Campagne',
  campaign_test: 'Test campagne',
  app: 'Application',
};

const eventStyles = {
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dkim: 'bg-blue-50 text-blue-700 border-blue-200',
  tls: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  auth: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  rejected: 'bg-amber-50 text-amber-700 border-amber-200',
  bounced: 'bg-red-50 text-red-700 border-red-200',
  deferred: 'bg-orange-50 text-orange-700 border-orange-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  removed: 'bg-gray-50 text-gray-600 border-gray-200',
  active: 'bg-sky-50 text-sky-700 border-sky-200',
  prepared: 'bg-slate-50 text-slate-600 border-slate-200',
  pickup: 'bg-slate-50 text-slate-600 border-slate-200',
  connect: 'bg-slate-50 text-slate-600 border-slate-200',
  info: 'bg-gray-50 text-gray-600 border-gray-200',
};

const severityStyles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  neutral: 'border-gray-200 bg-gray-50 text-gray-700',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function Pill({ ok, label }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
      ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
    )}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function Panel({ children, className = '' }) {
  return <section className={cn('rounded-lg border border-gray-200 bg-white', className)}>{children}</section>;
}

function Stat({ label, value, detail, tone = 'gray', icon: Icon = Activity }) {
  const tones = {
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return (
    <div className={cn('rounded-lg border p-4', tones[tone] || tones.gray)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <Icon className="h-5 w-5 opacity-70" />
      </div>
      {detail && <p className="mt-2 text-xs opacity-80">{detail}</p>}
    </div>
  );
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-800"
      aria-label={tp('Copier')}
      title={tp('Copier')}
    >
      {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function EventIcon({ severity }) {
  if (severity === 'success') return <CheckCircle2 className="h-4 w-4" />;
  if (severity === 'danger') return <XCircle className="h-4 w-4" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Terminal className="h-4 w-4" />;
}

function LogsTable({ events = [] }) {
  if (!events.length) {
    return (
      <div className="px-4 py-10 text-center">
        <Terminal className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">{tp('Aucun log a afficher')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">{tp('Etat')}</th>
            <th className="px-4 py-3">{tp('Ce qui s\'est passe')}</th>
            <th className="px-4 py-3">{tp('Trajet')}</th>
            <th className="px-4 py-3">{tp('Queue')}</th>
            <th className="px-4 py-3">{tp('Detail technique')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {events.map((event, index) => (
            <tr key={`${event.id}-${index}`} className="align-top hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  severityStyles[event.severity] || eventStyles[event.type] || eventStyles.info
                )}>
                  <EventIcon severity={event.severity} />
                  {event.label || event.type || tp('Info')}
                </span>
              </td>
              <td className="min-w-[320px] px-4 py-3">
                <p className="font-semibold text-gray-900">{event.title || tp('Information technique')}</p>
                <p className="mt-1 text-sm leading-5 text-gray-600">{event.summary || event.message}</p>
                {event.action && (
                  <p className="mt-2 rounded-lg bg-gray-50 px-2.5 py-2 text-xs font-medium leading-5 text-gray-700">
                    A faire : {event.action}
                  </p>
                )}
              </td>
              <td className="min-w-[220px] px-4 py-3 text-xs text-gray-600">
                <p><span className="font-semibold text-gray-500">{tp('De :')}</span> {event.from || event.saslUser || '-'}</p>
                <p className="mt-1"><span className="font-semibold text-gray-500">{tp('Vers :')}</span> {event.to || '-'}</p>
                <p className="mt-1 text-gray-400">{formatDate(event.timestamp)}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{event.queueId || '-'}</td>
              <td className="min-w-[360px] px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className={cn(
                    'mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                    eventStyles[event.type] || eventStyles.info
                  )}>
                    {event.type || 'info'}
                  </span>
                  <p className="font-mono text-xs leading-5 text-gray-600">{event.message}</p>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SendsTable({ entries = [] }) {
  if (!entries.length) {
    return (
      <div className="px-4 py-10 text-center">
        <Send className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm font-medium text-gray-600">{tp('Aucun envoi journalise pour le moment')}</p>
        <p className="mt-1 text-xs text-gray-400">{tp('Chaque email envoye par l\'application apparaitra ici (OTP, notifications, campagnes...).')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">{tp('Statut')}</th>
            <th className="px-4 py-3">{tp('Destinataire')}</th>
            <th className="px-4 py-3">{tp('Sujet')}</th>
            <th className="px-4 py-3">{tp('Origine')}</th>
            <th className="px-4 py-3">{tp('Queue')}</th>
            <th className="px-4 py-3">{tp('Reponse SMTP')}</th>
            <th className="px-4 py-3">{tp('Date')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => (
            <tr key={entry.id} className="align-top hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
                  entry.status === 'sent' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'
                )}>
                  {entry.status === 'sent' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {entry.status === 'sent' ? 'Envoye' : tp('Echec')}
                </span>
                {entry.durationMs > 0 && <p className="mt-1 text-[11px] text-gray-400">{entry.durationMs} ms</p>}
              </td>
              <td className="min-w-[180px] px-4 py-3">
                <p className="font-semibold text-gray-900">{entry.to}</p>
                <p className="mt-0.5 text-xs text-gray-400">{entry.from}</p>
              </td>
              <td className="min-w-[220px] max-w-[320px] px-4 py-3 text-gray-700">
                <p className="line-clamp-2">{entry.subject || '(sans sujet)'}</p>
                {entry.meta?.campaignName && (
                  <p className="mt-0.5 text-xs text-gray-400">Campagne : {entry.meta.campaignName}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                  {sendSourceLabels[entry.source] || entry.source}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">{entry.queueId || '-'}</td>
              <td className="min-w-[240px] max-w-[360px] px-4 py-3">
                {entry.error ? (
                  <p className="font-mono text-xs leading-5 text-red-600">{entry.error}</p>
                ) : (
                  <p className="font-mono text-xs leading-5 text-gray-500">{entry.smtpResponse || '-'}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatDate(entry.sentAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SuperAdminMailServer() {
  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [rawLogs, setRawLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [logFilter, setLogFilter] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [sends, setSends] = useState([]);
  const [sendsMeta, setSendsMeta] = useState(null);
  const [sendsStatus, setSendsStatus] = useState('');
  const [sendsQuery, setSendsQuery] = useState('');

  const fetchOverview = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await ecomApi.get('/super-admin/mail-server/overview', {
        params: { _fresh: Date.now() },
        _bypassCache: true,
      });
      const data = res.data?.data || {};
      setOverview(data);
      setLogs(data.logs || []);
      setRawLogs('');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Impossible de charger le monitoring mail');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setActionLoading('logs');
    setError('');
    try {
      const res = await ecomApi.get('/super-admin/mail-server/logs', {
        params: { lines: 500, filter: logFilter, _fresh: Date.now() },
        _bypassCache: true,
      });
      setLogs(res.data?.data?.events || []);
      setRawLogs(res.data?.data?.raw || '');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Impossible de charger les logs');
    } finally {
      setActionLoading('');
    }
  }, [logFilter]);

  const fetchSends = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setActionLoading('sends');
    try {
      const res = await ecomApi.get('/super-admin/mail-server/sends', {
        params: { limit: 150, status: sendsStatus || undefined, q: sendsQuery || undefined, _fresh: Date.now() },
        _bypassCache: true,
      });
      const data = res.data?.data || {};
      setSends(data.entries || []);
      setSendsMeta({ total: data.total || 0, stats24h: data.stats24h || {}, minSendGapMs: data.minSendGapMs || 0 });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Impossible de charger le journal des envois');
    } finally {
      if (!silent) setActionLoading('');
    }
  }, [sendsStatus, sendsQuery]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'sends') fetchSends();
  }, [activeTab, fetchSends]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(() => {
      fetchOverview({ silent: true });
      if (activeTab === 'sends') fetchSends({ silent: true });
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchOverview, fetchSends, activeTab]);

  const dnsChecks = overview?.dns?.checks || {};
  const servicesOk = useMemo(() => (overview?.services || []).every((service) => service.ok), [overview?.services]);
  const mailPorts = useMemo(() => (overview?.ports?.ports || []).filter((port) => port.mail), [overview?.ports?.ports]);
  const dnsOkCount = Object.values(dnsChecks).filter(Boolean).length;
  const dnsTotal = Object.keys(dnsChecks).length || 6;

  const runAction = async (kind) => {
    setActionLoading(kind);
    setNotice('');
    setError('');
    try {
      if (kind === 'flush') {
        await ecomApi.post('/super-admin/mail-server/queue/flush');
        setNotice('Queue relancee.');
      }
      if (kind === 'reload') {
        await ecomApi.post('/super-admin/mail-server/services/reload');
        setNotice('Services mail recharges.');
      }
      await fetchOverview({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Action impossible');
    } finally {
      setActionLoading('');
    }
  };

  const sendTest = async (event) => {
    event.preventDefault();
    setActionLoading('test');
    setError('');
    setNotice('');
    setTestOutput('');
    try {
      const res = await ecomApi.post('/super-admin/mail-server/test-send', { to: testEmail.trim() });
      setNotice('Test SMTP lance. Verifie le statut dans les logs.');
      setTestOutput(res.data?.data?.output || '');
      await fetchOverview({ silent: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Test SMTP echoue');
      setTestOutput(err?.response?.data?.data?.output || '');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gray-900 text-white">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-950">{tp('Serveur mail Scalor')}</h1>
              <p className="text-sm text-gray-500">{tp('SMTP transactionnel, DKIM, queue, logs et diagnostics DNS.')}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAutoRefresh((value) => !value)}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition',
              autoRefresh ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            <Clock3 className="h-4 w-4" />
            {tp('Auto 15s')}
          </button>
          <button
            type="button"
            onClick={() => fetchOverview()}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            {tp('Rafraichir')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Services" value={servicesOk ? 'OK' : 'A verifier'} detail={`${overview?.services?.length || 0} services suivis`} tone={servicesOk ? 'green' : 'red'} icon={Server} />
        <Stat label="Ports mail" value={mailPorts.length} detail="25 et 587 attendus" tone={mailPorts.length >= 2 ? 'green' : 'amber'} icon={Activity} />
        <Stat label="Queue" value={overview?.queue?.count || 0} detail={overview?.queue?.empty ? 'Aucun mail en attente' : tp('Mails en attente')} tone={overview?.queue?.count ? 'amber' : 'green'} icon={Inbox} />
        <Stat label="DNS" value={`${dnsOkCount}/${dnsTotal}`} detail="Cloudflare / PTR / DKIM" tone={dnsOkCount === dnsTotal ? 'green' : 'amber'} icon={ShieldCheck} />
      </div>

      <div className="mb-5 overflow-x-auto">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:min-w-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition',
                  activeTab === tab.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading && !overview ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-3 text-sm font-medium text-gray-600">{tp('Chargement du monitoring mail...')}</p>
        </div>
      ) : null}

      {!loading && overview && activeTab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Panel>
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-900">{tp('Etat des services')}</h2>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                {(overview.services || []).map((service) => (
                  <div key={service.name} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm font-semibold text-gray-900">{service.name}</p>
                      <Pill ok={service.ok} label={service.active} />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">enabled: {service.enabled}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="font-semibold text-gray-900">{tp('Derniers evenements mail expliques')}</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {tp('Voir tous les logs')}
                </button>
              </div>
              <LogsTable events={(overview.logs || []).slice(0, 12)} />
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel>
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-900">{tp('Configuration SMTP app')}</h2>
              </div>
              <div className="space-y-3 p-4 text-sm">
                {[
                  ['host', overview.smtp?.host],
                  ['port', overview.smtp?.port],
                  ['secure', String(overview.smtp?.secure)],
                  ['requireTLS', 'true'],
                  ['user', overview.smtp?.user],
                  ['from', overview.smtp?.from],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2">
                    <span className="font-mono text-xs text-gray-500">{key}</span>
                    <span className="truncate font-mono text-xs font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {tp('Le mot de passe reste masque. Il est stocke en root-only sur le VPS.')}
                </div>
              </div>
            </Panel>

            <Panel>
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-900">{tp('Actions rapides')}</h2>
              </div>
              <div className="grid gap-2 p-4">
                <button
                  type="button"
                  onClick={() => runAction('flush')}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <Play className="h-4 w-4" />
                  {tp('Relancer la queue')}
                </button>
                <button
                  type="button"
                  onClick={() => runAction('reload')}
                  disabled={Boolean(actionLoading)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  {tp('Recharger mail services')}
                </button>
              </div>
            </Panel>

            <Panel>
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-900">{tp('Queue actuelle')}</h2>
              </div>
              <div className="p-4">
                {overview.queue?.empty ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                    {tp('Queue vide')}
                  </div>
                ) : (
                  <pre className="max-h-64 overflow-auto rounded-lg bg-gray-950 p-3 text-xs text-gray-100">{overview.queue?.raw}</pre>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === 'sends' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Envoyes (24h)" value={sendsMeta?.stats24h?.sent ?? 0} detail="Acceptes par le SMTP" tone="green" icon={Send} />
            <Stat label="Echecs (24h)" value={sendsMeta?.stats24h?.failed ?? 0} detail="Refus ou erreur SMTP" tone={(sendsMeta?.stats24h?.failed || 0) > 0 ? 'red' : 'gray'} icon={XCircle} />
            <Stat label="Total journalise" value={sendsMeta?.total ?? 0} detail="Depuis l'activation du journal" tone="blue" icon={FileText} />
            <Stat label="Ecart entre 2 mails" value={`${((sendsMeta?.minSendGapMs ?? 0) / 1000).toFixed(1)}s`} detail="SMTP_MIN_SEND_GAP_MS" tone="gray" icon={Clock3} />
          </div>
          <Panel>
            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{tp('Journal des envois de l\'application')}</h2>
                <p className="text-xs text-gray-500">{tp('Chaque email envoye par Scalor (OTP, notifications, campagnes) avec son ID de queue Postfix — croisable avec l\'onglet Logs.')}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={sendsStatus}
                  onChange={(e) => setSendsStatus(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-400"
                >
                  <option value="">{tp('Tous statuts')}</option>
                  <option value="sent">{tp('Envoyes')}</option>
                  <option value="failed">{tp('Echecs')}</option>
                </select>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={sendsQuery}
                    onChange={(e) => setSendsQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchSends(); }}
                    placeholder={tp('Email, sujet, queue ID...')}
                    className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-gray-400 sm:w-64"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fetchSends()}
                  disabled={actionLoading === 'sends'}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
                >
                  <RefreshCw className={cn('h-4 w-4', actionLoading === 'sends' && 'animate-spin')} />
                  {tp('Charger')}
                </button>
              </div>
            </div>
            <SendsTable entries={sends} />
          </Panel>
        </div>
      )}

      {overview && activeTab === 'logs' && (
        <div className="space-y-4">
          <Panel>
            <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{tp('Logs Postfix / OpenDKIM')}</h2>
                <p className="text-xs text-gray-500">{tp('Chaque ligne est traduite en langage simple. Le detail technique reste disponible pour tracer un ID de queue.')}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value)}
                    placeholder={tp('Filtrer: bounced, gmail, smtpuser...')}
                    className="h-10 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-gray-400 sm:w-72"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={actionLoading === 'logs'}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
                >
                  <RefreshCw className={cn('h-4 w-4', actionLoading === 'logs' && 'animate-spin')} />
                  {tp('Charger')}
                </button>
              </div>
            </div>
            <LogsTable events={logs} />
          </Panel>
          {rawLogs && (
            <Panel>
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <h2 className="font-semibold text-gray-900">{tp('Log brut')}</h2>
                <CopyButton value={rawLogs} />
              </div>
              <pre className="max-h-[480px] overflow-auto bg-gray-950 p-4 text-xs leading-5 text-gray-100">{rawLogs}</pre>
            </Panel>
          )}
        </div>
      )}

      {overview && activeTab === 'mailbox' && (
        <Panel>
          <div className="border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold text-gray-900">{tp('Mails locaux recus')}</h2>
            <p className="text-xs text-gray-500">Lecture de `/var/mail/root`. Les emails transactionnels sortants ne sont pas stockes ici sauf livraison locale ou bounce.</p>
          </div>
          {(overview.mailbox || []).length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-medium text-gray-600">{tp('Aucun mail local trouve')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {overview.mailbox.map((message) => (
                <div key={message.id} className="p-4 hover:bg-gray-50">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{message.subject}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        De {message.from || '-'} vers {message.to || '-'} · {message.date || '-'}
                      </p>
                      {message.preview && <p className="mt-2 text-sm leading-6 text-gray-600">{message.preview}</p>}
                    </div>
                    {message.dkimSigned && <Pill ok label="DKIM signe" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {overview && activeTab === 'dns' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          <Panel>
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{tp('Etat DNS public')}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                ['A mail.scalor.net', overview.dns?.mailA?.join(', ') || '-', dnsChecks.mailA, `attendu: ${overview.serverIp}`],
                ['AAAA mail.scalor.net', overview.dns?.mailAaaa?.join(', ') || 'aucun', dnsChecks.mailAaaa, 'attendu: aucun AAAA'],
                ['SPF unique', overview.dns?.spf?.join(' | ') || '-', dnsChecks.spfSingle, 'un seul TXT v=spf1'],
                ['DMARC unique', overview.dns?.dmarc?.join(' | ') || '-', dnsChecks.dmarcSingle, 'un seul TXT v=DMARC1'],
                ['DKIM', overview.dns?.dkim?.length ? 'publie' : 'absent', dnsChecks.dkimPresent, overview.dns?.expected?.dkimName],
                ['PTR reverse', overview.dns?.ptr?.join(', ') || '-', dnsChecks.ptr, `attendu: ${overview.hostname}`],
              ].map(([label, value, ok, expected]) => (
                <div key={label} className="flex flex-col gap-2 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="mt-1 break-all font-mono text-xs text-gray-600">{value}</p>
                    <p className="mt-1 text-xs text-gray-400">{expected}</p>
                  </div>
                  <Pill ok={Boolean(ok)} label={ok ? 'OK' : tp('A corriger')} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{tp('DKIM a copier')}</h2>
              <CopyButton value={overview.dkimRecord?.value || ''} />
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">{tp('Nom')}</p>
                <p className="mt-1 font-mono text-sm text-gray-900">{overview.dkimRecord?.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">{tp('Valeur TXT')}</p>
                <pre className="mt-1 max-h-80 overflow-auto rounded-lg bg-gray-950 p-3 text-xs leading-5 text-gray-100">{overview.dkimRecord?.value || tp('DKIM local introuvable')}</pre>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {overview && activeTab === 'config' && (
        <Panel>
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h2 className="font-semibold text-gray-900">{tp('Configuration Postfix active')}</h2>
              <p className="text-xs text-gray-500">Sortie de `postconf -n`.</p>
            </div>
            <CopyButton value={(overview.config || []).join('\n')} />
          </div>
          <pre className="max-h-[620px] overflow-auto bg-gray-950 p-4 text-xs leading-5 text-gray-100">
            {(overview.config || []).join('\n') || tp('Configuration indisponible')}
          </pre>
        </Panel>
      )}

      {overview && activeTab === 'test' && (
        <div className="grid gap-5 lg:grid-cols-[440px_1fr]">
          <Panel>
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{tp('Envoyer un mail de test')}</h2>
              <p className="text-xs text-gray-500">Utilise `smtpuser` en local sur le port 587 avec STARTTLS.</p>
            </div>
            <form onSubmit={sendTest} className="space-y-4 p-4">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700">{tp('Adresse destinataire')}</span>
                <input
                  type="email"
                  required
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder={tp('toi@example.com')}
                  className="mt-1 h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-400"
                />
              </label>
              <button
                type="submit"
                disabled={actionLoading === 'test'}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {actionLoading === 'test' ? 'Envoi...' : tp('Envoyer le test')}
              </button>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                Le test peut etre accepte par Postfix puis rejete par le fournisseur destinataire si les DNS publics ne sont pas encore corriges.
              </div>
            </form>
          </Panel>

          <Panel>
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="font-semibold text-gray-900">{tp('Resultat du test')}</h2>
            </div>
            {testOutput ? (
              <pre className="max-h-[520px] overflow-auto bg-gray-950 p-4 text-xs leading-5 text-gray-100">{testOutput}</pre>
            ) : (
              <div className="px-4 py-10 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm font-medium text-gray-600">{tp('Aucun test lance dans cette session')}</p>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
