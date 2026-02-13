const { getConfig } = require('../lib/config');
const { useKv } = require('../lib/store');
const { parseSessionFromCookie } = require('../lib/session');
const { getSession } = require('../lib/store');

const TIMEOUT_MS = 5000;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CAPNET_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const start = Date.now();
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(to);
    const latencyMs = Date.now() - start;
    return { ok: res.ok, status: res.status, latencyMs };
  } catch (e) {
    clearTimeout(to);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : String(e.message), latencyMs: Date.now() - start };
  }
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const config = getConfig();
  const verbose = req.query.verbose === '1' || req.query.verbose === 'true';
  let hasSession = false;
  if (verbose) {
    const cookieHeader = req.headers.cookie || req.headers.Cookie || '';
    const sessionId = parseSessionFromCookie(cookieHeader);
    if (sessionId && useKv()) {
      const session = await getSession(sessionId);
      hasSession = !!session;
    }
    if (!hasSession) {
      return res.status(401).json({ ok: false, error: 'Session required for verbose=1' });
    }
  }

  const checkedAt = new Date().toISOString();
  const services = {};

  // Capnet (this service)
  services.capnet = {
    status: useKv() ? 'ok' : 'degraded',
    latencyMs: 0,
    details: verbose ? { store: useKv() ? 'kv' : 'memory' } : {},
  };

  // TrustGraph
  if (config.trustgraph.url) {
    const tgRes = await fetchWithTimeout(
      config.trustgraph.url.replace(/\/$/, '') + '/health',
      {},
      TIMEOUT_MS
    );
    services.trustgraph = {
      status: tgRes.ok ? 'ok' : (tgRes.error === 'timeout' ? 'error' : 'error'),
      latencyMs: tgRes.latencyMs ?? null,
      details: verbose && config.trustgraph.url ? { url: config.trustgraph.url } : {},
    };
  } else {
    services.trustgraph = { status: 'off', latencyMs: null, details: {} };
  }

  // WakeNet
  if (config.wakenet.url) {
    const wnRes = await fetchWithTimeout(
      config.wakenet.url.replace(/\/$/, '') + '/health',
      {},
      TIMEOUT_MS
    );
    services.wakenet = {
      status: wnRes.ok ? 'ok' : (wnRes.error === 'timeout' ? 'stale' : 'error'),
      latencyMs: wnRes.latencyMs ?? null,
      details: verbose && config.wakenet.url ? { url: config.wakenet.url } : {},
    };
  } else {
    services.wakenet = { status: 'off', latencyMs: null, details: {} };
  }

  // Runtime (stub)
  services.runtime = { status: 'off', latencyMs: null, details: {} };

  // Settlement (stub)
  services.settlement = { status: 'stub', latencyMs: null, details: {} };

  const anyError = Object.values(services).some((s) => s.status === 'error' || s.status === 'stale');
  const anyOff = Object.values(services).every((s) => s.status === 'off' || s.status === 'stub');

  return res.status(200).json({
    ok: !anyError,
    checkedAt,
    services,
  });
};
