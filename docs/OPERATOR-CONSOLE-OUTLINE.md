# Capnet Operator Console — Project outline

Phased implementation plan synthesizing the integration plan, Operator Console spec, and **production-directional requirements** (non-negotiable for launch). Use this as the roadmap before implementing.

---

## 0. Production requirements (non-negotiable)

These are required for production, not MVP-only. They prevent agent/score leakage, ensure scalable lookups, and make TrustGraph scores meaningful on day 1.

### 0.1 Operator identity + auth (cookie session)

- **Why:** Prevents agent/score leakage; stable scope for all future features.
- **Endpoints:**
  - `POST /api/operator/session` — body `{ email }`; creates/loads operator; sets **HttpOnly cookie** `capnet_session`.
  - `GET /api/operator/me` — returns `{ operatorId, email, createdAt }`; requires session.
- **Cookie attributes:** `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...`. If console is embedded cross-origin later, use `SameSite=None; Secure`. Same-origin deployment needs no CORS.
- **Rule:** All operator-scoped endpoints require a valid session. No `operatorId` in request body for register-agent; derive from session.

### 0.2 Design rule (extensibility)

**Every operator action and system action writes:**
1. An **activity log item** (Capnet KV).
2. A **TrustGraph event** (append-only proof).

This is the permanent spine for growth.

### 0.3 Operator → Agents index (no scans)

- **Why:** KV scans won't scale; need deterministic lookups forever.
- **Keys:**
  - `capnet:operator:{operatorId}` → JSON/hash (operator record).
  - `capnet:operator:byemail:{email}` → string (→ operatorId).
  - `capnet:operator:{operatorId}:agents` → Redis SET of agentIds.
  - `capnet:agent:{agentId}` → hash/JSON (agent record).
- **On register-agent:** SADD agentId to operator's SET; write agent record.

### 0.4 Activity feed as append-only log (Redis LIST)

- **Why:** Audit trail + future event ingestion (WakeNet/Runtime/Settlement).
- **Key:** `capnet:activity:{agentId}` → Redis LIST.
- **Writes:** LPUSH new items.
- **Reads:** LRANGE for pagination.

### 0.5 TrustGraph score proxy + caching

- **Endpoint:** `GET /api/trust/score?agentId=...&window=30d`
- **Behavior:** If TrustGraph not configured → `{ status: "off" }`. If configured → fetch with **hard timeout**; cache 30–120s in KV.
- **Auth:** Session required. **Enforce agent ownership** — operator must own agentId (SISMEMBER check); 403 if not. Prevents score leak.
- **Why:** Frontend shows scores; avoids CORS; protects keys server-side.

### 0.6 TrustGraph events on register/verify

- **Why:** Scores won't change without events. Every new agent must get a TrustGraph trail immediately.
- **Register:** emit `capnet.agent.registered`.
- **Verify (primary):** emit `capnet.agent.verified` (subject=agentId, source=operatorId) — agent-scoped, reproducible.
- **Verify (optional secondary):** emit `capnet.console.verified` (subject=operatorId).
- **Day 1 events:** `capnet.agent.registered`, `capnet.agent.verified`. Later: `runtime.job.completed`, `wakenet.signal.received`, `payment.intent.created`, etc.

### 0.7 Health/status aggregator with hard timeouts

- `GET /api/status` must return **quickly**. No hanging.
- **Timeouts:** Hard timeout per service (e.g. 3–5s); return partial results; include `checkedAt`, `latencyMs` per service.
- Status values: `off` (not configured), `ok`, `error`, `stale` (e.g. WakeNet feed status).

### 0.8 KV dependency (production-directional)

- **Console endpoints** (operator session, agents, activity, reports, verify, trust score) **require KV configured**. If KV missing → `{ ok: false, error: "KV_REQUIRED" }`. Memory fallback breaks production guarantees.
- **Waitlist** `POST /api/join` keeps working in memory mode (no KV required) for prospects.

---

## 1. Scope & placement

| Decision | Choice |
|----------|--------|
| **Placement** | Option B: Add `#console` section **after** `#waitlist` (keeps waitlist working) |
| **Section ID** | `#console` |
| **Nav** | Add "Console" to header + footer; fix broken "Docs" link |
| **Build** | Static HTML/CSS/JS only; no React/Next; `npm run build` unchanged |
| **Assets** | All new assets inside `apps/landing/` |

