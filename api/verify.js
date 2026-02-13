const { useKv, getSession, appendActivity, agentBelongsToOperator } = require('../lib/store');
const { parseSessionFromCookie } = require('../lib/session');
const { getConfig } = require('../lib/config');
const { emitAgentVerified } = require('../lib/trustgraph');

const TIMEOUT_MS = 5000;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CAPNET_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch (e) {
    clearTimeout(to);
    return { ok: false, error: e.name === 'AbortError' ? 'timeout' : String(e.message), latencyMs: Date.now() - start };
  }
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!useKv()) {
    return res.status(503).json({ ok: false, error: 'KV_REQUIRED' });
  }

  const cookieHeader = req.headers.cookie || req.headers.Cookie || '';
  const sessionId = parseSessionFromCookie(cookieHeader);
  if (!sessionId) {
    return res.status(401).json({ ok: false, error: 'Session required' });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired session' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const agentId = body.agentId;

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ ok: false, error: 'agentId required' });
  }

  const belongs = await agentBelongsToOperator(session.operatorId, agentId);
  if (!belongs) {
    return res.status(403).json({ ok: false, error: 'Agent not owned' });
  }

  const config = getConfig();
  const baseUrl = config.api.baseUrl || `https://${process.env.VERCEL_URL || 'localhost:3000'}`;

  const results = { capnet: { status: 'ok', latencyMs: 0 }, trustgraph: null };

  const statusRes = await fetchWithTimeout(baseUrl + '/api/status', {}, TIMEOUT_MS);
  results.capnet = { status: statusRes.ok ? 'ok' : 'error', latencyMs: statusRes.latencyMs };

  if (config.trustgraph.url) {
    const tgUrl = config.trustgraph.url.replace(/\/$/, '') + '/score?agentId=' + encodeURIComponent(agentId) + '&window=30d';
    const tgRes = await fetchWithTimeout(tgUrl, {
      headers: config.trustgraph.apiKey ? { Authorization: `Bearer ${config.trustgraph.apiKey}` } : {},
    }, TIMEOUT_MS);
    results.trustgraph = { status: tgRes.ok ? 'ok' : 'error', latencyMs: tgRes.latencyMs };
  } else {
    results.trustgraph = { status: 'off', latencyMs: null };
  }

  await appendActivity(agentId, {
    type: 'verify',
    message: 'Integration verified',
    source: 'operator',
    results,
  });

  await emitAgentVerified(agentId, session.operatorId);

  return res.status(200).json({
    ok: true,
    message: 'Verification complete',
    results,
  });
};
