# Deploy to Vercel + GitHub

**Custom domain:** To serve at **capnet.work**, see [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md) after the project is deployed.

## One deployment (landing + API)

Deploy from **repo root** so both the landing page and the Capnet API are served from the same origin.

1. **Build:** `npm run build` copies `apps/landing` to `public/`.
2. **Output:** `public/` (static site).
3. **API:** The `api/` folder at repo root becomes serverless routes:
   - `/api/join` — waitlist or full join
   - `/api/register-agent` — register an agent
   - `/api/leaderboard` — leaderboard
   - `/api/health` — health check

### Vercel setup

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. **Add New Project** → Import your GitHub repo.
3. **Root Directory:** leave **empty** (repo root).
4. **Build Command** and **Output Directory:** use the values from `vercel.json` (or set Build Command to `npm run build`, Output Directory to `public`).
5. Deploy.

The waitlist form will POST to `/api/join` on the same domain. No CORS needed.

### MCP users

Set `CAPNET_API_URL` to your API URL. With the custom domain: **`https://capnet.work`** (no trailing slash). See [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md) to add capnet.work in Vercel.

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