---

## 2. Non-negotiable endpoint set (to launch)

All of these must exist; operator-scoped endpoints require a valid session cookie.

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `POST /api/operator/session` | POST | — | Body `{ email }`; creates/loads operator; sets `capnet_session` cookie |
| `GET /api/operator/me` | GET | Session | Returns `{ operatorId, email, createdAt }` |
| `GET /api/status` | GET | — | Public; aggregated service status (hard timeouts). `?verbose=1` requires session (full details). |
| `POST /api/register-agent` | POST | Session | Body `{ agentId, skills? }`; no operatorId (from session); emits TrustGraph event. Omit `environment` unless used; if kept, validate enum `dev|pilot|prod` and default from `CAPNET_ENV`. |
| `GET /api/agents` | GET | Session | List operator's agents (from SET index) |
| `GET /api/agent?agentId=...` | GET | Session | Single agent detail |
| `GET /api/activity?agentId=...&limit=...` | GET | Session | Activity feed (LRANGE) |
| `POST /api/reports` | POST | Session | Body `{ agentId, message }`; appends activity + optional TrustGraph event |
| `POST /api/verify` | POST | Session | Body `{ agentId }`; pings status/TrustGraph; emits `capnet.agent.verified` (subject=agentId); LPUSH activity type="verify" with per-service results |
| `GET /api/trust/score?agentId=...&window=30d` | GET | Session | TrustGraph score proxy; **enforce agent ownership** (403 if not owner); cache 30–120s; `{ status: "off" }` if not configured |

---

## 3. Minimal live workflow (what happens at launch)

1. Operator visits `capnet.work#console`
2. Enters email → `POST /api/operator/session` (sets cookie)
3. Clicks "Add Agent"
4. Enters agentId + skills → `POST /api/register-agent`
   - Writes agent record
   - SADD to `capnet:operator:{operatorId}:agents`
   - LPUSH activity item "agent registered"
   - Emits TrustGraph event `capnet.agent.registered`
5. Console displays: agent in table, TrustGraph score (initial + updatedAt)
6. Operator clicks "Verify integration"
   - `POST /api/verify` body `{ agentId }`
   - Pings status + TrustGraph; writes activity type="verify" with per-service results
   - Emits TrustGraph event `capnet.agent.verified` (subject=agentId, source=operatorId)

---

## 4. Phases overview

| Phase | Scope | Outcome |
|-------|-------|---------|
| **Phase 0** | Fix Docs link; add `#console` shell + nav | Console section exists, navigable |
| **Phase 1** | Backend: auth, status, agents, activity, reports, TrustGraph proxy | All non-negotiable endpoints live |
| **Phase 2** | Console UI: session/login, status grid, agent signup | Operator signs in, sees status, registers agents |
| **Phase 3** | Console UI: agent list table | Operator sees their agents |
| **Phase 4** | Console UI: agent profile + verify button | Per-agent detail; "Verify integration" emits TrustGraph event |
| **Phase 5** | Polish: TrustGraph event ingestion, caching refinement | Production-ready |

---

## 5. Phase 0 — Shell + nav (no backend)

**Goal:** Add `#console` section and fix Docs; no data yet.

### Tasks

1. **Fix Docs link**  
   - Option A: Add lightweight `#docs` section (links to GitHub docs, START-HERE)  
   - Option B: Change nav "Docs" to external link (e.g. `https://github.com/andperez123/capnet/blob/main/docs/START-HERE.md`)

2. **Add Console nav**  
   - Header: add `<a href="#console">Console</a>`  
   - Footer: add same link  
   - Hero: optional third CTA "Operator Console" → `#console`

3. **Add `#console` section**  
   - Empty shell: `<section id="console" class="section">` with placeholder text ("Operator Console — Coming soon" or minimal structure)  
   - Uses `.wrap`, `.section-title`  
   - Place after `#waitlist`, before `</main>`

**Files:** `apps/landing/index.html`  
**Backend:** None  
**Compatibility:** Waitlist unchanged; build unchanged.

---

## 6. Phase 1 — Backend endpoints

**Goal:** Implement all non-negotiable endpoints. Session auth first; then status, agents, activity, reports, TrustGraph proxy.

### 1A. Operator auth (required)

