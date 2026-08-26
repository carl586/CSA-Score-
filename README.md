# Roll-Off — CSA Point Tracker

A small web app that tracks FMCSA CSA violation points per BASIC and shows when
each violation re-weights (×3 → ×2 → ×1) and rolls off the record at 24 months.

## What's in this folder

```
app/
  layout.js              the page shell (sidebar + content area)
  page.js                the main dashboard (ranked violations list)
  globals.css            Tailwind + fonts
  api/
    violations/route.js       GET (list) + POST (create)
    violations/[id]/route.js  DELETE
components/
  Sidebar.js, TopBar.js, FilterPills.js
  ViolationsTable.js, AddViolationModal.js
lib/
  calc.js   the point/decay math (severity × time-weight)
  db.js     the Neon database connection
schema.sql  the one table this app uses — run it once in Neon
```

You will not need to touch most of these files. The three things worth knowing:
- **`schema.sql`** — the database table.
- **`lib/calc.js`** — if FMCSA's weighting rules ever change, this is the only file to edit.
- **`.env.example`** — shows the one environment variable the app needs (`DATABASE_URL`).

---

## Step 1 — Put this code on GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g. `csa-roll-off-tracker`). Leave it empty — no README, no .gitignore (this folder already has one).
2. On your computer, open a terminal in this folder and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/csa-roll-off-tracker.git
   git push -u origin main
   ```
   (Replace the URL with the one GitHub shows you after creating the repo.)

## Step 2 — Create the database on Neon

1. Go to [neon.tech](https://neon.tech) and sign up (free tier is enough to start).
2. Click **New Project**. Give it any name, pick a region close to you, click **Create**.
3. Once it's created, open the **SQL Editor** tab in Neon and paste in the contents of `schema.sql` from this folder, then run it. This creates the one table the app needs (`violations`).
4. Go to the project's **Dashboard** or **Connection Details** and copy the **connection string** — it looks like:
   ```
   postgresql://user:password@ep-something.neon.tech/neondb?sslmode=require
   ```
   Keep this tab open, you'll need it in the next step.

## Step 3 — Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with your GitHub account.
2. Click **Import** next to the `csa-roll-off-tracker` repo you just pushed.
3. Before clicking Deploy, open **Environment Variables** and add:
   - **Name:** `DATABASE_URL`
   - **Value:** the Neon connection string you copied in Step 2
4. Click **Deploy**. In about a minute you'll get a live URL like `csa-roll-off-tracker.vercel.app` — that's your website.

That's it — no server to manage. Every time you `git push` to `main`, Vercel redeploys automatically.

## Step 4 — Using it

- **Add violation** opens a form: date, code, description, BASIC, severity weight (1–10, from the inspection report), and whether it triggered an out-of-service order.
- The ranked list recalculates automatically based on today's date — points, zone (×3/×2/×1/rolled off), and "next transition in N days" are all computed live, not stored.
- Filter pills and the BASIC dropdown narrow the list; the search box matches on code, description, driver, or unit.
- To bring in your two years of history, add each violation once (there's no bulk-import screen yet — see "Optional next steps" below if you want one).

## Running it locally (optional, for testing before you deploy)

```bash
npm install
cp .env.example .env.local   # then paste your Neon connection string in
npm run dev
```
Open `http://localhost:3000`.

## Optional next steps

- **Bulk CSV import** — add an API route that accepts pasted CSV rows and inserts them in one batch (useful for the 2-year backfill and monthly uploads).
- **Login** — right now anyone with the URL can view and edit. Add [Vercel's password protection](https://vercel.com/docs/deployment-protection) (paid plans) or a simple auth library like [Auth.js](https://authjs.dev) if this needs to be private.
- **Per-carrier / per-unit views** — the `carrier` and `unit` columns already exist in the schema; add a filter for them the same way `basic` is filtered in `app/page.js`.
