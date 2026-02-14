/**
 * TrustGraph event emission. Calls TrustGraph write endpoint when configured.
 * Events: capnet.agent.registered, capnet.agent.verified, capnet.console.verified
 */
const { getConfig } = require('./config');

const TIMEOUT_MS = 5000;

async function emitEvent(eventType, payload) {
  const config = getConfig();
  if (!config.trustgraph.url || !config.trustgraph.enabled) return { emitted: false, reason: 'not_configured' };

  const url = config.trustgraph.url.replace(/\/$/, '') + '/trust/webhooks/capnet';
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    ...payload,
  };
  const body = { events: [event] };
  const headers = {
    'Content-Type': 'application/json',
    ...(config.trustgraph.apiKey && { Authorization: `Bearer ${config.trustgraph.apiKey}` }),
    ...(config.trustgraph.webhookSecret && { 'X-Webhook-Secret': config.trustgraph.webhookSecret }),
  };
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(to);
    return { emitted: res.ok, status: res.status };
  } catch (e) {
    clearTimeout(to);
    return { emitted: false, error: e.name === 'AbortError' ? 'timeout' : String(e.message) };
  }
}

async function emitAgentRegistered(agentId, operatorId) {
  return emitEvent('capnet.agent.registered', { subject: agentId, source: operatorId });
}

async function emitAgentVerified(agentId, operatorId) {
  return emitEvent('capnet.agent.verified', { subject: agentId, source: operatorId });
}

async function emitConsoleVerified(operatorId) {
  return emitEvent('capnet.console.verified', { subject: operatorId });
}

module.exports = {
  emitEvent,
  emitAgentRegistered,
  emitAgentVerified,
  emitConsoleVerified,
};