| Endpoint | Method | Purpose | Implementation |
|----------|--------|---------|----------------|
| `POST /api/operator/session` | POST | Create/load operator; set session cookie | Body `{ email }`; lookup or create operator; set HttpOnly cookie `capnet_session` (signed token or session id); store session→operatorId in KV |
| `GET /api/operator/me` | GET | Current operator | Require cookie; return `{ operatorId, email, createdAt }` |

**Session:** Store `capnet:session:{sessionId}` → `{ operatorId, email, createdAt }`. Cookie value = sessionId. Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...` (7–30d). Cross-origin embedding: `SameSite=None; Secure`.

**Files:** `api/operator/session.js`, `api/operator/me.js`, `lib/session.js` (helpers for parse/validate cookie)

---

### 1B. Service status aggregation

| Endpoint | Method | Purpose | Implementation |
|----------|--------|---------|----------------|
| `GET /api/status` | GET | Aggregate status for all services | **Hard timeout** per service (e.g. 3–5s); **no hanging**; return partial results if some time out. Include `checkedAt`, `latencyMs` per service. Public by default; `?verbose=1` requires session (full details, internal URLs). |

**Response shape:** Use ISO now-time (`new Date().toISOString()`) for all timestamps; never hardcode historical dates.

```json
{
  "ok": true,
  "checkedAt": "<ISO now>",
  "services": {
    "capnet": { "status": "ok", "latencyMs": 0, "details": { "store": "kv" } },
    "trustgraph": { "status": "ok|off|error", "latencyMs": 42, "details": {} },
    "wakenet": { "status": "ok|stale|off|error", "latencyMs": null, "details": {} },
    "runtime": { "status": "ok|degraded|off|error", "latencyMs": null },
    "settlement": { "status": "stub|ok|off", "latencyMs": null }
  }
}
```

**Auth:** Public (unauthenticated) so prospects can see system health. When unauthenticated, redact internal URLs/details. Add `?verbose=1` — requires session; returns full details (URLs, store type, etc.).

**Files:** `api/status.js`

---

### 1C. Operator agent list (from SET index)

| Endpoint | Method | Auth | Purpose | Implementation |
|----------|--------|------|---------|----------------|
| `GET /api/agents` | GET | Session | List operator's agents | SMEMBERS `capnet:operator:{operatorId}:agents`; for each agentId, HGET/GET `capnet:agent:{agentId}`; return array. No scans. |

**Files:** `api/agents.js`, `lib/store-kv.js` (add `getAgentsByOperator`, `addAgentToOperatorIndex`)

---

### 1D. Single agent detail

| Endpoint | Method | Auth | Purpose | Implementation |
|----------|--------|------|---------|----------------|
| `GET /api/agent?agentId=...` | GET | Session | Get one agent | Fetch from `capnet:agent:{agentId}`; verify agent belongs to session's operatorId; 404 if not. |

**Files:** `api/agent.js`

---

### 1E. Activity + reports (Redis LIST)

| Endpoint | Method | Auth | Purpose | Implementation |
|----------|--------|------|---------|----------------|
| `GET /api/activity?agentId=...&limit=50` | GET | Session | Activity feed | LRANGE `capnet:activity:{agentId}` 0 (limit-1); verify agent ownership |
| `POST /api/reports` | POST | Session | Operator posts report | Body `{ agentId, message }`; LPUSH to `capnet:activity:{agentId}`; optionally emit TrustGraph event |

**Store:** `capnet:activity:{agentId}` → Redis LIST. Each item = JSON string `{ id, type, message, source, timestamp }`. LPUSH on write; LRANGE on read.

**Design rule:** Every write also emits TrustGraph event when applicable (e.g. `capnet.agent.verified` on verify).

**Files:** `api/activity.js`, `api/reports.js`, `lib/store-kv.js` (activity helpers using LPUSH/LRANGE)

---

### 1F. TrustGraph score proxy + caching (required)

| Endpoint | Method | Auth | Purpose | Implementation |
|----------|--------|------|---------|----------------|
| `GET /api/trust/score?agentId=...&window=30d` | GET | Session | Trust score | **Enforce agent ownership** (SISMEMBER operator SET); 403 if not owner. If TrustGraph not configured → `{ status: "off" }`. Else: fetch with hard timeout; cache 30–120s in KV; return score or error; include `checkedAt`, `latencyMs`. |

**Files:** `api/trust/score.js`, cache key e.g. `capnet:trustcache:{agentId}:{window}`

---

### 1G. Register-agent updates (session-scoped + TrustGraph event)

- **Auth:** Require session; derive operatorId from session (no operatorId in body).
- **Body:** `{ agentId, skills? }`. Omit `environment` unless used; if kept, validate enum `dev|pilot|prod` and default from `CAPNET_ENV`.
- **On success:** SADD agentId to `capnet:operator:{operatorId}:agents`; write agent record; LPUSH activity item `"agent registered"`; **emit TrustGraph event** `capnet.agent.registered`.
- **Verify endpoint:** `POST /api/verify` body `{ agentId }` — pings status + TrustGraph; LPUSH activity type="verify" with per-service results; emit `capnet.agent.verified` (subject=agentId, source=operatorId).

**Files:** `api/register-agent.js` (update), `api/verify.js`

---

### 1H. Store schema (production)

| Key | Type | Purpose |
|-----|------|---------|
| `capnet:operator:{operatorId}` | Hash/JSON | Operator record (operatorId, email, createdAt) |
| `capnet:operator:byemail:{email}` | String | email → operatorId lookup |
| `capnet:operator:{operatorId}:agents` | SET | AgentIds for operator; SADD on register |
| `capnet:agent:{agentId}` | Hash/JSON | Agent record |
| `capnet:activity:{agentId}` | LIST | Append-only activity; LPUSH writes, LRANGE reads |
| `capnet:session:{sessionId}` | Hash/JSON | Session → operatorId, email |
| `capnet:trustcache:{agentId}:{window}` | String/JSON | Cached TrustGraph score; TTL 30–120s |

**Files:** `lib/store-kv.js`, `lib/store-memory.js` (memory fallback with equivalent structure)

---

## 7. Phase 2 — Console UI: session + status grid + agent signup

**Goal:** Operator signs in (email → session), sees ecosystem status, adds agents. All data session-scoped.

### 2A. Console header card (session-based)

- Operator **email** input + "Sign in" button → `POST /api/operator/session`
- On success: cookie set; UI fetches `GET /api/operator/me` → displays operatorId, email
- Status pill: "All Systems OK" / "Degraded" / "Offline" (from `GET /api/status`)

**Components:** `.build-card` or `.feature-card`, `.status-pill` (new), `.metric` (label + value)

---

### 2B. Ecosystem status grid

- 4–6 cards: Capnet API, TrustGraph, WakeNet, Runtime, Settlement, (optional) AgentMail
- Each card: status, last checked, notes (store type, provider, etc.)
- Data from `GET /api/status`

**Components:** `.features-grid` or `.console-grid`, `.status-pill`

---

### 2C. Agent signup — two modes

**Mode 1 — MCP-first (recommended)**

- Show `.cursor/mcp.json` snippet (reuse from `#add-capnet`)
- Buttons: "Copy MCP Config", "Open START-HERE" (link to docs)
- Input: "Paste agentId after registering" + "Register Agent" → `POST /api/register-agent` (session-scoped; no operatorId in body)

