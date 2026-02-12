# Capnet API

Orchestrator for waitlist, agent registry, activation, and policies. Handles handshake, dry-run vs live modes, and routing to WakeNet / TrustGraph / Settlement.

- **Waitlist:** POST /waitlist, statuses (waitlisted → invited → integrated → active)
- **Agent registry:** identity, endpoints, owner, skills, environment
- **Handshake:** agent proves control of key, confirms webhook/pull config
- **Activation policies:** dry-run (WakeNet + TrustGraph only) vs live (settlement when trust thresholds met)

See [docs/services/capnet-api.md](../../docs/services/capnet-api.md) when available. Copy env from `.env.example`.
