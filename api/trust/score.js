const {
  useKv,
  getSession,
  agentBelongsToOperator,
  getTrustCache,
  setTrustCache,
} = require('../../lib/store');
const { parseSessionFromCookie } = require('../../lib/session');
const { getConfig } = require('../../lib/config');

const TIMEOUT_MS = 5000;
const CACHE_TTL_SEC = 90;

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CAPNET_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!useKv()) {
    return res.status(503).json({ ok: false, error: 'KV_REQUIRED' });
  }

  const agentId = req.query.agentId || req.query.agentid;
  const window = req.query.window || '30d';

  if (!agentId || typeof agentId !== 'string') {
    return res.status(400).json({ ok: false, error: 'agentId required' });
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

  const belongs = await agentBelongsToOperator(session.operatorId, agentId);
  if (!belongs) {
    return res.status(403).json({ ok: false, error: 'Agent not owned' });
  }

  const config = getConfig();
  if (!config.trustgraph.url || !config.trustgraph.enabled) {
    return res.status(200).json({ ok: true, status: 'off' });
  }

  const cached = await getTrustCache(agentId, window);
  if (cached) {
    return res.status(200).json({ ok: true, ...cached, cached: true });
  }

  const base = config.trustgraph.url.replace(/\/$/, '');
  const encodedId = encodeURIComponent(agentId);
  const windowParam = encodeURIComponent(window);
  const start = Date.now();

  // TrustGraph: try /trust/agents/{id} then /agent/{id} (public profile returns composite + scores)
  const urlsToTry = [
    base + '/trust/agents/' + encodedId + '?window=' + windowParam,
    base + '/agent/' + encodedId + '?window=' + windowParam,
    base + '/score?agentId=' + encodedId + '&window=' + windowParam,
  ];

  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    let tgRes = null;
    let data = {};
    for (const url of urlsToTry) {
      tgRes = await fetch(url, {
        headers: config.trustgraph.apiKey ? { Authorization: `Bearer ${config.trustgraph.apiKey}` } : {},
        signal: controller.signal,
      });
      data = await tgRes.json().catch(() => ({}));
      if (tgRes.ok && (data.composite != null || data.score != null || data.value != null)) break;
    }
    clearTimeout(to);
    const latencyMs = Date.now() - start;

    const score = data.composite ?? data.score ?? data.value ?? null;
    const result = {
      status: tgRes && tgRes.ok ? 'ok' : 'error',
      score,
      updatedAt: data.lastVerified ?? data.updatedAt ?? new Date().toISOString(),
      latencyMs,
      checkedAt: new Date().toISOString(),
      ...(data.scores && { scores: data.scores }),
      ...(data.rank7d != null && { rank7d: data.rank7d }),
      ...(data.proofCount != null && { proofCount: data.proofCount }),
    };

    if (tgRes && tgRes.ok) {
      await setTrustCache(agentId, window, result, CACHE_TTL_SEC);
    }

    return res.status(200).json({ ok: true, ...result });
  } catch (e) {
    clearTimeout(to);
    const latencyMs = Date.now() - start;
    return res.status(200).json({
      ok: true,
      status: 'error',
      error: e.name === 'AbortError' ? 'timeout' : String(e.message),
      latencyMs,
      checkedAt: new Date().toISOString(),
    });
  }
};
