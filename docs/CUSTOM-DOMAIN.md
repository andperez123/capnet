# Custom domain: capnet.work

Steps to add **capnet.work** (and optionally **www.capnet.work**) to your Vercel project so the site and API are served at `https://capnet.work`.

---

## 1. Add the domain in Vercel

1. Open [vercel.com](https://vercel.com) → your **Capnet** project.
2. Go to **Settings** → **Domains**.
3. Click **Add** and enter:
   - **capnet.work** (apex/root domain)
   - Optionally **www.capnet.work** (Vercel will suggest redirecting www → apex or vice versa).
4. Click **Add**. Vercel will show the DNS records you need to create.

---

## 2. Configure DNS at your registrar

Where you bought **capnet.work** (e.g. Namecheap, Cloudflare, Google Domains, etc.):

### Option A: Apex domain (capnet.work) with Vercel nameservers (simplest)

If your registrar supports it, point the domain to Vercel’s nameservers. Vercel will show them in the Domains panel (e.g. `ns1.vercel-dns.com`, `ns2.vercel-dns.com`). At your registrar, set the domain to use these nameservers. No A/CNAME records needed; Vercel manages everything.

### Option B: Apex domain with A records

Add these at your DNS provider:

| Type | Name | Value |
|------|------|--------|
| **A** | `@` (or leave blank for apex) | **76.76.21.21** |

(Vercel may show a different IP; use the value Vercel shows for your project.)

### Option C: Apex (capnet.work) via CNAME flattening

Some providers (e.g. Cloudflare, DNSimple) support CNAME at apex. If so:

| Type | Name | Value |
|------|------|--------|
| **CNAME** | `@` | **cname.vercel-dns.com** |

(Use the exact target Vercel shows in the Domains panel.)

### www (optional)

If you added **www.capnet.work** in Vercel:

| Type | Name | Value |
|------|------|--------|
| **CNAME** | `www` | **cname.vercel-dns.com** |

In Vercel Domains, set the **www** domain to redirect to **capnet.work** (or the other way around) so there’s one canonical URL.

---

## 3. SSL (HTTPS)

Vercel issues a certificate for your domain automatically. It can take a few minutes after DNS propagates. Until then, the domain may show “Certificate not ready” or similar; wait and refresh.

---

## 4. Verify

- Open **https://capnet.work** — you should see the Capnet landing page.
- Open **https://capnet.work/api/health** — you should get JSON with `ok: true`.
- Submit the waitlist form on the landing page — it should POST to `https://capnet.work/api/join` and succeed.

---

## 5. Use capnet.work everywhere

- **MCP:** Set `CAPNET_API_URL=https://capnet.work` (no trailing slash) when running the Capnet MCP server or in Cursor MCP config.
- **Env:** In Vercel, you can set `CAPNET_API_URL=https://capnet.work` so the API and health endpoint know the canonical URL (optional; `VERCEL_URL` will reflect the domain after it’s assigned).

Once DNS and SSL are green in Vercel, the project is fully integrated with **capnet.work**.
