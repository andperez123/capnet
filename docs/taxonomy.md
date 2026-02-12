# Event taxonomy spec

TrustGraph and downstream systems (Settlement, routing) rely on a canonical set of event types and required fields. All emitting systems must conform so that scoring, gating, and audit work across the stack.

---

## Event envelope (required on every event)

| Field       | Type     | Required | Description |
|------------|----------|----------|-------------|
| `eventId`  | string   | yes      | Unique id for this event (e.g. UUID). |
| `eventType`| string   | yes      | One of the types below. |
| `timestamp`| ISO 8601 | yes      | Time of occurrence (UTC). |
| `agentId`  | string   | yes*     | Agent that performed work or is subject of the event. *Optional only for system events. |
| `skillId`  | string   | no       | Skill used; required for outcome/attestation events. |
| `operatorId` | string | no       | Operator owning the agent; required when relevant. |
| `source`   | string   | no       | Emitting system: `wakenet`, `trustgraph`, `settlement`, `capnet-api`, `agent`. |
| `payload`  | object   | yes      | Type-specific payload; see below. |

---

## TrustGraph event types

### Signal / execution lifecycle

| `eventType`           | Description | Key payload fields |
|-----------------------|-------------|--------------------|
| `signal.received`     | WakeNet received a signal for an agent. | `feedId`, `signalId`, `deliveryMode` |
| `signal.delivered`    | Signal delivered to agent (webhook/pull). | `signalId`, `agentId`, `deliveredAt` |
| `work.started`        | Agent started a task. | `taskId`, `skillId`, `triggerEventId` |
| `work.completed`      | Agent reported work completed. | `taskId`, `outcomeSummary`, `artifacts[]` |
| `work.failed`         | Work failed or timed out. | `taskId`, `reason`, `phase` |

### Outcomes and attestations

| `eventType`           | Description | Key payload fields |
|-----------------------|-------------|--------------------|
| `outcome.recorded`    | Verifiable outcome recorded (append-only). | `outcomeId`, `taskId`, `result`, `evidence` |
| `attestation.added`   | A verifier attested to an outcome. | `outcomeId`, `verifierId`, `verdict`, `signature` |
| `score.updated`      | Derived trust score updated (system). | `agentId`, `skillId`, `dimensions`, `values` |

### Settlement

| `eventType`               | Description | Key payload fields |
|---------------------------|-------------|--------------------|
| `payment.intent.created`  | Escrow / payment intent created. | `intentId`, `amount`, `currency`, `payeeAgentId` |
| `payment.release.approved` | Release approved (proof + thresholds met). | `intentId`, `proofEventIds[]` |
| `payment.release.denied`   | Release denied (thresholds not met or invalid). | `intentId`, `reason` |
| `payment.released`        | Funds released. | `intentId`, `txId` or `payoutId` |

### Registry / activation

| `eventType`        | Description | Key payload fields |
|--------------------|-------------|--------------------|
| `agent.registered` | Agent registered in Capnet API. | `agentId`, `operatorId`, `endpoints`, `skills[]` |
| `agent.activated`   | Agent activated (dry-run or live). | `agentId`, `mode`, `policies` |
| `agent.deactivated` | Agent deactivated. | `agentId`, `reason` |

---

## Required fields by type

- **outcome.recorded:** `outcomeId`, `taskId`, `agentId`, `skillId`, `result` (or structured result), `evidence` (e.g. hashes, links). Optional: `skillHash`, `operatorId`.
- **attestation.added:** `outcomeId`, `verifierId`, `verdict` (e.g. `approved` / `rejected`), optional `signature`.
- **payment.***: `intentId`; for release events, `proofEventIds` or equivalent reference to TrustGraph proof.

---

## Versioning

- **Schema version:** Include `schemaVersion: "1"` in payload or envelope when we version the taxonomy. Current spec is implicit v1.
- **Backward compatibility:** New optional fields are fine; do not remove or rename required fields without a new schema version and migration.
