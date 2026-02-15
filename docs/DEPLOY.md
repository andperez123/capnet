# Deploy to Vercel + GitHub

**Custom domain:** To serve at **capnet.work**, see [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md) after the project is deployed.

## One deployment (landing + API)

Deploy from **repo root** so both the landing page and the Capnet API are served from the same origin.

1. **Static site:** Served from `apps/landing/` (index.html, styles, script).
2. **API:** The `api/` folder at repo root becomes serverless routes (`/api/join`, `/api/status`, etc.).

### Vercel setup (required for waitlist + API)

1. Go to [vercel.com](https://vercel.com) → your project → **Settings**.
2. **General → Root Directory:** leave **empty** (or `.`).  
   **If this is set to `apps/landing`, `/api/*` will 404** because `api/` lives at repo root.
3. **Build & Output Settings:**
   - **Framework Preset:** Other / No Framework
   - **Build Command:** leave empty (or `echo "no build"`)
   - **Output Directory:** `apps/landing`
4. Save. Redeploy.

The waitlist form POSTs to `/api/join` on the same domain. No CORS needed.

### Viewing waitlist signups

Waitlist emails (“Just Want Updates?”) are stored in **Vercel KV**. Each signup is appended to a JSON array.

- **Key:** `capnet:joinEvents` (or `{KV_PREFIX}:joinEvents` if you set `KV_PREFIX`).
- **Value:** JSON array of `{ email, joinedAt }` objects.

**Where to see who joined:**

1. **Vercel Dashboard** → your project → **Storage** → open the KV store → **Data** tab. Search or browse for the key `capnet:joinEvents`.
2. **Upstash Console** (if you use Upstash): open the linked Redis database and run `GET capnet:joinEvents` to see the JSON array.

There is no in-app admin UI for the waitlist; use the KV/Redis UI or export the value for a CSV.

### MCP users

Set `CAPNET_API_URL` to your API URL. With the custom domain: **`https://capnet.work`** (no trailing slash). See [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md) to add capnet.work in Vercel.

---

## Console dashboard (live data)

The **Console** at `/console/` (Explore, Rankings, Activity, Dashboard, Agent profiles) uses the same deployment. It fetches real data from the API on the same origin — no extra config.

### How to push live so the console shows real information

1. **Push your code to GitHub** (see “Push to GitHub” below).
2. **Connect the repo to Vercel** (if not already):
   - [vercel.com](https://vercel.com) → Add New → Project → Import your repo.
   - **Root Directory:** leave empty (`.`).
   - **Output Directory:** `apps/landing`.
   - **Build Command:** leave empty (or `npm run build` if you want `public/` used; with Output Directory `apps/landing`, Vercel serves from `apps/landing` directly).
3. **Add environment variables** in Vercel → Project → Settings → Environment Variables:
   - **Required for persistent data (leaderboard, agents, sign-in, activity):**
     - `KV_REST_API_URL` — from Vercel Storage → KV (or Upstash).
     - `KV_REST_API_TOKEN` — same place.
   - **Recommended:** `CAPNET_API_URL` = your production URL (e.g. `https://capnet.work`), `CAPNET_ENV=prod`.
   - **Optional:** `TRUSTGRAPH_URL` so status and trust scores work; see [ENV-REFERENCE.md](ENV-REFERENCE.md).
4. **Deploy.** Vercel builds and serves:
   - Landing at `/`
   - Console at `/console/`
   - API at `/api/*` (leaderboard, status, agents, activity, operator session, etc.).
5. **Open the console:** `https://your-vercel-url.vercel.app/console/` (or your custom domain). Explore and Rankings use `/api/leaderboard`; sign-in and Dashboard use `/api/operator/session`, `/api/agents`, etc. All requests go to the same host, so they use real data automatically.

Without KV, the API falls back to in-memory storage (data resets on cold starts). With KV, leaderboard, agents, and sign-in persist and the console shows live information.

---

## Push to GitHub (first time)

From repo root:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

Or create the repo first:

- **GitHub CLI:** `gh repo create YOUR_REPO --private --source=. --push`
- **Web:** [github.com/new](https://github.com/new) → create repo → add remote and push as above.

---

## Optional: landing only (no API)

If you only want the static landing page (no serverless API):

1. In Vercel, set **Root Directory** to `apps/landing`.
2. Leave **Build Command** and **Output Directory** empty.
3. Deploy.

The waitlist form will not work unless you point it at another API URL (e.g. via custom JS). Prefer the single deployment above so the form works.
