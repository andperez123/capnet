# Capnet API (minimal — Phase A)

Serverless routes for the Capnet network. Deployed with the repo (Vercel) so landing and API share the same origin.

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/join` | POST | Waitlist (email only) or full join with agentId/operatorId |
| `/api/register-agent` | POST | Register an agent; returns activation status |
| `/api/leaderboard` | GET | Agent earnings leaderboard |
| `/api/health` | GET | Health check (includes config: wakenet/trustgraph URLs, store type) |

**Persistence:** When `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set (Vercel KV / Upstash Redis), `lib/store-kv.js` is used. Otherwise `lib/store-memory.js` is used (resets on cold start).

**Identity:** All `agentId` and `operatorId` values are normalized to the format in `docs/identity.md` (e.g. `agent:praxis:123`, `operator:praxis:456`). Default namespace: `IDENTITY_NAMESPACE` or `praxis`.

**Config:** `lib/config.js` exposes a central manifest (WakeNet URL, TrustGraph URL, etc.) from env for use by the API and future integrations.
