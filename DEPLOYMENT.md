# Deploying THE SYSTEM

Everything below runs on free tiers. Budget about 30 minutes the first time.

You will set up four things: a **Supabase** project (database, auth, functions), a **Gemini** key (AI),
**background-job schedules**, and **Vercel** (the website).

## 0. Prerequisites

- Node.js 20+ and `npm`
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- Accounts: Supabase, Vercel, GitHub (and optionally Resend)

```bash
git clone https://github.com/<you>/the-system.git && cd the-system
npm install
```

## 1. Supabase project

1. Create a project at <https://supabase.com/dashboard>. Note the **project ref** (the `abcd...` in its URL).
2. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
3. Link the CLI and create the schema:

```bash
supabase login
supabase link --project-ref <your-ref>
supabase db push          # applies every file in supabase/migrations, in order
```

> If `db push` fails with a password error, reset the database password under
> **Project Settings → Database**, then run `SUPABASE_DB_PASSWORD='<new password>' supabase db push`.

## 2. Authentication

**Dashboard → Authentication**

- **Providers → Email**: enabled. For the smoothest first run, turn **Confirm email** *off*
  (otherwise signups must click an emailed link, and Supabase's built-in mailer is heavily rate-limited
  on the free tier — configure custom SMTP if you want it on).
- **Providers → GitHub** (optional): create an OAuth app at <https://github.com/settings/developers>
  with the callback URL `https://<your-ref>.supabase.co/auth/v1/callback`, then paste the Client ID and
  Secret into Supabase.
- **URL Configuration** — do this *after* step 6 once you know your site URL:
  - **Site URL**: `https://your-app.vercel.app`
  - **Redirect URLs**: add `https://your-app.vercel.app/**` and `http://localhost:5173/**`

## 3. Secrets for the Edge Functions

```bash
# Free AI key — https://aistudio.google.com/ (no credit card)
supabase secrets set GEMINI_API_KEY=<key>

# Shared secret that lets pg_cron (and only pg_cron) trigger the background jobs
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)

# Web push: generate a keypair once
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> \
  VAPID_SUBJECT=https://github.com/<you>/the-system
```

Optional email reminders (needs a domain verified in Resend to reach anyone but yourself):

```bash
supabase secrets set RESEND_API_KEY=<key> RESEND_FROM="THE SYSTEM <noreply@yourdomain.com>"
```

Write down the CRON_SECRET value (`supabase secrets list` shows only a hash) — step 5 needs it.

## 4. Deploy the Edge Functions

```bash
for f in system-message ai-judge daily-rollover daily-reminder weekly-boss github-verify; do
  supabase functions deploy $f --use-api
done
```

## 5. Schedule the background jobs

These create weekly/monthly bosses, roll players over at midnight UTC, verify GitHub commits and send reminders.
**Without this step bosses never appear.**

1. Copy `supabase/cron.example.sql` to `supabase/cron.local.sql` (already git-ignored).
2. Replace `__PROJECT_URL__`, `__ANON_KEY__` and `__CRON_SECRET__`.
3. Run it: paste into **SQL Editor**, or `supabase db query --linked -f supabase/cron.local.sql`.
4. Check: `select jobname, schedule, active from cron.job;` should list four `system-*` jobs.

To create the first bosses immediately instead of waiting for 00:15 UTC, call `weekly-boss` once with the
`x-cron-secret` header.

## 6. Deploy the website (Vercel)

1. <https://vercel.com/new> → import the GitHub repo. Framework preset: **Vite** (auto-detected;
   `vercel.json` already configures SPA routing, caching and security headers).
2. **Environment Variables** (all three are public, browser-side values):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |
| `VITE_VAPID_PUBLIC_KEY` | the VAPID **public** key |

3. Deploy, then go back to step 2 and set the Supabase **Site URL / Redirect URLs** to your Vercel URL.

> **Never** put `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `CRON_SECRET` or `VAPID_PRIVATE_KEY` in Vercel
> or in any `VITE_*` variable — those are bundled into the public site.

## 7. Verify

- [ ] Open the site, create an account (email or GitHub), finish onboarding.
- [ ] Dashboard shows 5 quests and a **[ SYSTEM MESSAGE ]** line.
- [ ] Completing a quest raises XP and the ◈ coin counter.
- [ ] **Boss** page shows a weekly and a monthly boss.
- [ ] **Settings → Push notifications** can be enabled (needs HTTPS — Vercel provides it).
- [ ] Chrome/Edge show an **Install** button; Lighthouse's PWA check passes.
- [ ] `?previewRankUp=S` on the dashboard URL plays the rank-up cinematic.

## Native app (optional)

The web app is already an installable PWA. For a store-listed native app, wrap it with
[Capacitor](https://capacitorjs.com/) (`capacitor.config.json` is included):

```bash
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npm run build
npx cap add android && npx cap add ios      # first time only
npx cap sync
npx cap open android                        # builds in Android Studio
npx cap open ios                            # builds in Xcode (macOS only)
```

Building is free, but publishing is not: Google Play is a one-time **$25**, Apple's App Store is **$99/year**.
Native builds also require adding Supabase OAuth deep-link handling if you keep GitHub login.

## Limits worth knowing

| Service | Free-tier note |
|---|---|
| Supabase | Projects can be paused after a period of inactivity; 500 MB database; Edge Function and bandwidth quotas. |
| Gemini | Daily request quota shared by all your players. The AI Judge limits each player to 15 gradings/day. Image-generation models have **no** free quota, which is why portraits are procedurally drawn. |
| Resend | Without a verified domain it only delivers to your own address — web push is the free alternative for everyone else. |
| Vercel | Hobby plan is for non-commercial use. |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Boss page is empty | Step 5 not done, or `weekly-boss` has not run yet. |
| Sign-up works but nobody can log in | "Confirm email" is on and mail is not arriving — turn it off or configure SMTP. |
| GitHub login bounces back to `localhost` | Site URL / Redirect URLs (step 2) still point at localhost. |
| AI grading says "failed" | `GEMINI_API_KEY` missing/invalid, or the 15/day limit was hit. |
| Push toggle says "not configured" | `VITE_VAPID_PUBLIC_KEY` is missing in Vercel — add it and redeploy. |
| A page errors right after a deploy | A migration was not applied: `supabase migration list` should show Local = Remote. |
