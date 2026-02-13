function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { getConfig } = require('../lib/config');
  const config = getConfig();

  return res.status(200).json({
    ok: true,
    service: 'capnet-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    config: {
      env: config.env,
      wakenet: config.wakenet.enabled ? { url: config.wakenet.url } : null,
      trustgraph: config.trustgraph.enabled ? { url: config.trustgraph.url } : null,
      store: config.store.useKv ? 'kv' : 'memory',
    },
  });
};
