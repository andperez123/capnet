const { createOrGetOperator, createSession, useKv } = require('../../lib/store');
const { setSessionCookie, createSessionId, parseSessionFromCookie } = require('../../lib/session');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.CAPNET_CORS_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const debug = req.query?.debug === '1' || req.query?.debug === 'true';

  if (!useKv()) {
    return res.status(503).json({ ok: false, error: 'KV_REQUIRED' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const email = (body.email || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, error: 'Valid email required' });
    }

    const operator = await createOrGetOperator(email);
    if (!operator) {
      return res.status(500).json({ ok: false, error: 'Failed to create operator' });
    }

    const sessionId = createSessionId();
    await createSession(sessionId, operator.operatorId, operator.email);
    setSessionCookie(res, sessionId);

    return res.status(200).json({
      ok: true,
      operatorId: operator.operatorId,
      email: operator.email,
      createdAt: operator.createdAt,
    });
  } catch (e) {
    console.error('[operator/session]', e.message || e);
    const msg = e.message || String(e);
    const msgLower = msg.toLowerCase();
    const hint =
      msgLower && (msgLower.includes('token') || msgLower.includes('auth') || msgLower.includes('403') || msgLower.includes('401') || msgLower.includes('upstash') || msgLower.includes('redis') || msgLower.includes('unauthorized'))
        ? ' Check KV_REST_API_TOKEN is the read-write token (not read-only) and env vars are set for Production.'
        : '';
    return res.status(500).json({
      ok: false,
      error: 'Server error.' + hint,
      ...(debug && msg && { debug: msg }),
    });
  }
};
