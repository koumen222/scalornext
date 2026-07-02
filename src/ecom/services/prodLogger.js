/**
 * PROD LOGGER — Système de log complet pour la production
 * Capture : API calls, auth, routing, erreurs, polling, actions utilisateur
 * Stocke dans localStorage (ring buffer 500 entrées) + console
 */

const MAX_ENTRIES = 500;
const LS_KEY = 'ecom_prod_logs';
const SESSION_KEY = 'ecom_session_id';

// Guard SSR (Next.js) : ce module est importé par du code rendu côté serveur,
// où sessionStorage/navigator/screen n'existent pas. Comportement navigateur inchangé.
const IS_BROWSER = typeof window !== 'undefined';

// Générer un ID de session unique par onglet
const SESSION_ID = (() => {
  if (!IS_BROWSER) return 'ssr';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
})();

// Infos contexte navigateur (collectées une fois)
const CTX = IS_BROWSER
  ? {
      ua: navigator.userAgent.slice(0, 80),
      lang: navigator.language,
      online: navigator.onLine,
      screen: `${screen.width}x${screen.height}`,
      session: SESSION_ID,
    }
  : { ua: 'ssr', lang: '', online: false, screen: '', session: SESSION_ID };

// ─── Stockage ────────────────────────────────────────────────────────────────

