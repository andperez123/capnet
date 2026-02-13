# Capnet / Praxis — Complete project summary

Everything that has been done in this project, in order.

---

## 1. Brand and strategy (Praxis)

**Location:** `brand/`

- **BRAND_STRATEGY.md** — Source of truth for Praxis/Capnet:
  - Core identity: Praxis = applied intelligence with accountability; brand anchor: “turns intelligence into action, proof, and revenue.”
  - Brand architecture: Praxis (umbrella) → WakeNet, TrustGraph, Praxis Settlement, Praxis Market, Praxis Studio (later).
  - What Praxis is / is not (infrastructure for autonomous work, not chatbot or prompt marketplace).
  - Three narrative phases: Builders → Markets → Society-scale.
  - Open source as brand strategy; monetization that reinforces brand; visual/tone (academic, industrial, minimal); long-term evolution (tool → platform → market → standard → institution); unifying promise.

- **MANIFESTO.md** — Open-source launch manifesto: “Intelligence is labor,” what we build, why it matters, stance (infrastructure first, trust open, agents as economic actors, builders own outcome), what we open source, who it’s for, long game.

- **TAGLINE_MATRIX.md** — Taglines by phase, product, and channel; anti-positioning; one-liner cheat sheet.

- **WEBSITE_COPY.md** — Full website arc: hero, shift, what Praxis is, stack, trust-open, for builders, long game, footer; optional governance section.

- **GOVERNANCE_PLACEHOLDER.md** — Scaffold for foundation vs. company (protocol stewardship vs. commercial operation, principles, next steps).

**Root README** was updated to position Praxis and point to `brand/`.

---

## 2. Capnet landing page (single-page)

**Location:** `apps/landing/` (canonical). Static HTML/CSS/JS.

- **index.html** — Single-page site with:
  - Header: logo, nav (How it works, Features, Use cases, Docs, Add Capnet, Waitlist).
  - Hero: “Capnet” title, tagline (“The capital network for revenue-earning AI agents”), description, CTAs (Add Capnet to Your Agent, Just Want Updates? Join the Waitlist, Integrate).
  - Value strip: Wake on signals (WakeNet), Prove outcomes (TrustGraph), Settle instantly (Stripe + Coinbase).
  - Problem: AI agents don’t operate like businesses (execution, outcomes, trust, payments).
  - Solution: Capnet turns agents into economic operators; signals → execution → verification → settlement.
  - How Capnet Works: 1 Wake, 2 Execute, 3 Verify, 4 Settle.
  - Architecture: WakeNet → Agents → TrustGraph → Settlement → Routing.
  - What You Build: revenue-earning agent companies, agent marketplace (competition-ready).
  - Core Features: WakeNet, TrustGraph, Settlement (cards + CTAs).
  - Use Cases: five bullets.
  - Open Source + Monetization: two-column open core.
  - Security: four bullets.
  - **Add Capnet to Your Agent** section: MCP install steps, `.cursor/mcp.json` example, repo link.
  - **Waitlist** section: email form (POST to `/api/join` with `justUpdates: true`), success/error message, link back to Add Capnet.

- **styles.css** — Full layout and typography: Instrument Serif + DM Sans, light palette, sticky header, sections, value strip, steps, architecture block, feature cards, waitlist form, responsive rules.

- **script.js** — Smooth scroll for in-page links; waitlist form submit via `fetch('/api/join', …)` with JSON body and inline success/error feedback.

Design: academic, industrial, minimal; no emojis or hype.

---

## 3. Phase 0 — Repo + standards

**Monorepo layout:**

- **apps/landing** — Capnet landing (see above).
- **apps/wakenet** — Placeholder README + `.env.example` (signals, delivery).
- **apps/trustgraph** — Placeholder README + `.env.example` (verification, scoring).
- **apps/settlement** — Placeholder README + `.env.example` (Stripe + Coinbase).
- **apps/capnet-api** — Placeholder README + `.env.example` (future full orchestrator); later clarified as “future” with current API in `api/`.
- **packages/sdk** — README + `.env.example` (TS client + types).
- **packages/skills** — README (Phase 2 skill pack).
- **packages/mcp** — MCP server (see below) + README + `.env.example`.

**Canonical identity spec:** `docs/identity.md`

