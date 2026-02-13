/**
 * In-memory store. Used when no KV/DB is configured (e.g. local dev).
 * Resets on cold start in serverless. Mirrors store-kv schema (operator SET, activity LIST).
 */
const state = {
  operators: [],       // { operatorId, email, createdAt }
  operatorsByEmail: {}, // email -> operatorId
  operatorAgents: {},  // operatorId -> Set of agentIds
  agents: [],
  agentsAll: new Set(),
  joinEvents: [],
  sessions: {},        // sessionId -> { operatorId, email, createdAt }
  activity: {},        // agentId -> [items] (list, unshift for LPUSH)
  trustCache: {},      // "agentId:window" -> { value, expires }
};

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function addOperator(operator) {
  const email = String(operator.email || '').toLowerCase().trim();
  const existingId = state.operatorsByEmail[email];
  const record = {
    operatorId: existingId || operator.operatorId || 'operator:praxis:' + nanoid(),
    email,
    createdAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(),
  };
  if (existingId) {
    const i = state.operators.findIndex((o) => o.operatorId === existingId);
    if (i >= 0) state.operators[i] = record;
    return record;
  }
  state.operatorsByEmail[email] = record.operatorId;
  state.operators.push(record);
  state.operatorAgents[record.operatorId] = state.operatorAgents[record.operatorId] || new Set();
  return record;
}

function createOrGetOperator(email) {
  const norm = String(email || '').toLowerCase().trim();
  if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) return null;
  const existingId = state.operatorsByEmail[norm];
  if (existingId) {
    const op = state.operators.find((o) => o.operatorId === existingId);
    return op ? { operatorId: op.operatorId, email: op.email, createdAt: op.createdAt || op.joinedAt } : null;
  }
  const operatorId = 'operator:praxis:' + nanoid();
  const record = { operatorId, email: norm, createdAt: new Date().toISOString() };
  state.operatorsByEmail[norm] = operatorId;
  state.operators.push({ ...record, joinedAt: record.createdAt });
  state.operatorAgents[operatorId] = new Set();
  return record;
}

function createSession(sessionId, operatorId, email) {
  const data = { operatorId, email, createdAt: new Date().toISOString() };
  state.sessions[sessionId] = data;
  return data;
}

function getSession(sessionId) {
  return state.sessions[sessionId] || null;
}

function addAgent(agent) {
  const record = {
    agentId: agent.agentId,
    operatorId: agent.operatorId,
    email: agent.email,
    skills: Array.isArray(agent.skills) ? agent.skills : [],
    joinedAt: new Date().toISOString(),
    earnings: agent.earnings ?? 0,
    activationStatus: agent.activationStatus || 'registered',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const i = state.agents.findIndex((a) => a.agentId === agent.agentId);
  if (i >= 0) {
    record.earnings = state.agents[i].earnings ?? 0;
    state.agents[i] = record;
  } else {
    state.agents.push(record);
  }
  state.operatorAgents[record.operatorId] = state.operatorAgents[record.operatorId] || new Set();
  state.operatorAgents[record.operatorId].add(record.agentId);
  state.agentsAll.add(record.agentId);
  return record;
}

function addAgentToOperatorIndex(operatorId, agentId) {
  state.operatorAgents[operatorId] = state.operatorAgents[operatorId] || new Set();
  state.operatorAgents[operatorId].add(agentId);
  state.agentsAll.add(agentId);
}

function getAgentIdsByOperator(operatorId) {
  return Array.from(state.operatorAgents[operatorId] || []);
}

function agentBelongsToOperator(operatorId, agentId) {
  return (state.operatorAgents[operatorId] || new Set()).has(agentId);
}

function appendActivity(agentId, item) {
  state.activity[agentId] = state.activity[agentId] || [];
  const entry = typeof item === 'string'
    ? { id: nanoid(), type: 'note', message: item, source: 'operator', timestamp: new Date().toISOString() }
    : { id: item.id || nanoid(), type: item.type || 'note', message: item.message || '', source: item.source || 'operator', timestamp: item.timestamp || new Date().toISOString(), ...item };
  state.activity[agentId].unshift(entry);
}

function getActivity(agentId, limit = 50) {
  const list = state.activity[agentId] || [];
  return list.slice(0, limit);
}

function setTrustCache(agentId, window, value, ttlSec = 90) {
  state.trustCache[agentId + ':' + window] = { value, expires: Date.now() + ttlSec * 1000 };
}

function getTrustCache(agentId, window) {
  const cached = state.trustCache[agentId + ':' + window];
  if (!cached || Date.now() > cached.expires) return null;
  return cached.value;
}

function addJoinEvent(email) {
  const record = { email, joinedAt: new Date().toISOString() };
  state.joinEvents.push(record);
  return record;
}

function findAgent(agentId) {
  return state.agents.find((a) => a.agentId === agentId) || null;
}

function findOperatorByEmail(email) {
  const id = state.operatorsByEmail[String(email || '').toLowerCase()];
  if (!id) return null;
  return state.operators.find((o) => o.operatorId === id) || null;
}

function getLeaderboard() {
  return [...state.agents]
    .sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0))
    .slice(0, 50)
    .map((a) => ({
      agentId: a.agentId,
      operatorId: a.operatorId,
      earnings: a.earnings ?? 0,
      joinedAt: a.joinedAt,
    }));
}

module.exports = {
  addOperator,
  addAgent,
  addJoinEvent,
  findAgent,
  findOperatorByEmail,
  getLeaderboard,
  createOrGetOperator,
  createSession,
  getSession,
  addAgentToOperatorIndex,
  getAgentIdsByOperator,
  agentBelongsToOperator,
  appendActivity,
  getActivity,
  setTrustCache,
  getTrustCache,
};
