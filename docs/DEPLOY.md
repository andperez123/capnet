# Deploy to Vercel + GitHub

## 1. Push to GitHub

From repo root:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

If you haven't created the repo yet:

- **GitHub CLI:** `gh repo create YOUR_REPO --private --source=. --push`
- **Or:** Create a new repo at [github.com/new](https://github.com/new), then add remote and push as above.

## 2. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub).
2. **Add New Project** → Import your GitHub repo.
3. **Root Directory:** Click "Edit" and set to **`apps/landing`** (so Vercel serves the landing page).
4. Leave **Build Command** and **Output Directory** empty (static site).
5. Click **Deploy**.

Vercel will build and assign a URL (e.g. `your-project.vercel.app`). You can add a custom domain in Project Settings.

## 3. Optional: monorepo root deploy

To deploy from repo root (so `vercel.json` at root is used): set Root Directory to **`.`** and keep the existing `vercel.json` (it points output to `apps/landing`). Prefer setting Root to `apps/landing` for the simplest setup.