- **agentId** — `agent:{namespace}:{id}` or UUID; assignment at registration.
- **skillId** — `skill:{name}`; routing and trust.
- **skillHash** — Content-addressable version (e.g. `sha256:…`).
- **operatorId** — Owner of agents; billing and policy.
- **verifierId** — `verifier:{type}:{id}` for attestations.
- Rules: immutability, namespace, keys.

**Event taxonomy spec:** `docs/taxonomy.md`

- Event envelope: `eventId`, `eventType`, `timestamp`, `agentId`, `skillId`, `operatorId`, `source`, `payload`.
- TrustGraph event types: signal lifecycle, outcomes/attestations, settlement, registry/activation.
- Required fields per type; schema versioning note.

**Architecture:** `docs/architecture.md`

- High-level flow: WakeNet → Agents → TrustGraph → Settlement → Routing.
- Components table (later updated to include `api/` and MCP).
- Identity and events (links to identity.md, taxonomy.md).
- Environments: dev, pilot, prod.
- Data flow summary.

**Root:** `package.json` (scripts: `build`, `landing:serve`), `.gitignore`, `vercel.json` (later set for build + output). Each app/package has `.env.example` where relevant.

---

## 4. Deploy to Vercel and GitHub

- **.gitignore** — node_modules, .env, build outputs, .vercel, logs, IDE, public/.
- **vercel.json** — `buildCommand: "npm run build"`, `outputDirectory: "public"`, `framework: null`.
- **package.json** — `"build": "mkdir -p public && cp -r apps/landing/* public/"` so one Vercel deploy serves static site from `public/` and serverless from `api/`.
- **Git:** repo initialized; all files committed; remote added (e.g. `https://github.com/andperez123/capnet.git`); pushed to `main`.
- **docs/DEPLOY.md** — Single canonical deploy path: deploy from repo root so landing + API share origin; Vercel setup; MCP `CAPNET_API_URL`; optional “landing only” noted.

---

## 5. MCP-first product (minimal API + MCP server)

**Minimal Capnet API** (repo root)

- **lib/store.js** — In-memory store: `operators`, `agents`, `joinEvents`; helpers `addOperator`, `addAgent`, `addJoinEvent`, `findAgent`, `findOperatorByEmail`, `getLeaderboard`. Resets on serverless cold start; intended to be replaced by KV/DB in production.
- **api/join.js** — POST `/api/join`: body `email` (required), optional `agentId`, `operatorId`, `skills`, `environment`, `justUpdates`. If `justUpdates` or email-only → add to waitlist. Else → add/update operator and optionally agent; return `operatorId`, `agentId`, message. CORS enabled.
- **api/register-agent.js** — POST `/api/register-agent`: body `agentId`, `email` (required), optional `operatorId`, `skills`, `environment`. Creates/updates agent; returns `activationStatus`, `nextSteps`. CORS enabled.
- **api/leaderboard.js** — GET `/api/leaderboard`: returns sorted list of agents (agentId, operatorId, earnings, joinedAt). CORS enabled.
- **api/health.js** — GET `/api/health`: returns `ok`, `service`, `version`, `timestamp`. CORS enabled.
- **api/README.md** — Table of routes and store note.

**MCP server** (`packages/mcp/`)

- **index.js** — Stdio JSON-RPC MCP server (no SDK). Reads JSON-RPC from stdin, responds on stdout. Handles `initialize`, `tools/list`, `tools/call`. Base URL from `CAPNET_API_URL` (default `https://capnet.vercel.app`).
- **Tools:**  
  - **capnet_join** — POST `/api/join` with email, optional agentId/operatorId/skills/environment/justUpdates.  
  - **capnet_register_agent** — POST `/api/register-agent` with agentId, email, optional operatorId/skills/environment.  
  - **capnet_health** — GET `/api/health`.  
  - **capnet_view_leaderboard** — GET `/api/leaderboard`; formats leaderboard text.  
  - **capnet_demo_flow** — Calls join, register-agent, leaderboard in sequence for a demo agent.
- **package.json** — `bin`: `capnet-mcp` → `index.js`; no external MCP SDK dependency.
- **packages/mcp/README.md** — Tools table, run instructions, Cursor MCP config example, env (`CAPNET_API_URL`), API routes used.

**Landing page updates**

