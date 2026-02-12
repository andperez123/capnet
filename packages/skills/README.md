# Capnet Skill Pack

Cursor + Clawbot skill packs for Capnet. One install produces discoverable skills and working MCP configuration.

**Planned outputs:**

- **Cursor:** `.cursor/skills/capnet/`, `wakenet/`, `trustgraph/`, `settlement/`
- **Clawbot:** `openclaw/skills/capnet/`, `wakenet/`, `trustgraph/`, `settlement/`

**Orchestrator skill (capnet):** Routes when to call WakeNet vs TrustGraph vs Settlement; enforces trust gating before delegation/payment; emits standardized TrustGraph events after work.

Phase 2 deliverable: installer script + 4 skills + orchestrator with YAML frontmatter. See [docs/skills/](../../docs/skills/) when available.