**Mode 2 — UI-assisted**

- Fields: agentId, skills (comma list) (email from session)
- Button: "Register Agent" → `POST /api/register-agent` (session-scoped)

---

## 8. Phase 3 — Console UI: agent list table

**Goal:** Table of operator's agents (session-scoped).

- Call `GET /api/agents` (session cookie sent automatically)
- Table columns: agentId, activationStatus, TrustGraph score (from `/api/trust/score` or "—"), last seen
- Row click → expand agent profile (Phase 4)

**Components:** `.agent-table` (new), table styling consistent with palette

---

## 9. Phase 4 — Console UI: agent profile + verify button

**Goal:** Expandable detail view when clicking an agent row; "Verify integration" emits TrustGraph event.

- Top cards: TrustGraph score (from `/api/trust/score`), rank, jobs (7d), verified outcomes (7d) — "—" if not available
- **"Verify integration" button** → `POST /api/verify` body `{ agentId }` (writes activity type="verify" with per-service results; emits `capnet.agent.verified`)
- Sections:
  1. **Activity** — list from `GET /api/activity?agentId=...`; "Post report" box → `POST /api/reports` body `{ agentId, message }`
  2. **Skills** — stub (future)
  3. **Proof** — stub (future)
  4. **Settings** — stub (future)

