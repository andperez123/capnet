/**
 * Store facade: uses Vercel KV (Upstash Redis) when KV_REST_API_URL is set,
 * otherwise in-memory (resets on cold start). All exports are async.
 * Console endpoints require useKv=true (return KV_REQUIRED otherwise).
 * Waitlist /api/join works in memory mode.
 */
const memory = require('./store-memory');

let kvStore = null;
function getKvStore() {
  if (kvStore) return kvStore;
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    kvStore = require('./store-kv');
    return kvStore;
  }
  return null;
}

function useKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function addOperator(operator) {
  const backend = getKvStore();
  return backend ? backend.addOperator(operator) : Promise.resolve(memory.addOperator(operator));
}

async function addAgent(agent) {
  const backend = getKvStore();
  return backend ? backend.addAgent(agent) : Promise.resolve(memory.addAgent(agent));
}

async function addJoinEvent(email) {
  const backend = getKvStore();
  return backend ? backend.addJoinEvent(email) : Promise.resolve(memory.addJoinEvent(email));
}

async function findAgent(agentId) {
  const backend = getKvStore();
  return backend ? backend.findAgent(agentId) : Promise.resolve(memory.findAgent(agentId));
}

async function findOperatorByEmail(email) {
  const backend = getKvStore();
  return backend ? backend.findOperatorByEmail(email) : Promise.resolve(memory.findOperatorByEmail(email));
}

async function getLeaderboard() {
  const backend = getKvStore();
  return backend ? backend.getLeaderboard() : Promise.resolve(memory.getLeaderboard());
}

async function createOrGetOperator(email) {
  const backend = getKvStore();
  return backend ? backend.createOrGetOperator(email) : Promise.resolve(memory.createOrGetOperator(email));
}

async function createSession(sessionId, operatorId, email) {
  const backend = getKvStore();
  return backend ? backend.createSession(sessionId, operatorId, email) : Promise.resolve(memory.createSession(sessionId, operatorId, email));
}

async function getSession(sessionId) {
  const backend = getKvStore();
  return backend ? backend.getSession(sessionId) : Promise.resolve(memory.getSession(sessionId));
}

async function addAgentToOperatorIndex(operatorId, agentId) {
  const backend = getKvStore();
  return backend ? backend.addAgentToOperatorIndex(operatorId, agentId) : Promise.resolve(memory.addAgentToOperatorIndex(operatorId, agentId));
}

async function getAgentIdsByOperator(operatorId) {
  const backend = getKvStore();
  return backend ? backend.getAgentIdsByOperator(operatorId) : Promise.resolve(memory.getAgentIdsByOperator(operatorId));
}

async function agentBelongsToOperator(operatorId, agentId) {
  const backend = getKvStore();
  return backend ? backend.agentBelongsToOperator(operatorId, agentId) : Promise.resolve(memory.agentBelongsToOperator(operatorId, agentId));
}

async function appendActivity(agentId, item) {
  const backend = getKvStore();
  return backend ? backend.appendActivity(agentId, item) : Promise.resolve(memory.appendActivity(agentId, item));
}

async function getActivity(agentId, limit) {
  const backend = getKvStore();
  return backend ? backend.getActivity(agentId, limit) : Promise.resolve(memory.getActivity(agentId, limit));
}

async function setTrustCache(agentId, window, value, ttlSec) {
  const backend = getKvStore();
  return backend ? backend.setTrustCache(agentId, window, value, ttlSec) : Promise.resolve(memory.setTrustCache(agentId, window, value, ttlSec));
}

async function getTrustCache(agentId, window) {
  const backend = getKvStore();
  return backend ? backend.getTrustCache(agentId, window) : Promise.resolve(memory.getTrustCache(agentId, window));
}

module.exports = {
  useKv,
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
