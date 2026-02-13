const { useKv, getSession, addAgent, appendActivity } = require('../lib/store');
const { parseSessionFromCookie } = require('../lib/session');
const { normalizeAgentId } = require('../lib/identity');
const { emitAgentRegistered } = require('../lib/trustgraph');

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
    return res.status(405).json({ error: 'Method not allowed' });
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

  const operatorId = session.operatorId;

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    let { agentId, skills = [] } = body;

    if (!agentId || typeof agentId !== 'string' || !agentId.trim()) {
      return res.status(400).json({ ok: false, error: 'agentId required' });
    }

    agentId = normalizeAgentId(agentId);
    if (!agentId) {
      return res.status(400).json({ ok: false, error: 'Invalid agentId format' });
    }

    const agent = await addAgent({
      agentId,
      operatorId,
      email: session.email,
      skills: Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map((s) => s.trim()).filter(Boolean) : []),
      activationStatus: 'registered',
    });

    await appendActivity(agentId, {
      type: 'agent_registered',
      message: 'Agent registered',
      source: 'operator',
    });

    await emitAgentRegistered(agentId, operatorId);

    return res.status(200).json({
      ok: true,
      agentId: agent.agentId,
      operatorId: agent.operatorId,
      activationStatus: 'registered',
      message: "Agent registered. You're in the network.",
      nextSteps: [
        'Add WakeNet feeds when available',
        'Emit TrustGraph events for outcomes',
        'Enable settlement when trust thresholds are met',
      ],
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
};