function readLogs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLogs(logs) {
  try {
    // Ring buffer : garder les MAX_ENTRIES dernières entrées
    const trimmed = logs.slice(-MAX_ENTRIES);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch (e) {
    // localStorage plein — vider la moitié et réessayer
    try {
      const half = logs.slice(-Math.floor(MAX_ENTRIES / 2));
      localStorage.setItem(LS_KEY, JSON.stringify(half));
    } catch {}
  }
}

function push(entry) {
  const logs = readLogs();
  logs.push({ ...CTX, ...entry, ts: new Date().toISOString() });
  writeLogs(logs);
}

// ─── Niveaux de log ──────────────────────────────────────────────────────────

const ICONS = {
  info:    '🔵',
  success: '✅',
  warn:    '⚠️',
  error:   '❌',
  api:     '🌐',
  auth:    '🔐',
  route:   '🗺️',
  poll:    '🔄',
  action:  '👆',
  perf:    '⏱️',
  proxy:   '🔀',
  token:   '🔑',
  ws:      '🏢',
  cache:   '📦',
  push:    '🔔',
  cors:    '🚫',
};

function log(level, category, message, data = {}) {
  const icon = ICONS[category] || ICONS[level] || '📝';
  const entry = { level, category, message, ...data };
  push(entry);

  // Toujours afficher en console en prod pour Railway/Cloudflare logs
  const prefix = `${icon} [PROD:${category.toUpperCase()}]`;
  if (level === 'error') {
    console.error(prefix, message, data);
  } else if (level === 'warn') {
    console.warn(prefix, message, data);
  } else {
    console.log(prefix, message, data);
  }
}

// ─── API Logs ─────────────────────────────────────────────────────────────────

export function logApiRequest(config) {
  const token = config.headers?.Authorization;
  log('info', 'api', `→ ${config.method?.toUpperCase()} ${config.url}`, {
    method: config.method?.toUpperCase(),
    url: config.url,
    params: config.params || {},
    hasToken: !!token,
    tokenPrefix: token ? token.slice(0, 20) + '…' : null,
    hasBody: !!(config.data && Object.keys(config.data || {}).length),
  });
}

export function logApiResponse(response) {
  const duration = response.config?._startTime
    ? Date.now() - response.config._startTime
    : null;
  log('success', 'api', `← ${response.status} ${response.config?.method?.toUpperCase()} ${response.config?.url}`, {
    status: response.status,
    url: response.config?.url,
    method: response.config?.method?.toUpperCase(),
    durationMs: duration,
    success: response.data?.success,
    dataKeys: response.data ? Object.keys(response.data) : [],
  });
}

export function logApiError(error) {
  const status = error.response?.status;
  const url = error.config?.url;
  const method = error.config?.method?.toUpperCase();
  const duration = error.config?._startTime
    ? Date.now() - error.config._startTime
    : null;

  const isCors = !error.response && error.message?.toLowerCase().includes('network');

  log('error', isCors ? 'cors' : 'api',
    `✗ ${status || 'NETWORK'} ${method} ${url} — ${error.message}`,
    {
      status,
      url,
      method,
      durationMs: duration,
      message: error.message,
      responseData: error.response?.data,
      isCors,
      isNetworkError: !error.response,
      isAuthError: status === 401,
      isForbidden: status === 403,
      isServerError: status >= 500,
    }
  );
}

// ─── Auth Logs ────────────────────────────────────────────────────────────────

export function logAuthEvent(event, data = {}) {
  const messages = {
    login_start:        'Tentative de connexion',
    login_success:      'Connexion réussie',
    login_failure:      'Échec de connexion',
    logout:             'Déconnexion',
    load_user_start:    'Chargement profil utilisateur',
    load_user_success:  'Profil chargé avec succès',
    load_user_failure:  'Échec chargement profil',
    load_user_network:  'Erreur réseau — session locale maintenue',
    token_refresh_start:'Refresh token en cours',
    token_refresh_ok:   'Token rafraîchi avec succès',
    token_refresh_fail: 'Refresh token échoué — déconnexion',
    token_found:        'Token trouvé dans localStorage',
    token_missing:      'Aucun token dans localStorage',
    token_saved:        'Token sauvegardé',
    impersonate_start:  'Incarnation démarrée',
    impersonate_stop:   'Incarnation arrêtée',
    register_device:    'Appareil enregistré',
    session_restored:   'Session restaurée depuis localStorage',
  };
  log('info', 'auth', messages[event] || event, { event, ...data });
}

// ─── Route Logs ───────────────────────────────────────────────────────────────

export function logRouteChange(from, to, user = null) {
  log('info', 'route', `Navigation: ${from} → ${to}`, {
    from,
    to,
    userRole: user?.role,
    userId: user?._id,
  });
}

export function logRouteGuard(path, reason, user = null) {
  log('warn', 'route', `Guard bloqué: ${path} — ${reason}`, {
    path,
    reason,
    userRole: user?.role,
    isAuthenticated: !!user,
  });
}

// ─── Polling Logs ─────────────────────────────────────────────────────────────

export function logPollStart(resource, intervalMs) {
  log('info', 'poll', `Polling démarré: ${resource} (${intervalMs}ms)`, { resource, intervalMs });
}

export function logPollTick(resource, result = {}) {
  log('info', 'poll', `Poll tick: ${resource}`, {
    resource,
    newItems: result.newItems ?? null,
    total: result.total ?? null,
  });
}

export function logPollStop(resource, reason) {
  log('warn', 'poll', `Polling arrêté: ${resource} — ${reason}`, { resource, reason });
}

export function logPollError(resource, error) {
  const status = error?.response?.status;
  log('error', 'poll', `Erreur poll: ${resource} — ${error?.message}`, {
    resource,
    status,
    message: error?.message,
    stopped: status >= 400 && status < 500,
  });
}

// ─── Action Logs ──────────────────────────────────────────────────────────────

export function logUserAction(action, data = {}) {
  log('info', 'action', action, data);
}

// ─── Performance Logs ─────────────────────────────────────────────────────────

export function logPerf(label, durationMs, data = {}) {
  const level = durationMs > 5000 ? 'error' : durationMs > 2000 ? 'warn' : 'info';
  log(level, 'perf', `${label}: ${durationMs}ms`, { label, durationMs, ...data });
}

// ─── Erreur globale ───────────────────────────────────────────────────────────

export function logGlobalError(message, source, lineno, colno, error) {
  log('error', 'error', `JS Error: ${message}`, {
    message,
    source,
    lineno,
    colno,
    stack: error?.stack?.slice(0, 500),
  });
}

export function logUnhandledRejection(reason) {
  log('error', 'error', `Unhandled Promise Rejection: ${reason?.message || reason}`, {
    message: reason?.message,
    stack: reason?.stack?.slice(0, 500),
  });
}

// ─── Proxy / CORS Logs ────────────────────────────────────────────────────────

export function logProxyInfo(url, origin) {
  log('info', 'proxy', `Proxy request: ${url}`, { url, origin });
}

// ─── Push Notification Logs ───────────────────────────────────────────────────

export function logPushEvent(event, data = {}) {
  log('info', 'push', `Push: ${event}`, { event, ...data });
}

// ─── Workspace Logs ───────────────────────────────────────────────────────────

export function logWorkspace(event, workspace = {}) {
  log('info', 'ws', `Workspace: ${event}`, {
    event,
    workspaceId: workspace._id || workspace.id,
    workspaceName: workspace.name,
  });
}

// ─── Cache Logs ───────────────────────────────────────────────────────────────

export function logCacheHit(key) {
  log('info', 'cache', `Cache HIT: ${key}`, { key });
}

export function logCacheMiss(key) {
  log('info', 'cache', `Cache MISS: ${key}`, { key });
}

// ─── Utilitaires publics ──────────────────────────────────────────────────────

/**
 * Exporter tous les logs en JSON (pour copier-coller depuis la console)
 */
export function exportLogs() {
  const logs = readLogs();
  const json = JSON.stringify(logs, null, 2);
  console.log('📋 EXPORT LOGS PROD (' + logs.length + ' entrées):\n' + json);
  return logs;
}

/**
 * Vider les logs
 */
export function clearLogs() {
  localStorage.removeItem(LS_KEY);
  console.log('🗑️ Logs prod vidés');
}

/**
 * Résumé rapide des logs (erreurs + dernières entrées)
 */
export function summarizeLogs() {
  const logs = readLogs();
  const errors = logs.filter(l => l.level === 'error');
  const last20 = logs.slice(-20);

  console.group('📊 RÉSUMÉ LOGS PROD');
  console.log(`Total: ${logs.length} entrées | Erreurs: ${errors.length}`);
  console.log('--- Dernières erreurs ---');
  errors.slice(-10).forEach(e => console.error(`[${e.ts}] ${e.category}: ${e.message}`, e));
  console.log('--- 20 dernières entrées ---');
  last20.forEach(e => console.log(`[${e.ts}] ${e.category}: ${e.message}`));
  console.groupEnd();

  return { total: logs.length, errors: errors.length, last20 };
}

/**
 * Filtrer les logs par catégorie
 */
export function filterLogs(category) {
  return readLogs().filter(l => l.category === category);
}

/**
 * Exposer globalement pour debug console navigateur
 */
if (typeof window !== 'undefined') {
  window.__prodLogs = {
    export: exportLogs,
    clear: clearLogs,
    summary: summarizeLogs,
    filter: filterLogs,
    raw: readLogs,
  };
}

// ─── Initialisation des listeners globaux ─────────────────────────────────────

if (typeof window !== 'undefined') {
  // Erreurs JS non catchées
  window.addEventListener('error', (e) => {
    logGlobalError(e.message, e.filename, e.lineno, e.colno, e.error);
  });

  // Promises rejetées non catchées
  window.addEventListener('unhandledrejection', (e) => {
    logUnhandledRejection(e.reason);
  });

  // Changements de connectivité
  window.addEventListener('online', () => {
    log('info', 'info', 'Connexion rétablie (online)', { online: true });
  });
  window.addEventListener('offline', () => {
    log('warn', 'warn', 'Connexion perdue (offline)', { online: false });
  });

  // Visibilité de la page (tab focus/blur)
  document.addEventListener('visibilitychange', () => {
    log('info', 'info', `Page visibility: ${document.visibilityState}`, {
      visibilityState: document.visibilityState,
    });
  });

  // Log initial de session
  log('info', 'info', '🚀 Session démarrée', {
    url: window.location.href,
    referrer: document.referrer || null,
    ...CTX,
  });
}

export default {
  logApiRequest,
  logApiResponse,
  logApiError,
  logAuthEvent,
  logRouteChange,
  logRouteGuard,
  logPollStart,
  logPollTick,
  logPollStop,
  logPollError,
  logUserAction,
  logPerf,
  logGlobalError,
  logProxyInfo,
  logPushEvent,
  logWorkspace,
  logCacheHit,
  logCacheMiss,
  exportLogs,
  clearLogs,
  summarizeLogs,
  filterLogs,
};
