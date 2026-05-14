# Razin Tracker

Cloud-synced project tracker. Static HTML + Supabase. Deploys to Vercel in ~10 min.

## Deploy (10 minutes)

### 1. Supabase (3 min)
1. Go to https://supabase.com → **Start your project** → sign in with Google.
2. Create a new project:
   - Name: `razin-projects`
   - Database password: generate a strong one and save it
   - Region: **West EU (Ireland)**
3. Wait ~1 min for provisioning.
4. Open **SQL Editor** → **New query** → paste the contents of `supabase-setup.sql` → **Run**.
5. Open **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key

### 2. Add keys to the app (30 sec)
Open `src/supabase.js`, replace the two placeholders, save:
```js
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

### 3. GitHub (3 min)
1. Go to https://github.com → sign up / sign in.
2. Click **+** → **New repository**.
   - Name: `razin-tracker`
   - Public
   - Don't initialize with README (we have one)
3. On the empty repo page, click **uploading an existing file**.
4. Drag every file from this folder in (or zip-upload). Commit.

### 4. Vercel (3 min)
1. Go to https://vercel.com → **Sign Up with GitHub**.
2. **Add New → Project** → import `razin-tracker`.
3. Leave all defaults (framework: Other, no build needed).
4. **Deploy.** Wait ~30 sec.
5. Copy the live URL.

### 5. Add to iPhone home screen
- Open the URL in **Safari** on iPhone.
- Tap **Share** → **Add to Home Screen**.

## Updating the app
Edit files in GitHub (or push from git). Vercel auto-redeploys on every commit.

## File map
```
index.html              shell + meta tags
src/supabase.js         your keys go here
src/app.js              CRUD + render logic
src/styles.css          dark operator UI
icon.svg                home screen icon
supabase-setup.sql      one-time DB setup
```

## Notes
- RLS is enabled with a public-access policy. Anyone with the live URL + anon key can read/write. Fine for a personal tracker, but don't share the URL publicly.
- Data lives in Supabase free tier (500 MB DB, plenty for this).
- To wipe data: Supabase → Table Editor → `projects` → select rows → delete.
