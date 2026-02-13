/**
 * Persistent store using Vercel KV (Upstash Redis).
 * Production schema per OPERATOR-CONSOLE-OUTLINE.md:
 *   capnet:operator:{operatorId}, capnet:operator:byemail:{email}
 *   capnet:operator:{operatorId}:agents (SET), capnet:agent:{agentId}
 *   capnet:activity:{agentId} (LIST), capnet:session:{sessionId}
 *   capnet:trustcache:{agentId}:{window}, capnet:agents:ids (SET)
 */
const { Redis } = require('@upstash/redis');

const PREFIX = 'capnet:';

function key(k) {
  return PREFIX + k;
}

function redis() {
  return new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });
}

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function addOperator(operator) {
  const r = redis();
  const email = String(operator.email || '').toLowerCase().trim();
  if (!email) return null;
  const record = {
    operatorId: operator.operatorId || null,
    email,
    createdAt: new Date().toISOString(),
    joinedAt: new Date().toISOString(), // backward compat
  };
  const existingId = await r.get(key('operator:byemail:' + email));
  if (existingId) {
    record.operatorId = existingId;
    await r.set(key('operator:' + existingId), JSON.stringify(record));
    return record;
  }
  const operatorId = record.operatorId || 'operator:praxis:' + nanoid();
  record.operatorId = operatorId;
  await r.set(key('operator:byemail:' + email), operatorId);
  await r.set(key('operator:' + operatorId), JSON.stringify(record));
  return record;
}

/** Create or get operator by email; returns { operatorId, email, createdAt } */
async function createOrGetOperator(email) {
  const r = redis();
  const norm = String(email || '').toLowerCase().trim();
  if (!norm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm)) return null;
  const existingId = await r.get(key('operator:byemail:' + norm));
  if (existingId) {
    const raw = await r.get(key('operator:' + existingId));
    const rec = raw ? JSON.parse(raw) : null;
    return rec ? { operatorId: rec.operatorId, email: rec.email, createdAt: rec.createdAt || rec.joinedAt } : null;
  }
  const operatorId = 'operator:praxis:' + nanoid();
  const record = { operatorId, email: norm, createdAt: new Date().toISOString() };
  await r.set(key('operator:byemail:' + norm), operatorId);
  await r.set(key('operator:' + operatorId), JSON.stringify({ ...record, joinedAt: record.createdAt }));
  return record;
}

async function createSession(sessionId, operatorId, email) {
  const r = redis();
  const data = { operatorId, email, createdAt: new Date().toISOString() };
  await r.set(key('session:' + sessionId), JSON.stringify(data), { ex: 60 * 60 * 24 * 7 }); // 7d TTL
  return data;
}

async function getSession(sessionId) {
  const r = redis();
  const raw = await r.get(key('session:' + sessionId));
  return raw ? JSON.parse(raw) : null;
}

async function addAgent(agent) {
  const r = redis();
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
  const existing = await r.get(key('agent:' + agent.agentId));
  if (existing) {
    const prev = JSON.parse(existing);
    record.earnings = prev.earnings ?? 0;
  }
  await r.set(key('agent:' + record.agentId), JSON.stringify(record));
  await r.sadd(key('operator:' + record.operatorId + ':agents'), record.agentId);
  await r.sadd(key('agents:all'), record.agentId);
  return record;
}

async function addAgentToOperatorIndex(operatorId, agentId) {
  const r = redis();
  await r.sadd(key('operator:' + operatorId + ':agents'), agentId);
  await r.sadd(key('agents:all'), agentId);
}

async function getAgentIdsByOperator(operatorId) {
  const r = redis();
  const members = await r.smembers(key('operator:' + operatorId + ':agents'));
  return Array.isArray(members) ? members : [];
}

async function agentBelongsToOperator(operatorId, agentId) {
  const r = redis();
  const ok = await r.sismember(key('operator:' + operatorId + ':agents'), agentId);
  return ok === 1;
}

async function appendActivity(agentId, item) {
  const r = redis();
  const entry = typeof item === 'string' ? JSON.stringify({ id: nanoid(), type: 'note', message: item, source: 'operator', timestamp: new Date().toISOString() }) : JSON.stringify({ id: item.id || nanoid(), type: item.type || 'note', message: item.message || '', source: item.source || 'operator', timestamp: item.timestamp || new Date().toISOString(), ...item });
  await r.lpush(key('activity:' + agentId), entry);
}

async function getActivity(agentId, limit = 50) {
  const r = redis();
  const raw = await r.lrange(key('activity:' + agentId), 0, limit - 1);
  return (raw || []).map((s) => {
    try {
      return JSON.parse(s);
    } catch {
      return { id: nanoid(), type: 'note', message: String(s), timestamp: new Date().toISOString() };
    }
  });
}

async function setTrustCache(agentId, window, value, ttlSec = 90) {
  const r = redis();
  await r.set(key('trustcache:' + agentId + ':' + window), JSON.stringify(value), { ex: ttlSec });
}

async function getTrustCache(agentId, window) {
  const r = redis();
  const raw = await r.get(key('trustcache:' + agentId + ':' + window));
  return raw ? JSON.parse(raw) : null;
}

async function addJoinEvent(email) {
  const r = redis();
  const record = { email, joinedAt: new Date().toISOString() };
  const listJson = await r.get(key('joinEvents'));
  const list = listJson ? JSON.parse(listJson) : [];
  list.push(record);
  await r.set(key('joinEvents'), JSON.stringify(list));
  return record;
}

async function findAgent(agentId) {
  const r = redis();
  const raw = await r.get(key('agent:' + agentId));
  return raw ? JSON.parse(raw) : null;
}

async function findOperatorByEmail(email) {
  const r = redis();
  const norm = String(email || '').toLowerCase();
  const operatorId = await r.get(key('operator:byemail:' + norm));
  if (!operatorId) return null;
  const raw = await r.get(key('operator:' + operatorId));
  const rec = raw ? JSON.parse(raw) : null;
  if (rec) return { ...rec, operatorId: rec.operatorId || operatorId };
  return null;
}

async function getLeaderboard() {
  const r = redis();
  let ids = await r.smembers(key('agents:all'));
  if (!ids || ids.length === 0) {
    const legacy = await r.get(key('agents:ids'));
    ids = legacy ? JSON.parse(legacy) : [];
  }
  const allIds = Array.isArray(ids) ? ids : [];
  const records = [];
  for (const id of allIds) {
    const raw = await r.get(key('agent:' + id));
    if (raw) records.push(JSON.parse(raw));
  }
  return records
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
