/**
 * Global environment manifest for the Capnet API.
 * Single source of truth for service URLs and feature flags.
 * Used by API routes and future WakeNet/TrustGraph integration.
 */
function getConfig() {
  return {
    env: process.env.CAPNET_ENV || 'dev',

    /** Capnet API (this service) */
    api: {
      baseUrl: process.env.CAPNET_API_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000',
    },

    /** WakeNet — live instance URL for signal ingestion and delivery */
    wakenet: {
      url: process.env.WAKENET_URL || '',
      apiKey: process.env.WAKENET_API_KEY || '',
      enabled: Boolean(process.env.WAKENET_URL),
    },

    /** TrustGraph — live instance URL for events and scoring */
    trustgraph: {
      url: process.env.TRUSTGRAPH_URL || '',
      apiKey: process.env.TRUSTGRAPH_API_KEY || '',
      webhookSecret: process.env.TRUSTGRAPH_WEBHOOK_SECRET || '',
      enabled: Boolean(process.env.TRUSTGRAPH_URL),
    },

    /** Settlement (future) */
    settlement: {
      url: process.env.SETTLEMENT_URL || '',
      apiKey: process.env.SETTLEMENT_API_KEY || '',
      enabled: Boolean(process.env.SETTLEMENT_URL),
    },

    /** Persistence */
    store: {
      useKv: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
    },

    /** Identity default namespace (docs/identity.md) */
    identity: {
      namespace: process.env.IDENTITY_NAMESPACE || 'praxis',
    },
  };
}

module.exports = { getConfig };