- Hero primary CTA: “Add Capnet to Your Agent” → `#add-capnet`.
- Secondary: “Just Want Updates? Join the Waitlist” → `#waitlist`.
- New section **Add Capnet to Your Agent**: steps 1–3 (MCP config snippet, run from repo, tool names); CTAs (Clone repo, Join waitlist).
- New section **Waitlist**: form (email only), submit via JS to `POST /api/join` with `{ email, justUpdates: true }`; message element for success/error; “Building? Add Capnet to your agent instead.”
- Nav: “Add Capnet,” “Waitlist” links.
- Styles: `.mcp-install`, `.mcp-step`, `.mcp-code`, `.waitlist-form`, `.waitlist-input`, `.waitlist-message`.

---

## 6. Documentation overhaul

- **docs/README.md** — New doc index: “Where to start” (deploy, MCP, stack, identity/events), “Current implementation (Phase A)” (api/, MCP, landing), “Planned (Phase 1+).”
- **docs/START-HERE.md** — Short path: deploy → add MCP → use tools; links to DEPLOY, MCP README, and other docs.
- **docs/DEPLOY.md** — Unified to one deployment path (root, build, public, api); Vercel steps; MCP `CAPNET_API_URL`; optional “landing only” with caveat about form.
- **README.md** (root) — Reworked: stack table leads with Phase A API and MCP server; quickstart = deploy then add MCP; run landing locally; envs; next steps (Phase 1/2/3). Links to docs/README, architecture, identity, taxonomy, DEPLOY.
- **docs/architecture.md** — Components table updated: added `api/` and `packages/mcp` with docs links; marked `apps/capnet-api` as “Future.”
- **apps/capnet-api/README.md** — Clarified as future full service; pointed to `api/` and MCP README for current implementation.
- **packages/mcp/README.md** — Expanded from one paragraph to full tool list, run instructions, Cursor config, env table, API routes.

---

## 7. File and folder summary

| Path | Purpose |
|------|--------|
| **brand/** | BRAND_STRATEGY, MANIFESTO, TAGLINE_MATRIX, WEBSITE_COPY, GOVERNANCE_PLACEHOLDER |
| **apps/landing/** | index.html, styles.css, script.js — Capnet single-page + Add Capnet + waitlist form |
| **apps/wakenet/** | README, .env.example |
| **apps/trustgraph/** | README, .env.example |
| **apps/settlement/** | README, .env.example |
| **apps/capnet-api/** | README (future), .env.example |
| **api/** | join.js, register-agent.js, leaderboard.js, health.js, README |
| **lib/** | store.js (in-memory) |
| **packages/mcp/** | index.js, package.json, README, .env.example |
| **packages/sdk/** | README, .env.example |
| **packages/skills/** | README (Phase 2) |
| **docs/** | README (index), START-HERE, DEPLOY, architecture, identity, taxonomy, PROJECT-SUMMARY (this file) |
| **Root** | README.md, package.json, vercel.json, .gitignore |

---

## 8. What’s live vs planned

**Live (Phase A)**

- Landing page (with Add Capnet + waitlist).
- Minimal API: `/api/join`, `/api/register-agent`, `/api/leaderboard`, `/api/health`.
- MCP server with five tools; Cursor config documented.
- Single Vercel deploy (build → public; api/ as serverless).
- Repo on GitHub (e.g. andperez123/capnet); deploy and MCP docs aligned.

**Planned**

- Phase 1: docs/START-HERE expanded, docs/services/*, tutorials.
- Phase 2: Skill pack + installer (Cursor/Clawbot).
- Phase 3+: Full Capnet API in apps/capnet-api, WakeNet, TrustGraph, Settlement implementations, handshake, activation policies, real persistence (KV/DB).

---

## 9. Design and product decisions

- **Praxis** = umbrella brand; **Capnet** = product (capital network for revenue-earning agents).
- **MCP-first:** Entry is “Add Capnet to your agent” via MCP, not just a form; backend proves integration.
- **Single deploy:** Landing and API on same origin so waitlist form works without CORS.
- **Minimal API at root:** `api/` + `lib/` at repo root for Phase A; apps/capnet-api reserved for full orchestrator later.
- **In-memory store:** Acceptable for Phase A; documented replacement path (Vercel KV / DB).
- **Documentation:** One index (docs/README), one start path (START-HERE), one deploy path (DEPLOY), and READMEs aligned with what’s implemented.

---

*This summary reflects the state of the project as of the last update. For current “how to” steps, use [docs/README.md](README.md) and [START-HERE.md](START-HERE.md).*
