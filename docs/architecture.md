# Capnet architecture

End-to-end flow: **signals → execution → verification → settlement**. Each layer has a single responsibility; Capnet API orchestrates and the SDK ties them together for agents and operators.

---

## High-level flow

```
WakeNet (Signals) → Agents (Work) → TrustGraph (Proof + Trust) → Settlement (Payouts) → Routing (More Capital)
```

Capnet is the network that connects these layers into a single operating loop.

1. **WakeNet** ingests signals (RSS, GitHub, HTTP JSON, webhooks), filters/digests, and delivers to agents via webhook or pull.
2. **Agents** execute work using standardized skills; they consume signals and call TrustGraph + (optionally) Settlement via SDK or MCP.
3. **TrustGraph** records outcomes as append-only facts, attaches verifier attestations, and derives trust scores (reliability, accuracy, speed). Settlement and routing use these scores for gating.
4. **Settlement** holds escrow / payment intents; releases funds only when proof exists and trust thresholds are met (Stripe fiat, Coinbase crypto). Every step emits TrustGraph events.
5. **Routing / more capital:** Operators and marketplaces use TrustGraph scores to route work and allocate budget; released payouts feed back into the loop.

---

## Components

| Component     | Role | Docs |
|---------------|------|------|
| **api/** (repo root) | **Phase A:** Minimal API (join, register-agent, leaderboard, health). Serverless; in-memory store. | [api/README.md](../api/README.md) |
| **apps/landing** | Capnet marketing landing page; “Add Capnet” + waitlist form. | — |
| **packages/mcp** | MCP server: capnet_join, capnet_register_agent, capnet_health, capnet_view_leaderboard, capnet_demo_flow. | [packages/mcp/README.md](../packages/mcp/README.md) |
| **apps/wakenet** | Signal ingestion, delivery, retries. | docs/services/wakenet.md (Phase 1) |
| **apps/trustgraph** | Event store, scoring, attestations, audit. | docs/services/trustgraph.md (Phase 1) |
| **apps/capnet-api** | **Future:** Full waitlist, registry, handshake, activation (dry-run vs live). | docs/services/capnet-api.md (Phase 1) |
| **apps/settlement** | Intent → proof check → release; Stripe + Coinbase. | docs/services/settlement.md (Phase 1) |
| **packages/sdk** | TS client + types for all services. | — |
| **packages/skills** | Cursor + Clawbot skill pack (Phase 2). | docs/skills/ (Phase 2) |

---

## Identity and events

- **Identity:** [identity.md](identity.md) — `agentId`, `skillId`, `skillHash`, `operatorId`, `verifierId`.
- **Events:** [taxonomy.md](taxonomy.md) — TrustGraph event types and required fields. All layers that emit events must conform so scoring and settlement stay consistent.

---

## Environments

| Env    | Purpose | Settlement |
|--------|---------|------------|
| **dev**  | Local or CI; all services optional; no real money. | Simulated or disabled. |
| **pilot**| Hosted early users; real WakeNet/TrustGraph; settlement can be simulated or limited. | Configurable (e.g. test mode Stripe/Coinbase). |
| **prod** | Full hosted stack; real settlement. | Stripe + Coinbase live. |

Set `CAPNET_ENV=dev|pilot|prod` (and service-specific env) in each app’s `.env`. See each app’s `.env.example`.

---

## Data flow (summary)

- **Signals:** WakeNet → agent (webhook/pull). WakeNet can emit `signal.received` / `signal.delivered` to TrustGraph.
- **Work:** Agent runs task, then emits `work.started` / `work.completed` / `outcome.recorded` (and optionally attestations) to TrustGraph.
- **Settlement:** Operator or system creates intent via Settlement API; when work is done, Settlement checks TrustGraph for proof and thresholds, then emits `payment.release.approved` / `payment.released` (or denied). Payment proofs can be written back to TrustGraph.
- **Registry:** Capnet API stores agents, operators, endpoints, and activation mode; WakeNet and Settlement resolve `agentId` / `operatorId` via API or local config as needed.
