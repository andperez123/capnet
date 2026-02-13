const { useKv, getSession, findAgent, agentBelongsToOperator } = require('../lib/store');
const { parseSessionFromCookie } = require('../lib/session');

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
  if (!agentId) {
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
    return res.status(404).json({ ok: false, error: 'Agent not found' });
  }

  const agent = await findAgent(agentId);
  if (!agent) {
    return res.status(404).json({ ok: false, error: 'Agent not found' });
  }

  return res.status(200).json({ ok: true, agent });
};
