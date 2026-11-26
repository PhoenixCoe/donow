# Putting Do Now online (donow.pmcstudios.uk)

GitHub Pages hosts plain files, so the site is built as a static export (`npm run build:static`, written to `out/`).
Sign in uses PMC ID (Supabase). Steps 1 to 3 connect it.

## First time
1. Supabase > **SQL Editor** > **New query**. Open `supabase/donow.sql` in this repository, copy all of it, paste it in, press **Run**. It should say "Success". This makes the table where each teacher's questions are kept. Only the teacher can read their own row.
2. Repository > **Settings** > **Secrets and variables** > **Actions** > **Variables** tab > **New repository variable**. Name `SUPABASE_URL`, value: your Supabase Project URL (the one Coe and PMC ID use). Add a second variable named `SUPABASE_ANON_KEY` with the **publishable** key (starts `sb_publishable_`). Never the secret key: the deploy stops if it sees one.
3. PMC ID must know about Do Now. Deploy the latest PMC ID (its `APPS` list in `src/lib/supabase.ts` now has `donow`). Without this, Sign in with PMC ID refuses to come back to Do Now.
4. Repository > **Settings** > **Pages** (left menu) > Build and deployment > Source: **GitHub Actions**.
5. **Actions** tab > **Deploy Do Now** > **Run workflow**. Wait for the green tick (about 3 minutes).
6. Settings > Pages > **Custom domain**: type `donow.pmcstudios.uk` > **Save**.
7. Where pmcstudios.uk's DNS is managed (Cloudflare dashboard > pmcstudios.uk > **DNS** > **Records** > **Add record**): Type `CNAME`, Name `donow`, Target `phoenixcoe.github.io`, Proxy status **DNS only** (grey cloud). **Save**.
8. Back in Settings > Pages, wait for "DNS check successful" (minutes, sometimes a few hours). Tick **Enforce HTTPS**.
9. Supabase > **Authentication** > **URL Configuration** > **Redirect URLs**: add `https://donow.pmcstudios.uk/**`. **Save**.
10. Open https://donow.pmcstudios.uk and press Ctrl+Shift+R. To check everything at once, run `node check-setup.mjs` (Node 18 or newer). Every line should say `ok`.

## Ideas from Coe

**Switched off for now.** None of the steps below do anything until it is switched back on. To switch it on: in `src/lib/coe.ts` change `COE_ENABLED = false` to `true`, then do the steps below and rerun the Deploy workflow.

1. Cloudflare dashboard > **Workers & Pages** > the Coe worker > **Settings** > **Variables and Secrets** > edit `ALLOWED_ORIGINS` and add `,https://donow.pmcstudios.uk` on the end (a comma, no space). **Deploy**.
2. Repository > Settings > Secrets and variables > Actions > **Variables** > **New repository variable**. Name `COE_SERVER`, value: the Coe worker address (the same one the Coe site uses, like `https://coe-server.yourname.workers.dev`).
3. **Actions** > **Deploy Do Now** > **Run workflow**.
Teachers then see **Ideas from Coe** when signed in. It uses their own Coe tokens for the day.

## Updating later
Change the files, commit and push. The **Actions** tab rebuilds the site. Changed a variable? **Actions** > **Deploy Do Now** > **Run workflow**.

## On your own computer
Needs Node.js 22 or newer. `npm install`, then `npm run dev` (editing) or `npm run build:static` then `npx serve out` (the real thing).

## Changing the domain
Edit `public/CNAME`, the DNS record and the Custom domain box, and use `node check-setup.mjs --site https://your-new-domain`.
