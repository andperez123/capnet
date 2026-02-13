/**
 * Identity consistency per docs/identity.md.
 * Enforces agentId and operatorId format: {type}:{namespace}:{id} or UUID.
 * Default namespace: IDENTITY_NAMESPACE env or "praxis".
 */
const DEFAULT_NAMESPACE = process.env.IDENTITY_NAMESPACE || 'praxis';

const AGENT_PREFIX = 'agent:';
const OPERATOR_PREFIX = 'operator:';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeIdSegment(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || 'id';
}

/**
 * Valid agentId: agent:{namespace}:{id} (namespace and id non-empty) or UUID.
 */
function validateAgentId(id) {
  if (!id || typeof id !== 'string') return false;
  const t = id.trim();
  if (UUID_REGEX.test(t)) return true;
  if (!t.startsWith(AGENT_PREFIX)) return false;
  const rest = t.slice(AGENT_PREFIX.length);
  const parts = rest.split(':');
  return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
}

/**
 * Valid operatorId: operator:{namespace}:{id} or UUID.
 */
function validateOperatorId(id) {
  if (!id || typeof id !== 'string') return false;
  const t = id.trim();
  if (UUID_REGEX.test(t)) return true;
  if (!t.startsWith(OPERATOR_PREFIX)) return false;
  const rest = t.slice(OPERATOR_PREFIX.length);
  const parts = rest.split(':');
  return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
}

/**
 * Normalize to canonical agentId: agent:{namespace}:{id}.
 * If input is already valid (agent:ns:id or UUID), return as-is.
 * Otherwise produce agent:{defaultNamespace}:{sanitizedId}.
 */
function normalizeAgentId(input) {
  if (!input || typeof input !== 'string') return null;
  const t = input.trim();
  if (!t) return null;
  if (validateAgentId(t)) return t;
  const id = safeIdSegment(t) || safeIdSegment(String(Date.now()));
  return `${AGENT_PREFIX}${DEFAULT_NAMESPACE}:${id}`;
}

/**
 * Normalize to canonical operatorId: operator:{namespace}:{id}.
 */
function normalizeOperatorId(input) {
  if (!input || typeof input !== 'string') return null;
  const t = input.trim();
  if (!t) return null;
  if (validateOperatorId(t)) return t;
  const id = safeIdSegment(t) || safeIdSegment(String(Date.now()));
  return `${OPERATOR_PREFIX}${DEFAULT_NAMESPACE}:${id}`;
}

function nanoid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Assign a new agentId with default namespace (when client does not send one).
 */
function assignAgentId() {
  return `${AGENT_PREFIX}${DEFAULT_NAMESPACE}:${nanoid()}`;
}

/**
 * Assign a new operatorId with default namespace.
 */
function assignOperatorId() {
  return `${OPERATOR_PREFIX}${DEFAULT_NAMESPACE}:${nanoid()}`;
}

module.exports = {
  validateAgentId,
  validateOperatorId,
  normalizeAgentId,
  normalizeOperatorId,
  assignAgentId,
  assignOperatorId,
  DEFAULT_NAMESPACE,
};
