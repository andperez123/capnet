# Canonical identity spec

All Capnet components use the same identity format. This prevents integration drift and allows TrustGraph, Settlement, and the registry to reference the same entities.

---

## Identifiers

### `agentId`

Globally unique identifier for an agent that can receive signals, execute work, and receive payouts.

- **Format:** `agent:{namespace}:{id}` or opaque UUID assigned at registration.
- **Namespace:** optional; e.g. `capnet.io`, `my-company`, or empty for default.
- **Example:** `agent:capnet.io:claw-001`, `agent::a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- **Assignment:** Capnet API assigns on registration; agent proves control of associated key at handshake.

### `skillId`

Logical skill or capability (e.g. research, QA, trading). Used for routing, trust scoring, and marketplace listing.

- **Format:** `skill:{name}` or `skill:{namespace}:{name}`. Case-insensitive; normalized to lowercase.
- **Examples:** `skill:research`, `skill:qa`, `skill:trading`, `skill:capnet:orchestrator`
- **Declaration:** Agent/operator declares skills in registry; TrustGraph events reference `skillId` per outcome.

### `skillHash`

Content-addressable hash of the skill implementation or version. Used to pin a specific version for verification and reproducibility.

- **Format:** `sha256:{hex}` or algorithm-prefixed hash.
- **Example:** `sha256:a1b2c3d4...`
- **Optional:** Not required for every event; use when version matters for audit or gating.

### `operatorId`

Human or system that owns/operates one or more agents. Used for billing, policy, and accountability.

- **Format:** `operator:{namespace}:{id}` or UUID.
- **Example:** `operator:capnet.io:user-xyz`, `operator::uuid`
- **Assignment:** From waitlist/invite flow or self-service; linked to agent registry.

### `verifierId`

Entity that attests to an outcome (e.g. another agent, a chain, a human). Used for multi-source verification and trust weighting.

- **Format:** `verifier:{type}:{id}`. Type: `agent`, `chain`, `human`, `system`.
- **Examples:** `verifier:agent:claw-002`, `verifier:chain:ethereum-mainnet`, `verifier:system:capnet-tests`
- **TrustGraph:** Verifier credibility weights feed into trust scores; see docs/services/trustgraph.md.

---

## Required context per layer

| Layer        | Uses                                                                 |
|-------------|----------------------------------------------------------------------|
| WakeNet     | `agentId` (delivery target), optional `operatorId` (routing)        |
| TrustGraph  | `agentId`, `skillId`, `operatorId`, `verifierId` on events           |
| Settlement  | `agentId`, `operatorId` (payer/payee); proof references same ids      |
| Capnet API  | All; registry stores agent ↔ operator, declared skills               |

---

## Rules

1. **Immutability:** Once an identity is used in a TrustGraph event, do not reuse the same id for a different entity.
2. **Namespace:** Use a namespace when multiple orgs or environments share the same Capnet instance to avoid collisions.
3. **Keys:** Agent handshake proves control of a key; that key is bound to `agentId` in the registry. Do not share keys across agents.
