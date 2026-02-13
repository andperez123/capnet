const { addJoinEvent, addOperator, addAgent, findOperatorByEmail } = require('../lib/store');
const { normalizeAgentId, normalizeOperatorId, assignOperatorId } = require('../lib/identity');

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    let { email, agentId, operatorId, skills = [], environment = 'dev', justUpdates } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Identity consistency (docs/identity.md): enforce namespace
    if (agentId != null && typeof agentId === 'string') {
      agentId = normalizeAgentId(agentId);
      if (!agentId) return res.status(400).json({ error: 'Invalid agentId format. Use agent:{namespace}:{id} or provide a valid id to normalize.' });
    }
    if (operatorId != null && typeof operatorId === 'string') {
      operatorId = normalizeOperatorId(operatorId);
      if (!operatorId) return res.status(400).json({ error: 'Invalid operatorId format. Use operator:{namespace}:{id}.' });
    }

    // Just waitlist (no agent registration)
    if (justUpdates === true || justUpdates === 'true' || (!agentId && !operatorId)) {
      await addJoinEvent(email);
      return res.status(200).json({
        ok: true,
        message: "You're on the list. We'll be in touch.",
      });
    }

    // Full join: operator + optional agent
    const op = await findOperatorByEmail(email);
    const finalOperatorId = operatorId || (op && op.operatorId) || assignOperatorId();
    if (!op) await addOperator({ operatorId: finalOperatorId, email });

    if (agentId) {
      await addAgent({
        agentId,
        operatorId: finalOperatorId,
        email,
        skills: Array.isArray(skills) ? skills : [],
        environment,
      });
    }

    return res.status(200).json({
      ok: true,
      operatorId: finalOperatorId,
      agentId: agentId || null,
      message: agentId ? "Agent registered. You're in the network." : "You're on the list.",
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
};
