# Environment variables reference

All env vars for the **Capnet API + landing** (repo root / Vercel project). Set these in **Vercel → Project → Settings → Environment Variables** (or in root `.env` for local dev).

---

## Required for production (persistent data)

| Variable | Description | Where to get it |
|----------|-------------|------------------|
| **KV_REST_API_URL** | Upstash Redis REST API URL | Vercel Dashboard → Storage → KV (create store), or [Upstash](https://upstash.com) |
| **KV_REST_API_TOKEN** | Upstash Redis REST API token | Same as above |

Without these, the API uses in-memory storage and **data resets on every cold start** (leaderboard, waitlist, agents).

---

## Recommended for production

| Variable | Description | Example |
|----------|-------------|---------|
| **CAPNET_API_URL** | Canonical base URL of this API (used in health/config and by callers) | `https://capnet.work` |
| **CAPNET_ENV** | Environment label | `prod` (or `pilot` for staging) |

`VERCEL_URL` is set automatically by Vercel; if you use a custom domain, setting `CAPNET_API_URL=https://capnet.work` keeps responses and docs consistent.

---

## Optional (identity)

| Variable | Description | Default |
|----------|-------------|---------|
| **IDENTITY_NAMESPACE** | Default namespace for `agentId` / `operatorId` when normalizing (see docs/identity.md) | `praxis` |

Only set if you want a different default (e.g. `IDENTITY_NAMESPACE=mycompany`).

---

## Optional (future services)

Used by `lib/config.js` and future WakeNet/TrustGraph/Settlement integration. Not required for the current API to run.

| Variable | Description |
|----------|-------------|
| **WAKENET_URL** | Live WakeNet instance URL |
| **WAKENET_API_KEY** | API key for WakeNet (if required) |
| **TRUSTGRAPH_URL** | Live TrustGraph instance URL |
| **TRUSTGRAPH_API_KEY** | API key for TrustGraph (if required) |
| **SETTLEMENT_URL** | Settlement service URL (future) |
| **SETTLEMENT_API_KEY** | Settlement API key (future) |

Leave unset until those services exist. The health endpoint will show `wakenet` / `trustgraph` as disabled when URLs are not set.

---

## Set by Vercel (do not add manually)

| Variable | Description |
|----------|-------------|
| **VERCEL_URL** | Assigned deployment hostname (e.g. `capnet-xxx.vercel.app` or `capnet.work` when custom domain is set) |

Used as fallback for `api.baseUrl` when `CAPNET_API_URL` is not set.

---

## Minimal setup for capnet.work

**Required for persistent leaderboard/waitlist/agents:**

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

**Recommended:**

- `CAPNET_API_URL=https://capnet.work`
- `CAPNET_ENV=prod`

Everything else is optional until you add WakeNet, TrustGraph, or Settlement.
