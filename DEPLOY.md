# Putting Do Now online (donow.pmcstudios.uk)

GitHub Pages hosts plain files, so the site is built as a static export (`npm run build:static`, written to `out/`).
Sign in uses PMC ID (Supabase). Step 1 connects it.

## First time
1. Repository > **Settings** > **Secrets and variables** > **Actions** > **Variables** tab > **New repository variable**. Name `SUPABASE_URL`, value: your Supabase Project URL (the one Coe and PMC ID use). Add a second variable named `SUPABASE_ANON_KEY` with the **publishable** key (starts `sb_publishable_`). Never the secret key: the deploy stops if it sees one.
2. Repository > **Settings** > **Pages** (left menu) > Build and deployment > Source: **GitHub Actions**.
3. **Actions** tab > **Deploy Do Now** > **Run workflow**. Wait for the green tick (about 3 minutes).
4. Settings > Pages > **Custom domain**: type `donow.pmcstudios.uk` > **Save**.
5. Where pmcstudios.uk's DNS is managed (Cloudflare dashboard > pmcstudios.uk > **DNS** > **Records** > **Add record**): Type `CNAME`, Name `donow`, Target `phoenixcoe.github.io`, Proxy status **DNS only** (grey cloud). **Save**.
6. Back in Settings > Pages, wait for "DNS check successful" (minutes, sometimes a few hours). Tick **Enforce HTTPS**.
7. Supabase > **Authentication** > **URL Configuration** > **Redirect URLs**: add `https://donow.pmcstudios.uk/**`. **Save**.
8. Open https://donow.pmcstudios.uk and press Ctrl+Shift+R. To check everything at once, run `node check-setup.mjs` (Node 18 or newer). Every line should say `ok`.

## When Ideas from Coe is switched on
1. Open the Coe worker's settings and add `https://donow.pmcstudios.uk` to `ALLOWED_ORIGINS`.
2. Deploy the worker again.

## Updating later
Change the files, commit and push. The **Actions** tab rebuilds the site. Changed a variable? **Actions** > **Deploy Do Now** > **Run workflow**.

## On your own computer
Needs Node.js 22 or newer. `npm install`, then `npm run dev` (editing) or `npm run build:static` then `npx serve out` (the real thing).

## Changing the domain
Edit `public/CNAME`, the DNS record and the Custom domain box, and use `node check-setup.mjs --site https://your-new-domain`.
