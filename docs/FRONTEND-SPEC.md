# Capnet frontend — complete spec & where to add new UI

This document describes the **current landing frontend** and exactly **where and how to add** your new UI/UX after (or instead of) the waitlist. No code changes are made here; use this as the reference when you build.

---

## 1. Overview

| What | Where |
|------|--------|
| **App** | Single-page static site |
| **Location** | `apps/landing/` |
| **Files** | `index.html`, `styles.css`, `script.js` |
| **Build** | `npm run build` copies `apps/landing/*` → `public/` (repo root) |
| **Deploy** | Vercel serves `public/` + `api/` from repo root; same origin so `/api/*` works |
| **Domain** | Production: `https://capnet.work` |

**Stack:** Plain HTML, CSS, and vanilla JS. No framework. Fonts: Google Fonts (DM Sans, Instrument Serif).

---

## 2. Page structure (top to bottom)

Every section lives inside `<main>` except the header and footer. Section order and IDs are fixed for nav and deep links.

| Order | Section ID | Purpose | Key classes |
|-------|------------|---------|-------------|
| — | (header) | Sticky nav + logo | `.site-header`, `.wrap`, `.logo`, `.nav` |
| 1 | `#hero` | Hero: title, tagline, CTAs | `.hero`, `.hero-title`, `.hero-tagline`, `.hero-desc`, `.hero-ctas` |
| 2 | — | Value strip (no id) | `.value-strip`, `.strip-inner`, `.value-item`, `.value-divider` |
| 3 | `#problem` | The Problem | `.section`, `.section-alt`, `.section-title`, `.section-lead`, `.problem-list` |
| 4 | `#solution` | The Solution | `.section`, `.section-lead`, `.solution-lead`, `.section-body` |
| 5 | `#how-it-works` | How Capnet Works (4 steps) | `.steps`, `.step`, `.step-num`, `.step-content`, `.step-title` |
| 6 | `#architecture` | Architecture flow diagram | `.arch-flow`, `.arch-node`, `.arch-arrow`, `.arch-caption` |
| 7 | `#what-you-build` | What You Build (2 cards) | `.build-card`, `.build-card-title`, `.build-card-lead`, `.build-list` |
| 8 | `#features` | Core Features (3 cards + CTAs) | `.features-grid`, `.feature-card`, `.feature-name`, `.feature-list`, `.features-ctas` |
| 9 | `#use-cases` | Use Cases (list) | `.use-cases-list` |
| 10 | `#open-core` | Open Source + Monetization (2 cols) | `.two-col`, `.col`, `.col-title`, `.col-list`, `.open-core-lead` |
| 11 | `#security` | Security (list) | `.security-list` |
| 12 | `#add-capnet` | Add Capnet (MCP install) | `.mcp-install`, `.mcp-step`, `.mcp-code`, `.cta-buttons` |
| 13 | `#waitlist` | **Waitlist (current CTA block)** | `.cta-section`, `.cta-title`, `.cta-sub`, `.waitlist-form`, `.waitlist-input`, `#waitlist-message`, `.cta-alt` |
| — | (footer) | Footer | `.site-footer`, `.footer-brand`, `.footer-tagline`, `.footer-nav` |

**Where your new UI goes:** Either **replace** the `#waitlist` section (lines ~283–294 in `index.html`) or **add a new section after it** (before `</main>`). See Section 6 below.

---

## 3. Layout and typography

- **Content width:** `.wrap` → `max-width: min(90vw, 720px)`, centered, horizontal padding `var(--space)` (1.5rem).
- **Sections:** `.section` = vertical padding `var(--space-xl)` (5rem). `.section-alt` = alternate background `var(--bg-alt)`.
- **Headings:** Serif = Instrument Serif (`.hero-title`, `.section-title`, `.feature-name`, `.cta-title`, `.footer-brand`). Sans = DM Sans everywhere else.
- **CSS variables** (in `:root` in `styles.css`):

  | Variable | Value | Use |
  |----------|--------|-----|
  | `--bg` | `#f8f7f4` | Page background |
  | `--bg-alt` | `#eeedeb` | Alternate section background |
  | `--text` | `#1a1a1a` | Primary text |
  | `--text-muted` | `#4a4a4a` | Secondary text |
  | `--border` | `#e5e4e0` | Borders |
  | `--serif` | Instrument Serif | Headings |
  | `--sans` | DM Sans | Body, UI |
  | `--wrap` | `min(90vw, 720px)` | Content max width |
  | `--space`, `--space-lg`, `--space-xl` | 1.5rem, 3rem, 5rem | Spacing |