**Components:** `.agent-details`, `.drawer` (expandable panel), `.metric`, `.btn` for verify

---

## 10. Phase 5 — Polish

- TrustGraph event ingestion from Runtime/WakeNet when those services exist
- Caching refinement for TrustGraph score
- Per-agent key management (optional)
- Handshake verification (optional)
- Real earnings when settlement enabled

---

## 11. File & folder summary

### New files (by phase)

| Phase | Files |
|-------|-------|
| 0 | — (edit `apps/landing/index.html`) |
| 1 | `api/operator/session.js`, `api/operator/me.js`, `api/status.js`, `api/agents.js`, `api/agent.js`, `api/activity.js`, `api/reports.js`, `api/verify.js`, `api/trust/score.js`, `lib/session.js`, updates to `lib/store-kv.js`, `lib/store-memory.js` |
| 2–4 | Edits to `apps/landing/index.html`, `styles.css`, `script.js` |
| 5 | TrustGraph event client (if not inline), ingestion (future) |

### Modified files

| File | Changes |
|------|---------|
| `apps/landing/index.html` | Add `#console` section, fix Docs link, add Console nav |
| `apps/landing/styles.css` | `.status-pill`, `.agent-table`, `.agent-details`, `.drawer`, `.metric`, `.console-grid` |
| `apps/landing/script.js` | Console init, session (POST, GET me), status fetch, agents fetch, register agent, activity fetch, report post, verify action |
| `lib/store-kv.js` | Operator→agents SET (SADD, SMEMBERS), activity LIST (LPUSH, LRANGE), session helpers |
| `lib/store-memory.js` | Same structure for local dev (no scans) |
| `api/register-agent.js` | Session required; derive operatorId; SADD to operator index; LPUSH activity; emit TrustGraph event |

---

## 12. Compatibility checklist (must not break)

- [ ] `POST /api/join` with `{ justUpdates: true }` still works
- [ ] `#waitlist-form`, `#waitlist-email`, `#waitlist-message` unchanged
- [ ] `npm run build` still copies `apps/landing/*` → `public/`
- [ ] All new assets in `apps/landing/`
- [ ] No React/Next/framework build
- [ ] Vercel deployment model unchanged (root deploy, api + public)

---

## 13. Recommended implementation order

1. **Phase 0** — Shell + nav (fastest win)
2. **Phase 1A** — Operator auth (`POST /api/operator/session`, `GET /api/operator/me`, session helpers)
3. **Phase 1H** — Store schema (operator SET, activity LIST, session storage)
4. **Phase 1B** — `GET /api/status` (with hard timeouts)
5. **Phase 1G** — Update `POST /api/register-agent` (session-scoped, SADD index, LPUSH activity, emit TrustGraph)
6. **Phase 1C, 1D** — `GET /api/agents`, `GET /api/agent` (session-scoped)
7. **Phase 1E** — Activity + reports (`GET /api/activity`, `POST /api/reports`)
8. **Phase 1F** — TrustGraph score proxy + caching
9. **Verify endpoint** — `POST /api/verify` (activity type="verify" + per-service results; emit `capnet.agent.verified`)
10. **Phase 2** — Console UI: session (email sign-in), status grid, agent signup
11. **Phase 3** — Agent list table
12. **Phase 4** — Agent profile + verify button
13. **Phase 5** — Polish (TrustGraph ingestion, etc.)

---

## 14. Resolved (from production requirements)

- **Operator→agents:** Redis SET `capnet:operator:{operatorId}:agents`; SADD on register; no scans.
- **Activity:** Redis LIST `capnet:activity:{agentId}`; LPUSH/LRANGE.
- **Auth:** Required from day 1; cookie session; all operator endpoints session-scoped.
- **TrustGraph:** Proxy required; cache 30–120s; emit `capnet.agent.registered` and `capnet.agent.verified` on register/verify. Enforce agent ownership on score endpoint.
- **KV:** Console endpoints require KV; return `{ ok:false, error:"KV_REQUIRED" }` if missing. Waitlist works in memory mode.

---

*Use this outline as the implementation roadmap. Start with Phase 0, then Phase 1, then Phase 2–4 in order.*
