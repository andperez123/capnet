# Capnet API (full — Phase 3+)

**Future** orchestrator for waitlist, agent registry, handshake, activation policies, and routing to WakeNet / TrustGraph / Settlement.

- **Waitlist:** POST /waitlist, statuses (waitlisted → invited → integrated → active)
- **Agent registry:** identity, endpoints, owner, skills, environment
- **Handshake:** agent proves control of key, confirms webhook/pull config
- **Activation policies:** dry-run (WakeNet + TrustGraph only) vs live (settlement when trust thresholds met)

**Current minimal implementation:** The live API lives at repo root in [api/](../../api/) (join, register-agent, leaderboard, health) and is used by the [Capnet MCP server](../../packages/mcp/README.md). This app is the planned full service. See [docs/services/capnet-api.md](../../docs/services/capnet-api.md) when available. Copy env from `.env.example`.