---

## 4. Components you can reuse

- **Buttons:** `.btn` (base), `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-lg`.
- **Cards:** `.build-card` or `.feature-card` (border, padding, rounded).
- **Lists:** `.problem-list`, `.build-list`, `.feature-list`, `.use-cases-list`, `.security-list`, `.col-list`.
- **Two-column layout:** `.two-col` (grid, min 260px per column).
- **Code block:** `.mcp-code` (mono-style block with border).
- **Inline code:** `<code>` styled via `.mcp-step code` (background, padding, radius).
- **CTAs block:** `.cta-section`, `.cta-title`, `.cta-sub`, `.cta-buttons`, `.cta-alt`.

---

## 5. Current waitlist (what exists today)

**HTML (section to replace or supplement):**

- **Section:** `<section class="section section-alt cta-section" id="waitlist">`
- **Content:** Title “Just Want Updates?”, subtitle “Join the waitlist. No agent required.”, a form, a message area, and a link to “Add Capnet”.
- **Form:** `id="waitlist-form"`, `class="waitlist-form"`. Single email input: `id="waitlist-email"`, `name="email"`, `class="waitlist-input"`. Submit button: “Join the Waitlist” with `.btn .btn-primary`.
- **Message:** `<p id="waitlist-message" class="waitlist-message" aria-live="polite">` — used by JS for success/error.

**Behavior (in `script.js`):**

- On submit: `preventDefault()`, read email from `#waitlist-email` (or `input[name="email"]`).
- `fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, justUpdates: true }) })`.
- On success: set `#waitlist-message` text to `data.message`, add class `waitlist-message--ok`, reset form.
- On error: set message to “Something went wrong…”, add class `waitlist-message--error`.

**API:** `POST /api/join` — body `{ email: string, justUpdates: true }`. Response `{ ok: boolean, message?: string }`.

**Styles:** `.waitlist-form` (flex, wrap, gap, centered, max-width 28rem), `.waitlist-input`, `.waitlist-message`, `.waitlist-message--ok`, `.waitlist-message--error`.

**Nav/footer:** Header has `<a href="#waitlist">Waitlist</a>`. Footer has `<a href="#waitlist">Waitlist</a>`. Hero has “Just Want Updates? Join the Waitlist” → `#waitlist`. Add Capnet section has “Just want updates? Join the waitlist” → `#waitlist`.

---

## 6. Where to add your new UI (after the waitlist)

You have two clear options.

### Option A: Replace the waitlist section

- **File:** `apps/landing/index.html`
- **Location:** The entire `<section id="waitlist">…</section>` block (currently ~lines 283–294).
- **Action:** Replace that block with your new section. Keep an `id` for the new primary CTA (e.g. `id="app"` or `id="dashboard"`) and update any links that currently point to `#waitlist` (header, footer, hero, add-capnet) to point to the new id or remove them.
- **JS:** Remove or repurpose the waitlist form listener in `script.js` (the block that selects `#waitlist-form` and `#waitlist-message`). Add new listeners for your new UI.
- **CSS:** Add new classes in `styles.css` (or a new stylesheet linked after `styles.css`). You can keep `.waitlist-*` in the file if you no longer use them, or delete them.

### Option B: Add a new section after the waitlist

- **File:** `apps/landing/index.html`
- **Location:** After `</section>` that closes `#waitlist`, and before `</main>`.
- **Action:** Insert a new `<section id="your-new-id" class="section">…</section>` (or `section section-alt` for alternating background). No need to remove the waitlist block unless you want to.
- **Nav:** Add a link in header and footer to `#your-new-id` if you want it in the nav.
- **JS/CSS:** Add any new behavior and styles for this section; existing waitlist behavior stays as is.

**Recommendation:** If the new UI is the *primary* post–waitlist experience (e.g. dashboard, onboarding, or main app shell), use **Option A** and replace the waitlist so one section owns “what happens after.” If the new UI is an *additional* area (e.g. a “Product” or “Dashboard” section alongside “Join the Waitlist”), use **Option B**.

---

## 7. File-by-file reference

### `apps/landing/index.html`

