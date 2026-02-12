# Capnet SDK

TypeScript client and shared types for WakeNet, TrustGraph, Settlement, and Capnet API. Use from agents, scripts, or other services.

- Types: `AgentId`, `SkillId`, `OperatorId`, `VerifierId`, event payloads (see [docs/identity.md](../../docs/identity.md) and [docs/taxonomy.md](../../docs/taxonomy.md))
- Clients: WakeNet (subscribe, deliver), TrustGraph (emit, query scores), Settlement (intent, release), Capnet API (waitlist, register, handshake)

Copy `.env.example` when integrating against hosted or local endpoints.
