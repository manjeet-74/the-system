# THE SYSTEM

A solo-leveling-inspired productivity gamification app. Complete daily quests, build streaks, unlock Forge challenges, defeat weekly Boss Fights, and level up your real-world skills.

## Features

- **GitHub OAuth login** — sign in with your GitHub account
- **Trial of Courage** — timed riddle + pledge onboarding gate
- **Daily Quest Board** — 5 default quests + custom quests, tracked every day
- **Three verification modes** — manual checkbox, GitHub commit auto-detection, or AI Judge (Claude)
- **Streak system** — consecutive day tracking with server-side enforcement; missed days apply stat decay penalties and generate a Redemption Trial
- **The Forge** — streak milestones (3/5/7/14/30 days) unlock Spark/Build/Dungeon challenges for bonus XP
- **Boss Fights** — weekly and monthly large-scale challenges
- **Analytics** — completion heatmap, stat growth chart, per-stat completion rates
- **HUD** — live rank (E→S), level, XP bar, and stat grid backed by Supabase Realtime
- **Email reminders** — configurable nightly reminder via Resend if quests are incomplete

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript |
| Styling | Tailwind CSS |
| Server state | TanStack React Query + Supabase Realtime |
| Backend | Supabase (Postgres + Auth + Edge Functions + Cron) |
| Auth | GitHub OAuth via Supabase Auth |
| AI grading | Anthropic API (Claude Haiku) |
| Email | Resend |
| Hosting | Vercel (frontend), Supabase (backend) |

## Local Setup

1. **Clone the repo** and `cd the-system`
2. **Install dependencies**: `npm install`
3. **Create `.env`** (copy from `.env.example`) and fill in:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project
4. **Link the Supabase CLI**: `supabase link --project-ref <your-ref>`
5. **Apply migrations**: `supabase db push`
6. **Set Edge Function secrets**:
   ```
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
   supabase secrets set ANTHROPIC_API_KEY=<key>
   supabase secrets set RESEND_API_KEY=<key>
   ```
7. **Deploy Edge Functions**:
   ```
   supabase functions deploy daily-rollover
   supabase functions deploy github-verify
   supabase functions deploy ai-judge
   supabase functions deploy daily-reminder
   ```
8. **Schedule via pg_cron** (in Supabase dashboard → Database → Extensions → pg_cron):
   ```sql
   select cron.schedule('daily-rollover', '0 0 * * *', 'select net.http_post(...)');
   select cron.schedule('github-verify', '*/30 * * * *', 'select net.http_post(...)');
   select cron.schedule('daily-reminder', '0 * * * *', 'select net.http_post(...)');
   ```
9. **Run dev server**: `npm run dev`

## Deployment

Frontend is deployed to Vercel. Connect the GitHub repo and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel's environment variables.

## Architecture

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the full commit-by-commit implementation plan.