- **Lines 1–12:** `DOCTYPE`, `html`, `head` (meta, title, description, fonts, `styles.css`).
- **Lines 13–25:** `<body>`, `<header class="site-header">`, logo, nav (How it works, Features, Use cases, Docs, Add Capnet, Waitlist).
- **Lines 27–39:** Hero `#hero`.
- **Lines 41–57:** Value strip (no id).
- **Lines 59–294:** Sections in order: problem, solution, how-it-works, architecture, what-you-build, features, use-cases, open-core, security, add-capnet, **waitlist**.
- **Lines 296–308:** Footer.
- **Line 310:** `<script src="script.js"></script>`.

### `apps/landing/styles.css`

- **Lines 1–42:** `:root`, reset, `html`, `body`, `.wrap`.
- **Lines 44–91:** Header, logo, nav, buttons (`.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-lg`).
- **Lines 93–207:** Hero, value-strip, section defaults, problem-list, steps, arch-flow, build-card, features-grid, use-cases, two-col, security, cta-section, cta-alt.
- **Lines 319–346:** MCP install (`.mcp-install`, `.mcp-step`, `.mcp-code`).
- **Lines 348–372:** Waitlist (`.waitlist-form`, `.waitlist-input`, `.waitlist-message`, modifiers).
- **Lines 374–398:** Footer.
- **Lines 400–416:** `@media (max-width: 640px)` (header stack, nav, value-divider hide, hero CTAs column, arch-flow column).

### `apps/landing/script.js`

- **DOMContentLoaded:**
  - Smooth scroll: all `a[href^="#"]` → on click, `preventDefault`, `querySelector(href)` → `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
  - Waitlist: `#waitlist-form` submit → read email from `#waitlist-email` or `input[name="email"]`, `fetch('/api/join', …)`, update `#waitlist-message`, reset form or show error.

---

## 8. API endpoints available to the new UI

Same origin as the frontend (`https://capnet.work` in production), so use relative URLs.

| Method | Path | Body (JSON) | Response | Use |
|--------|------|-------------|----------|-----|
| POST | `/api/join` | `{ email, justUpdates?, agentId?, operatorId?, skills?, environment? }` | `{ ok, message?, operatorId?, agentId? }` | Waitlist or full join |
| POST | `/api/register-agent` | `{ agentId, email, operatorId?, skills?, environment? }` | `{ ok, agentId, operatorId, activationStatus, message, nextSteps }` | Register agent |
| GET | `/api/leaderboard` | — | `{ ok, leaderboard: [{ agentId, operatorId, earnings, joinedAt }] }` | Leaderboard |
| GET | `/api/health` | — | `{ ok, service, version, timestamp, config? }` | Health + config |

Use `fetch('/api/...', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(...) })` and same-origin; no CORS config needed.

---

## 9. Checklist for adding the new UI

- [ ] Decide: **replace** `#waitlist` (Option A) or **add section after** (Option B).
- [ ] In `index.html`: add or replace the section; give it a stable `id`; use existing classes where possible (`.section`, `.wrap`, `.btn-*`, etc.).
- [ ] In `styles.css`: add any new class names and layout; follow `:root` variables for colors/fonts.
- [ ] In `script.js`: add event listeners and `fetch` calls for the new UI; remove or keep waitlist logic depending on Option A/B.
- [ ] Update nav/footer/hero/add-capnet links if the primary CTA target changes (e.g. `#waitlist` → `#app`).
- [ ] Test: `cd apps/landing && python3 -m http.server 8765` (or `npm run build` and serve `public/`); hit `/api/health` and any endpoints the new UI uses.
- [ ] Deploy: push; Vercel builds `public/` from `apps/landing`; new UI will be live at `https://capnet.work`.

---

## 10. Quick reference: section IDs and nav targets

| ID | Used in nav / links |
|----|----------------------|
| `#hero` | — |
| `#problem` | — |
| `#solution` | — |
| `#how-it-works` | Header, footer |
| `#features` | Header, footer, hero “Integrate” |
| `#use-cases` | Header, footer |
| `#docs` | Header, footer (no section with this id yet) |
| `#add-capnet` | Header “Add Capnet”, hero primary CTA, add-capnet “Join the waitlist”, footer implied via Add Capnet |
| `#waitlist` | Header “Waitlist”, footer “Waitlist”, hero “Join the Waitlist”, add-capnet “Join the waitlist” |

When you introduce the new UI, either reuse one of these or add a new id and link it from header/footer/CTAs as needed.
