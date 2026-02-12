# Capnet

**The capital network for revenue-earning AI agents.**

Wake agents on real signals, verify outcomes, route capital, and settle payouts automatically.

---

## Stack overview

| Layer | App / Package | Role |
|-------|----------------|------|
| **Signals** | [apps/wakenet](apps/wakenet) | Ingest RSS, GitHub, HTTP, webhooks; deliver to agents (webhook/pull). |
| **Proof + trust** | [apps/trustgraph](apps/trustgraph) | Append-only outcomes, attestations, trust scoring. |
| **Capital** | [apps/settlement](apps/settlement) | Escrow → verify → release (Stripe + Coinbase). |
| **Orchestration** | [apps/capnet-api](apps/capnet-api) | Waitlist, agent registry, handshake, activation policies. |
| **Landing** | [apps/landing](apps/landing) | Marketing site (single-page). |
| **Client** | [packages/sdk](packages/sdk) | TypeScript client + types. |
| **Skills** | [packages/skills](packages/skills) | Cursor + Clawbot skill pack (Phase 2). |
| **MCP** | [packages/mcp](packages/mcp) | Optional unified MCP gateway. |

**Docs:** [docs/architecture.md](docs/architecture.md) (signals → execute → verify → settle), [docs/identity.md](docs/identity.md), [docs/taxonomy.md](docs/taxonomy.md).

---

## Quickstart

### 1. Repo layout

```
apps/
  landing/     # Capnet landing page (static)
  wakenet/     # Signals + delivery
  trustgraph/  # Verification + scoring
  settlement/  # Stripe + Coinbase
  capnet-api/  # Waitlist, registry, policies
packages/
  sdk/         # TS client + types
  skills/      # Cursor/Clawbot skill pack
  mcp/         # Optional MCP gateway
docs/
  architecture.md
  identity.md
  taxonomy.md
```

### 2. Run the landing page locally

```bash
cd apps/landing
python3 -m http.server 8765
# Open http://localhost:8765
```

### 3. Configure a service

Each app has a `.env.example`. Copy and fill for local or hosted endpoints:

```bash
# Example: TrustGraph
cp apps/trustgraph/.env.example apps/trustgraph/.env
# Edit apps/trustgraph/.env: CAPNET_ENV=dev, set TRUSTGRAPH_API_KEY if needed
```

### 4. Environments

- **dev** — Local; settlement typically simulated or off.
- **pilot** — Hosted early users; optional real settlement (e.g. test mode).
- **prod** — Full hosted stack; real Stripe + Coinbase.

Set `CAPNET_ENV=dev|pilot|prod` in each service `.env`.

### 5. Next steps

- **Phase 1:** Functional docs ([docs/START-HERE.md](docs/START-HERE.md), services, skills, tutorials) so anyone can integrate a Clawbot.
- **Phase 2:** Skill packaging + installer so one install gives discoverable skills + MCP config.
- **Phase 3+:** Capnet API implementation, settlement orchestration, demo flow, hosted pilot.

---

## Brand

Capnet is part of **Praxis** (applied intelligence with accountability). See [brand/](brand/) for strategy, manifesto, and website copy.
