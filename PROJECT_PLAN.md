# THE SYSTEM — Execution Plan

This document is the single source of truth for building this project. It is
written to be followed literally, in order, by an AI coding assistant with no
outside context. Read this entire file once before writing any code.

## 0. Rules for whoever (or whatever) executes this plan

1. **Follow commits in order.** Never start Commit N+1 before Commit N has
   been approved. Never combine two commits into one. Never split one commit
   into two unless explicitly told to.
2. **Do not invent features.** If something seems missing or you think a
   better approach exists, stop and ask the user — do not silently add,
   remove, or change scope.
3. **Every commit ends the same way:**
   - Implement exactly what the commit specifies.
   - Run/verify every item in that commit's "Acceptance criteria."
   - Show the user a short summary of what was built and confirm every
     acceptance criterion passes.
   - Output the commit message from that commit's "Commit message" block.
   - **Stop. Do not touch any file for the next commit.** Wait for the user
     to say the literal words "go ahead" (or equivalent explicit approval)
     before starting the next commit.
4. **If a step is ambiguous, ask.** Do not guess silently on anything that
   affects data shape, security (RLS), or money (API costs).
5. **Never commit secrets.** `.env` is gitignored from Commit 1 onward. Only
   `.env.example` (with placeholder values) is committed.

---

## 1. Tech stack (fixed — do not substitute)

| Layer            | Choice                                             |
|------------------|-----------------------------------------------------|
| Frontend         | Vite + React 18 + TypeScript                        |
| Styling          | Tailwind CSS                                        |
| Server state     | TanStack React Query + Supabase Realtime            |
| Backend          | Supabase (Postgres + Auth + Edge Functions + Cron)  |
| Auth provider    | GitHub OAuth (via Supabase Auth)                    |
| AI grading       | Anthropic API (Claude), called from an Edge Function|
| Email            | Resend (for reminder notifications)                 |
| Hosting          | Vercel (frontend), Supabase (backend)               |
| Package manager  | npm                                                  |

## 2. Repository structure (target shape — build up to this over the commits)

```
the-system/
├── .env.example
├── .gitignore
├── README.md
├── PROJECT_PLAN.md              <- this file
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── index.html
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 0001_profiles_and_stats.sql
│   │   ├── 0002_quests_and_logs.sql
│   │   ├── 0003_streaks.sql
│   │   ├── 0004_forge.sql
│   │   ├── 0005_github_links.sql
│   │   ├── 0006_ai_submissions.sql
│   │   ├── 0007_boss_challenges.sql
│   │   └── 0008_notification_prefs.sql
│   └── functions/
│       ├── daily-rollover/index.ts
│       ├── github-verify/index.ts
│       ├── ai-judge/index.ts
│       └── daily-reminder/index.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── lib/
    │   ├── supabaseClient.ts
    │   └── queryClient.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── usePlayerStats.ts
    │   ├── useDailyQuests.ts
    │   ├── useForge.ts
    │   └── useAnalytics.ts
    ├── components/
    │   ├── hud/ (StatusBar.tsx, StatGrid.tsx, XPBar.tsx, RankBadge.tsx)
    │   ├── quests/ (QuestList.tsx, QuestRow.tsx, AddQuestForm.tsx, AiSubmitModal.tsx)
    │   ├── forge/ (ForgeCard.tsx, ForgeHistory.tsx)
    │   ├── boss/ (BossCard.tsx)
    │   ├── analytics/ (Heatmap.tsx, StatChart.tsx, CompletionRateChart.tsx)
    │   └── common/ (ProtectedRoute.tsx, Loading.tsx, ErrorBoundary.tsx)
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── OnboardingPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── ForgePage.tsx
    │   ├── BossPage.tsx
    │   ├── AnalyticsPage.tsx
    │   └── SettingsPage.tsx
    └── styles/
        └── globals.css
```

## 3. Environment variables (`.env.example` content — fill real values in `.env`, never commit `.env`)

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
```

`VITE_`-prefixed vars are exposed to the frontend by Vite. The other three
(`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`) are
**Edge Function secrets only** — set them with `supabase secrets set
KEY=value`, never put them in frontend code or `.env` files read by Vite.

## 4. Human-only setup (must be done by the user before Commit 1 — an AI agent cannot do these)

- [ ] Create a Supabase project at supabase.com. Note the project URL and anon key.
- [ ] Install the Supabase CLI (`npm install -g supabase`) and run `supabase login`.
- [ ] Create a GitHub OAuth App (github.com → Settings → Developer settings →
      OAuth Apps). Set the callback URL to the one Supabase's Auth →
      Providers → GitHub screen shows you. Paste the resulting Client ID and
      Client Secret into Supabase's GitHub provider settings and enable it.
- [ ] Get an Anthropic API key from console.anthropic.com.
- [ ] Get a Resend API key from resend.com (free tier is enough).
- [ ] Have Node.js 20+ and npm installed locally.

Nothing below this line should be attempted until every box above is checked.

---

# COMMITS

Each commit below is self-contained. Do not read ahead and start early work
from a later commit "to save time" — dependencies are listed explicitly and
anything not listed as a dependency has not been built yet.

---

## Commit 1 — Project scaffold

**Goal:** A running blank Vite+React+TS app with Tailwind configured, and git initialized.

**Depends on:** Human-only setup section above.

**Steps:**
1. `npm create vite@latest the-system -- --template react-ts`, `cd the-system`.
2. `git init`, create `.gitignore` with at minimum: `node_modules`, `dist`, `.env`, `.env.local`.
3. Install Tailwind: `npm install -D tailwindcss postcss autoprefixer` then `npx tailwindcss init -p`.
4. Configure `tailwind.config.ts` `content` to include `./index.html` and `./src/**/*.{ts,tsx}`.
5. Replace `src/index.css` (or create `src/styles/globals.css` and import it in `main.tsx`) with the three `@tailwind` directives (base, components, utilities).
6. In `index.html`, add Google Fonts links for `Rajdhani` (weights 500,600,700) and `Inter` (weights 400,500,600), matching the HUD aesthetic used in the original prototype.
7. Define CSS custom properties on `:root` in `globals.css` for the HUD color palette: `--bg: #04070d; --panel: #0a0f1c; --cyan: #3fd6f5; --danger: #ff4d5e; --text: #e6f1f7; --muted: #6d81a0;` (carry over the full palette from the original prototype's `<style>` block if you have access to it; otherwise use these as the baseline).
8. Create `.env.example` with the content from section 3 above. Do NOT create a real `.env` yet — that happens in Commit 3.
9. Write a placeholder `README.md` with the project name and a one-line description.
10. Delete Vite's default boilerplate content from `App.tsx` (logo, counter) and replace with a single `<h1>THE SYSTEM</h1>` so the app renders something recognizable.

**Acceptance criteria:**
- [ ] `npm run dev` starts with no errors.
- [ ] Browser shows "THE SYSTEM" styled in the Rajdhani font on a dark background.
- [ ] `git status` shows a clean repo with `.env` correctly ignored (verify by creating a dummy `.env` file and confirming `git status` does not list it).

**Commit message:**
```
chore: scaffold Vite+React+TS project with Tailwind and HUD base styles
```

**STOP. Wait for "go ahead" before Commit 2.**

---

## Commit 2 — Supabase client + local Supabase project link

**Goal:** The frontend can talk to Supabase, and migrations can be run locally.

**Depends on:** Commit 1.

**Steps:**
1. `npm install @supabase/supabase-js @tanstack/react-query`.
2. Create `src/lib/supabaseClient.ts`:
   ```ts
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Missing Supabase environment variables. Check your .env file.');
   }

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```
3. Create `src/lib/queryClient.ts` exporting a `new QueryClient()` from React Query, and wrap `<App />` in `main.tsx` with `<QueryClientProvider client={queryClient}>`.
4. Create the real `.env` file (gitignored) and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the Supabase project dashboard.
5. Run `supabase init` in the repo root — this creates `supabase/config.toml` and the `supabase/` folder structure.
6. Run `supabase link --project-ref <your-project-ref>` to connect the local CLI to the real project.

**Acceptance criteria:**
- [ ] `supabase/config.toml` exists and is committed.
- [ ] The app still runs with `npm run dev` and throws no console errors about missing env vars.
- [ ] `supabase migration list` runs successfully in the terminal (proves the CLI is linked).

**Commit message:**
```
chore: add Supabase client, React Query provider, and link local CLI to project
```

**STOP. Wait for "go ahead" before Commit 3.**

---

## Commit 3 — Database migration: profiles & player_stats + auto-provisioning trigger

**Goal:** New users automatically get a `profiles` row and a `player_stats` row the moment they sign up — no manual step required anywhere in the app.

**Depends on:** Commit 2.

**Steps:**
1. Create `supabase/migrations/0001_profiles_and_stats.sql` with exactly:
   ```sql
   create table profiles (
     id uuid primary key references auth.users(id) on delete cascade,
     username text,
     class text,
     courage_test_passed boolean not null default false,
     created_at timestamptz not null default now()
   );

   create table player_stats (
     user_id uuid primary key references profiles(id) on delete cascade,
     str int not null default 0,
     int_ int not null default 0,
     vit int not null default 0,
     sense int not null default 0,
     agi int not null default 0,
     updated_at timestamptz not null default now()
   );

   alter table profiles enable row level security;
   alter table player_stats enable row level security;

   create policy "select own profile" on profiles for select using (auth.uid() = id);
   create policy "update own profile" on profiles for update using (auth.uid() = id);

   create policy "select own stats" on player_stats for select using (auth.uid() = user_id);
   create policy "update own stats" on player_stats for update using (auth.uid() = user_id);

   -- Auto-create profile + stats row whenever a new auth user is created
   create function public.handle_new_user()
   returns trigger as $$
   begin
     insert into public.profiles (id, username)
     values (new.id, coalesce(new.raw_user_meta_data->>'user_name', 'Hunter'));
     insert into public.player_stats (user_id) values (new.id);
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute procedure public.handle_new_user();
   ```
2. Run `supabase migration up` (or `supabase db push` if working against the hosted project directly) to apply it.

**Acceptance criteria:**
- [ ] Migration applies with no errors.
- [ ] Manually inserting a test row into `auth.users` via the Supabase dashboard's SQL editor (or signing up once through Supabase's hosted auth UI) results in matching rows appearing in both `profiles` and `player_stats` automatically.
- [ ] Attempting to `select * from profiles` as an anonymous/different user (via the dashboard's RLS-aware query tool, or a quick test in the app) returns no rows for other users' data.

**Commit message:**
```
feat(db): add profiles and player_stats tables with auto-provisioning trigger and RLS
```

**STOP. Wait for "go ahead" before Commit 4.**

---

## Commit 4 — GitHub OAuth login flow

**Goal:** A user can sign in with GitHub, land on a protected dashboard route, and sign out.

**Depends on:** Commit 3, and the GitHub OAuth App from the Human-only setup section.

**Steps:**
1. Create `src/hooks/useAuth.ts` exposing `{ session, user, loading, signInWithGitHub, signOut }`, backed by `supabase.auth.onAuthStateChange` and `supabase.auth.getSession()` on mount.
2. Create `src/pages/LoginPage.tsx` — a single "Sign in with GitHub" button that calls `supabase.auth.signInWithOAuth({ provider: 'github' })`.
3. Create `src/components/common/ProtectedRoute.tsx` — redirects to `/login` if `useAuth().user` is null (after loading resolves), otherwise renders its children.
4. Install a router: `npm install react-router-dom`. Set up routes in `App.tsx`:
   - `/login` → `LoginPage` (public)
   - `/` → wrapped in `ProtectedRoute`, renders `DashboardPage` (a placeholder for now — real content comes in Commit 8)
5. Add a sign-out button somewhere visible on the dashboard placeholder.

**Acceptance criteria:**
- [ ] Visiting `/` while logged out redirects to `/login`.
- [ ] Clicking "Sign in with GitHub" completes the OAuth flow and lands back on `/`.
- [ ] Refreshing the page while logged in keeps the session (does not bounce back to login).
- [ ] Signing out returns to `/login` and a subsequent visit to `/` redirects again.

**Commit message:**
```
feat(auth): GitHub OAuth login, protected routes, and session persistence
```

**STOP. Wait for "go ahead" before Commit 5.**

---

## Commit 5 — Trial of Courage onboarding

**Goal:** First-time users must pass the onboarding gate before reaching the dashboard; returning users skip straight past it.

**Depends on:** Commit 4.

**Steps:**
1. Create `src/pages/OnboardingPage.tsx`. Port the three-stage flow from the original HTML prototype (name → timed riddle → typed pledge), adapted to React state (`useState` for `step`) instead of manually rebuilding DOM nodes.
   - Riddle pool and 45-second timer logic: same behavior as the prototype — wrong/timeout leads to a retry with a new riddle from the pool, never a permanent lock.
   - On successful pledge match: `update profiles set username = ?, courage_test_passed = true where id = auth.uid()`.
2. Add a route guard: inside `ProtectedRoute` (or a new wrapper), if the logged-in user's `profiles.courage_test_passed` is `false`, redirect to `/onboarding` instead of rendering the requested page. Fetch this flag with a small React Query hook (`useProfile()`).
3. Add the `/onboarding` route, itself still wrapped in `ProtectedRoute` (must be logged in to see it) but NOT gated by the courage-test check (otherwise it would redirect to itself).

**Acceptance criteria:**
- [ ] A brand-new user, immediately after GitHub login, is sent to `/onboarding` and cannot reach `/` by typing the URL directly.
- [ ] Completing the pledge stage updates `courage_test_passed` to `true` in the database and navigates to `/`.
- [ ] A returning user who already passed goes straight to `/` after login, never seeing `/onboarding`.
- [ ] Failing the riddle (wrong answer or timeout) offers a retry and does not soft-lock the page.

**Commit message:**
```
feat(onboarding): Trial of Courage gate with riddle timer and pledge, tied to courage_test_passed flag
```

**STOP. Wait for "go ahead" before Commit 6.**

---

## Commit 6 — Database migration: quests & daily logs + default quest seeding

**Goal:** Every user has the 5 default quests available, and there's a place to record daily completion.

**Depends on:** Commit 5.

**Steps:**
1. Create `supabase/migrations/0002_quests_and_logs.sql`:
   ```sql
   create table quest_templates (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references profiles(id) on delete cascade not null,
     title text not null,
     stat text not null check (stat in ('STR','INT','VIT','SENSE','AGI')),
     xp int not null default 10,
     is_default boolean not null default false,
     verification_method text not null default 'manual'
       check (verification_method in ('manual','github','ai_judge')),
     rubric text,
     archived boolean not null default false,
     created_at timestamptz not null default now()
   );

   create table daily_logs (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references profiles(id) on delete cascade not null,
     log_date date not null,
     quest_id uuid references quest_templates(id) not null,
     done boolean not null default false,
     completed_at timestamptz,
     xp_awarded int,
     verified_via text,
     is_penalty boolean not null default false,
     unique(user_id, log_date, quest_id)
   );

   alter table quest_templates enable row level security;
   alter table daily_logs enable row level security;

   create policy "manage own quests" on quest_templates for all using (auth.uid() = user_id);
   create policy "manage own logs" on daily_logs for all using (auth.uid() = user_id);

   -- Seed the 5 default quests whenever a profile is created
   create function public.seed_default_quests()
   returns trigger as $$
   begin
     insert into public.quest_templates (user_id, title, stat, xp, is_default) values
       (new.id, 'Solve today''s problem', 'STR', 15, true),
       (new.id, 'Ship real progress', 'AGI', 15, true),
       (new.id, 'Learn something new', 'INT', 10, true),
       (new.id, 'Show up, no excuses', 'VIT', 10, true),
       (new.id, 'Review & refine old work', 'SENSE', 10, true);
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_profile_created_seed_quests
     after insert on profiles
     for each row execute procedure public.seed_default_quests();
   ```
2. Create the transactional completion RPC in the same migration file (append below the above):
   ```sql
   create function public.complete_quest(p_log_id uuid, p_done boolean)
   returns void as $$
   declare
     v_user_id uuid;
     v_quest_id uuid;
     v_stat text;
     v_xp int;
     v_prev_done boolean;
     v_delta int;
   begin
     select user_id, quest_id, done into v_user_id, v_quest_id, v_prev_done
     from daily_logs where id = p_log_id;

     if v_user_id != auth.uid() then
       raise exception 'not authorized';
     end if;

     select stat, xp into v_stat, v_xp from quest_templates where id = v_quest_id;

     if v_prev_done = p_done then
       return; -- no-op, already in that state
     end if;

     v_delta := case when p_done then v_xp else -v_xp end;

     update daily_logs
       set done = p_done,
           completed_at = case when p_done then now() else null end,
           xp_awarded = case when p_done then v_xp else null end,
           verified_via = case when p_done then 'manual' else null end
       where id = p_log_id;

     execute format(
       'update player_stats set %I = greatest(0, %I + $1), updated_at = now() where user_id = $2',
       v_stat, v_stat
     ) using v_delta, v_user_id;
   end;
   $$ language plpgsql security definer;
   ```
3. Apply the migration.

**Acceptance criteria:**
- [ ] A newly created user (from a fresh signup) automatically has 5 rows in `quest_templates`.
- [ ] Calling `complete_quest` via the Supabase JS client's `.rpc()` from the browser console (while logged in) correctly increments the right stat column in `player_stats` and sets `done = true` on the target `daily_logs` row.
- [ ] Calling it again with `p_done = false` correctly reverses the XP.
- [ ] A different logged-in user cannot call `complete_quest` on someone else's `daily_logs` row (test by passing another user's log id — should raise the "not authorized" exception).

**Commit message:**
```
feat(db): quest_templates and daily_logs tables, default quest seeding, and transactional complete_quest RPC
```

**STOP. Wait for "go ahead" before Commit 7.**

---

## Commit 7 — Dashboard HUD: stats display

**Goal:** The dashboard shows live player stats, level, rank, and an XP bar — matching the original prototype's visual language, now driven by real database data.

**Depends on:** Commit 6.

**Steps:**
1. Create `src/hooks/usePlayerStats.ts` — a React Query hook that fetches the current user's `player_stats` row, and subscribes to Supabase Realtime changes on that row (`supabase.channel(...).on('postgres_changes', ...)`) to invalidate/refetch the query automatically on any update.
2. Create pure utility functions in `src/lib/gameMath.ts`:
   - `totalXP(stats)`, `levelOf(stats)`, `rankOf(level)`, `xpIntoLevel(stats)` — port the exact formulas from the original prototype (level = floor(totalXP/100)+1; rank thresholds E<10, D<20, C<35, B<50, A<70, S>=70).
3. Build `src/components/hud/RankBadge.tsx`, `StatGrid.tsx`, `XPBar.tsx`, `StatusBar.tsx` as presentational components consuming the stats object and the utility functions above. Reuse the HUD visual style (angular clipped panels, cyan glow, Rajdhani headers) from the original prototype's CSS, translated into Tailwind classes or a shared CSS file.
4. Replace the `DashboardPage` placeholder with the real `StatusBar` (which composes `RankBadge` + stat name/level + `XPBar` + `StatGrid`).

**Acceptance criteria:**
- [ ] Dashboard shows correct level/rank/XP bar based on the seeded (all-zero) stats for a fresh account.
- [ ] Manually updating a stat value directly in the Supabase dashboard's table editor causes the UI to update within a few seconds without a page refresh (proves the realtime subscription works).

**Commit message:**
```
feat(dashboard): live HUD stat display (rank, level, XP bar, stat grid) via realtime player_stats
```

**STOP. Wait for "go ahead" before Commit 8.**

---

## Commit 8 — Daily quest list: manual completion

**Goal:** Users see today's quests and can check them off; the dashboard reflects the change immediately.

**Depends on:** Commit 7.

**Steps:**
1. Create `src/hooks/useDailyQuests.ts`:
   - On mount, check whether `daily_logs` rows exist for `auth.uid()` and today's date.
   - If not, insert one `daily_logs` row per active (non-archived) `quest_templates` row for the user, `done: false`, for today — this is the client-side "ensure today's quests exist" step. (The server-side rollover job in Commit 11 will take over penalty-aware generation; this commit's job is only to make today's list exist at all so the feature is usable before the cron job exists.)
   - Fetch and return today's `daily_logs` joined with their `quest_templates` (title, stat, xp, verification_method).
2. Create `src/components/quests/QuestRow.tsx` — checkbox + title + stat/xp meta text, calling `supabase.rpc('complete_quest', { p_log_id, p_done })` on toggle, matching the visual style of the prototype's quest rows (done state strikes through and dims).
3. Create `src/components/quests/QuestList.tsx` rendering a list of `QuestRow`s from `useDailyQuests()`.
4. Wire `QuestList` into `DashboardPage` below the HUD status bar.

**Acceptance criteria:**
- [ ] First login of the day generates today's quest rows automatically (verify in the `daily_logs` table).
- [ ] Checking a quest updates its row to done, awards XP (visible on the HUD immediately, since it shares the same realtime-backed stats), and persists after a page refresh.
- [ ] Unchecking it reverses the XP correctly.

**Commit message:**
```
feat(quests): daily quest list with manual completion wired to complete_quest RPC
```

**STOP. Wait for "go ahead" before Commit 9.**

---

## Commit 9 — Custom quest management

**Goal:** Users can add, edit, and archive their own quests beyond the 5 defaults.

**Depends on:** Commit 8.

**Steps:**
1. Create `src/components/quests/AddQuestForm.tsx` — title text input + stat dropdown + XP number input, inserting a new row into `quest_templates` on submit.
2. Add an "archive" (soft-delete) action on non-default quest rows in the settings or quest list UI — sets `archived = true` rather than deleting, so historical `daily_logs` referencing it remain valid.
3. Ensure `useDailyQuests()`'s "ensure today's quests exist" logic only considers `archived = false` templates.

**Acceptance criteria:**
- [ ] A newly added custom quest appears in tomorrow's quest list (or today's, if added before today's rows were generated) and can be completed like any default quest.
- [ ] Archiving a quest removes it from future days but does not delete or corrupt past `daily_logs` rows referencing it.
- [ ] Default quests (`is_default = true`) cannot be archived or deleted from the UI (hide that control for them).

**Commit message:**
```
feat(quests): custom quest creation and archiving
```

**STOP. Wait for "go ahead" before Commit 10.**

---

## Commit 10 — Database migration: streaks table

**Goal:** A place to track streak state exists, ready for the rollover job in Commit 11.

**Depends on:** Commit 9.

**Steps:**
1. Create `supabase/migrations/0003_streaks.sql`:
   ```sql
   create table streaks (
     user_id uuid primary key references profiles(id) on delete cascade,
     current_streak int not null default 0,
     longest_streak int not null default 0,
     last_active_date date,
     penalty_active boolean not null default false
   );

   alter table streaks enable row level security;
   create policy "select own streak" on streaks for select using (auth.uid() = user_id);
   -- No insert/update policy for regular users: only the service-role
   -- Edge Function (Commit 11) is allowed to write to this table.

   create function public.seed_streak_row()
   returns trigger as $$
   begin
     insert into public.streaks (user_id) values (new.id);
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_profile_created_seed_streak
     after insert on profiles
     for each row execute procedure public.seed_streak_row();
   ```
2. Add a small `useStreak()` hook and display the current streak count on the dashboard (read-only — no write path from the client, matching the RLS above).

**Acceptance criteria:**
- [ ] New users get a `streaks` row with `current_streak = 0` automatically.
- [ ] The dashboard displays the streak count.
- [ ] A regular logged-in user cannot update their own `streaks` row directly via the client (RLS should reject it) — verify this explicitly, since the whole penalty system's integrity depends on it.

**Commit message:**
```
feat(db): streaks table, service-role-only write policy, and dashboard streak display
```

**STOP. Wait for "go ahead" before Commit 11.**

---

## Commit 11 — Edge Function: daily rollover (streak + penalty engine)

**Goal:** A scheduled server-side job evaluates yesterday, applies streak/penalty logic, and generates today's quests — replacing the client-side "ensure today's quests exist" logic from Commit 8 as the source of truth.

**Depends on:** Commit 10.

**Steps:**
1. `supabase functions new daily-rollover`.
2. Write `supabase/functions/daily-rollover/index.ts`. Logic, in order, for each user:
   - Skip if `streaks.last_active_date` is already today (already processed).
   - If `last_active_date` is null (first-ever run for this user), just create today's `daily_logs` from active `quest_templates` and set `last_active_date` to today. Stop here for this user.
   - Otherwise, fetch yesterday's (`last_active_date`'s) `daily_logs`.
     - If every row has `done = true`: increment `current_streak`, update `longest_streak` if exceeded, set `penalty_active = false`.
     - If any row has `done = false`: for each incomplete row's `stat`, decrement that stat column in `player_stats` by `8 * (number of incomplete quests for that stat)`, clamped at 0. Set `current_streak = 0`, `penalty_active = true`.
   - Generate today's `daily_logs` from active `quest_templates`.
   - If `penalty_active` is true, also insert one extra "Redemption Trial" `daily_logs` row (create a matching ad-hoc `quest_templates` row with `is_default = false`, a title like "Redemption Trial — clear this first", `stat` = the user's current lowest stat, `xp = 25`, and set `is_penalty = true` on the `daily_logs` row).
   - Update `streaks.last_active_date` to today.
   - This function must use the **service role key** (not the anon key) since it writes to `streaks` directly, bypassing RLS by design.
3. Deploy: `supabase functions deploy daily-rollover`.
4. Schedule it with `pg_cron` (via a migration or the Supabase dashboard's Cron UI) to run once daily — pick a single UTC time for v1 (e.g. 00:00 UTC); per-user timezone handling is an explicit non-goal for this commit.
5. Once this function exists and is scheduled, remove the "ensure today's quests exist" insertion logic from `useDailyQuests()` (Commit 8) — the client should now only *read* today's `daily_logs`, never create them. Leave a clear code comment explaining why.

**Acceptance criteria:**
- [ ] Manually invoking the function (via `supabase functions invoke daily-rollover` or an HTTP call) against a test user who left yesterday's quests incomplete correctly: decays the right stats, zeroes the streak, sets `penalty_active = true`, and inserts a Redemption Trial quest into today's list.
- [ ] Running it again against a test user who completed everything yesterday increments the streak and does not touch stats negatively.
- [ ] The function is confirmed scheduled (visible in the Supabase dashboard's Cron section or `pg_cron` job list).
- [ ] The frontend no longer creates `daily_logs` rows client-side (confirm by reading the diff).

**Commit message:**
```
feat(backend): daily-rollover Edge Function for streak tracking, stat decay penalties, and Redemption Trial generation, on a daily cron schedule
```

**STOP. Wait for "go ahead" before Commit 12.**

---

## Commit 12 — Database migration + UI: The Forge

**Goal:** Reaching 3/5/7/14/30-day streaks unlocks a Forge challenge; users see and complete it.

**Depends on:** Commit 11.

**Steps:**
1. Create `supabase/migrations/0004_forge.sql`:
   ```sql
   create table forge_challenges (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references profiles(id) on delete cascade not null,
     tier text not null check (tier in ('spark','build','dungeon')),
     brief text not null,
     status text not null default 'active' check (status in ('active','completed','expired')),
     unlocked_at timestamptz not null default now(),
     deadline timestamptz,
     completed_at timestamptz,
     reward_xp int not null default 0
   );

   alter table forge_challenges enable row level security;
   create policy "select own forge" on forge_challenges for select using (auth.uid() = user_id);
   create policy "complete own forge" on forge_challenges for update using (auth.uid() = user_id);
   -- Inserts are service-role only (done by the rollover function).
   ```
2. In `daily-rollover`'s logic (extend Commit 11's function): after updating `current_streak`, check if it just crossed 3, 5, 7, 14, or 30 for the first time (track this by checking if no `forge_challenges` row of the corresponding tier already exists for that streak length — simplest approach: one check per threshold per user, e.g. "has this user ever gotten a 'spark' tier challenge" for the 3-day threshold, tracked via `exists(select 1 from forge_challenges where user_id = ? and tier = 'spark')" so it only ever triggers once). Insert a new `forge_challenges` row with a hardcoded starter `brief` per tier for v1 (e.g. spark: "Ship one working component or script end-to-end today.", build: "Spend the next few days building a small complete feature for one of your side projects.", dungeon: "Timed sprint: build something substantial in the time before your deadline.") and a `deadline` (e.g. `now() + interval '1 day'` for spark, `'5 days'` for build, `'3 days'` for dungeon).
3. Create `src/pages/ForgePage.tsx` showing the active challenge (if any) with a "Mark Complete" button (updates `status = 'completed'`, `completed_at = now()`, and awards `reward_xp` — this XP award needs its own small RPC function similar in shape to `complete_quest`, e.g. `complete_forge(p_forge_id uuid)`, adding `reward_xp` to a chosen stat or split across stats — decide and document whichever you pick) and a history list of past challenges.

**Acceptance criteria:**
- [ ] A test user manually pushed to a 3-day streak (via direct DB edit + re-running rollover, or by waiting 3 real days) gets exactly one `spark` tier `forge_challenges` row.
- [ ] Marking a Forge challenge complete awards XP and moves it out of the "active" view into history.
- [ ] Missing a Forge deadline (test by setting `deadline` in the past manually) does not affect `streaks.current_streak` or `penalty_active` — these systems are independent, confirm by inspecting both tables after a forced-expired scenario.

**Commit message:**
```
feat(forge): streak-triggered Spark/Build/Dungeon challenges with completion tracking and history
```

**STOP. Wait for "go ahead" before Commit 13.**

---

## Commit 13 — Database migration + Edge Function: GitHub quest verification

**Goal:** A quest set to `verification_method = 'github'` auto-completes when the user pushes a commit to their linked repo.

**Depends on:** Commit 12.

**Steps:**
1. Create `supabase/migrations/0005_github_links.sql`:
   ```sql
   create table github_links (
     user_id uuid primary key references profiles(id) on delete cascade,
     github_username text,
     repo_full_name text,
     last_checked_at timestamptz
   );

   alter table github_links enable row level security;
   create policy "manage own github link" on github_links for all using (auth.uid() = user_id);
   ```
2. Add a `SettingsPage.tsx` section where the user types their `owner/repo` string (e.g. `manjeet/portfolio-site`) to fill `repo_full_name`, and it auto-fills `github_username` from their GitHub OAuth identity (`user.user_metadata.user_name` from the Supabase session).
3. `supabase functions new github-verify`. Write `supabase/functions/github-verify/index.ts`:
   - For each user with a `github_links` row and a repo set: fetch commits since `last_checked_at` from `https://api.github.com/repos/{repo_full_name}/commits?since={last_checked_at}`, authenticated using the GitHub provider access token stored by Supabase Auth (retrieve it via the admin API's `getUserIdentities`/session provider token — document exactly which Supabase Auth API call you use here, since this detail is easy to get subtly wrong).
   - If at least one new commit exists: find today's `daily_logs` row for that user where the joined `quest_templates.verification_method = 'github'` and `done = false`; mark it done via the same kind of transactional update `complete_quest` does (either call that RPC using the service role, or replicate its logic — prefer calling the existing RPC to avoid duplicating the XP math).
   - Update `github_links.last_checked_at` to now.
4. Schedule this function on a shorter interval than the daily rollover (e.g. every 30 minutes) via `pg_cron`.
5. On the quest edit form (Commit 9's `AddQuestForm`, extended), allow choosing `verification_method: 'github'` for a quest — when chosen, hide the manual checkbox for that quest row in the UI (or gray it out with a "verified automatically" label) so the user isn't tempted to self-check it.

**Acceptance criteria:**
- [ ] Linking a real repo and pushing a real commit results in the linked quest auto-completing within one polling interval, without the user touching the checkbox.
- [ ] A quest set to `github` verification does not show a clickable manual checkbox in the UI.
- [ ] The function correctly skips users with no repo linked, without erroring.

**Commit message:**
```
feat(github): repo linking and scheduled commit-polling Edge Function for auto-verified quests
```

**STOP. Wait for "go ahead" before Commit 14.**

---

## Commit 14 — Database migration + Edge Function + UI: AI Judge

**Goal:** A quest set to `verification_method = 'ai_judge'` can be completed by submitting text/code that Claude grades.

**Depends on:** Commit 13.

**Steps:**
1. Create `supabase/migrations/0006_ai_submissions.sql` — exactly the schema already agreed on:
   ```sql
   create table ai_submissions (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references profiles(id) not null,
     quest_id uuid references quest_templates(id) not null,
     daily_log_id uuid references daily_logs(id) not null,
     submission_text text not null,
     model text not null,
     pass boolean,
     score int check (score between 0 and 100),
     feedback text,
     xp_awarded int,
     stat_allocated text check (stat_allocated in ('STR','INT','VIT','SENSE','AGI')),
     status text not null default 'pending' check (status in ('pending','graded','error')),
     created_at timestamptz not null default now(),
     graded_at timestamptz
   );

   create index ai_submissions_user_quest_idx on ai_submissions(user_id, quest_id, created_at desc);

   alter table ai_submissions enable row level security;
   create policy "select own submissions" on ai_submissions for select using (auth.uid() = user_id);
   create policy "insert own submissions" on ai_submissions for insert with check (auth.uid() = user_id);
   -- No update policy for regular users: grading writes are service-role only.
   ```
   Also allow `rubric` to be set on `quest_templates` (already added as a nullable column in Commit 6's table — if it wasn't added there, add it now via `alter table quest_templates add column rubric text;` in this migration instead).
2. Create `src/components/quests/AiSubmitModal.tsx` — for quests with `verification_method = 'ai_judge'`, clicking the quest row opens this modal instead of toggling a checkbox. It has a textarea for the submission, and on submit: inserts a `pending` row into `ai_submissions`, then polls (or subscribes via realtime) for that row's `status` to change to `graded`, then displays `feedback`, `score`, and whether it passed.
3. `supabase functions new ai-judge`. Write `supabase/functions/ai-judge/index.ts`:
   - Triggered either by a Postgres webhook on `ai_submissions` insert (preferred — set this up via Supabase's Database Webhooks UI pointing at this function's URL) or by the frontend directly invoking it right after the insert (simpler for v1 — pick this for now and note the webhook approach as a future improvement).
   - On invocation, receives the new `ai_submissions.id`. Loads that row plus the joined `quest_templates.rubric` and `title`.
   - Calls the Anthropic API (`https://api.anthropic.com/v1/messages`) using the `ANTHROPIC_API_KEY` secret, with a system prompt along these lines: *"You are a strict but fair code/skill evaluator for a gamification app. Grade the following submission against this rubric: {rubric}. Respond with ONLY a JSON object: {"pass": boolean, "score": 0-100, "feedback": "1-3 sentences", "xp": integer}. No prose outside the JSON."* — include the quest title and the user's `submission_text` in the user turn.
   - Parse the JSON response (strip markdown code fences defensively before parsing, since models sometimes wrap JSON in fences despite instructions).
   - Update the `ai_submissions` row: `status = 'graded'`, `pass`, `score`, `feedback`, `xp_awarded = xp`, `stat_allocated` = the quest's `stat`, `graded_at = now()`.
   - If `pass` is true: call `complete_quest`-equivalent logic to mark the linked `daily_logs` row done and award `xp` to `stat_allocated` in `player_stats` (again, prefer reusing the existing RPC over duplicating logic, run with service role privileges since this function isn't the row's own authenticated user).
   - Wrap the whole handler in a try/catch; on any failure, set `status = 'error'` and a generic `feedback` message rather than leaving the row stuck on `pending` forever.
4. Update `AddQuestForm` to let the user pick `verification_method: 'ai_judge'` and, when chosen, show a `rubric` textarea (required for that method).

**Acceptance criteria:**
- [ ] Submitting a genuinely correct, well-written solution to an `ai_judge` quest results in `pass: true`, a sensible score, and the quest marked done with XP awarded.
- [ ] Submitting an obviously wrong or empty solution results in `pass: false` and no XP awarded.
- [ ] The `ai_submissions` row never gets stuck on `status = 'pending'` — even a forced API failure (e.g. temporarily using an invalid API key) results in `status = 'error'` with a user-visible message, not a silently hanging modal.
- [ ] A user cannot read another user's `ai_submissions` rows (RLS check).

**Commit message:**
```
feat(ai-judge): AI-graded quest verification via Claude, with submission UI and graceful failure handling
```

**STOP. Wait for "go ahead" before Commit 15.**

---

## Commit 15 — Database migration + UI: Boss Fights

**Goal:** Weekly/monthly larger challenges, structurally similar to Forge but on a fixed calendar cadence rather than streak-triggered.

**Depends on:** Commit 14.

**Steps:**
1. Create `supabase/migrations/0007_boss_challenges.sql`:
   ```sql
   create table boss_challenges (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references profiles(id) on delete cascade not null,
     title text not null,
     brief text not null,
     period text not null check (period in ('weekly','monthly')),
     status text not null default 'active' check (status in ('active','completed','expired')),
     started_at timestamptz not null default now(),
     deadline timestamptz not null,
     completed_at timestamptz
   );

   alter table boss_challenges enable row level security;
   create policy "select own boss" on boss_challenges for select using (auth.uid() = user_id);
   create policy "complete own boss" on boss_challenges for update using (auth.uid() = user_id);
   ```
2. Extend `daily-rollover` (or add a second, separate weekly-scheduled Edge Function — prefer a separate function named `weekly-boss` to keep the daily job's responsibilities from ballooning) to insert a new `boss_challenges` row for every active user at the start of each week (and a monthly one at the start of each month), with a hardcoded starter brief for v1 (e.g. "This week: ship one full feature for a side project, start to finish.").
3. Create `src/pages/BossPage.tsx`, structurally mirroring `ForgePage.tsx` — active challenge card + manual "Mark Complete" (Boss Fights are self-reported for v1, not AI-graded or GitHub-verified — keep scope contained) + history.

**Acceptance criteria:**
- [ ] Every active user has exactly one active `weekly` boss challenge at any time (verify no duplicates get created on repeated function runs within the same week).
- [ ] Marking one complete updates its status and shows in history; a new one appears at the next week boundary.

**Commit message:**
```
feat(boss): weekly/monthly Boss Fight challenges with self-reported completion
```

**STOP. Wait for "go ahead" before Commit 16.**

---

## Commit 16 — Analytics dashboard

**Goal:** Visual history of progress: completion heatmap, stat growth over time, completion rate by stat.

**Depends on:** Commit 15.

**Steps:**
1. `npm install recharts`.
2. Create `src/hooks/useAnalytics.ts` with three queries:
   - Daily completion ratio per day for the last ~90 days (aggregate `daily_logs` grouped by `log_date`, computing `done_count / total_count`) — feeds the heatmap.
   - `player_stats` isn't historical by itself, so for a real growth chart you need a history table. Add a lightweight `stat_history` table in this same commit (append to a new migration `supabase/migrations/0008_stat_history.sql`) with `(user_id, recorded_at, str, int_, vit, sense, agi)`, and have `daily-rollover` (Commit 11's function) insert one snapshot row per user per day right after it finishes updating stats. This is the cleanest way to get a real trend line without retrofitting history onto a table that was never designed to keep it.
   - Completion rate grouped by `stat` (join `daily_logs` → `quest_templates`, group by `stat`, compute done/total ratio) over a selectable window (last 7/30/90 days).
3. Build `src/components/analytics/Heatmap.tsx` (a simple grid of colored day-cells, GitHub-contributions-style — a from-scratch CSS grid is fine, no need for a dedicated heatmap library), `StatChart.tsx` (a `recharts` `LineChart` of the 5 stats over time from `stat_history`), and `CompletionRateChart.tsx` (a `recharts` `BarChart` by stat).
4. Assemble these into `src/pages/AnalyticsPage.tsx`.

**Acceptance criteria:**
- [ ] Heatmap accurately reflects real completion history from `daily_logs` (spot-check a couple of known days).
- [ ] Stat chart shows a visible trend line once at least 2-3 days of `stat_history` snapshots exist.
- [ ] Completion-rate-by-stat chart correctly identifies the stat with the lowest completion ratio for a test account seeded with lopsided data.

**Commit message:**
```
feat(analytics): completion heatmap, stat growth chart, and per-stat completion rate via new stat_history table
```

**STOP. Wait for "go ahead" before Commit 17.**

---

## Commit 17 — Database migration + Edge Function: notifications

**Goal:** Users get an evening email if quests are incomplete, and can control this from Settings.

**Depends on:** Commit 16.

**Steps:**
1. Create `supabase/migrations/0009_notification_prefs.sql`:
   ```sql
   create table notification_prefs (
     user_id uuid primary key references profiles(id) on delete cascade,
     reminder_time time not null default '20:00',
     email_enabled boolean not null default true
   );

   alter table notification_prefs enable row level security;
   create policy "manage own prefs" on notification_prefs for all using (auth.uid() = user_id);

   create function public.seed_notification_prefs()
   returns trigger as $$
   begin
     insert into public.notification_prefs (user_id) values (new.id);
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_profile_created_seed_prefs
     after insert on profiles
     for each row execute procedure public.seed_notification_prefs();
   ```
2. Add a toggle + time picker to `SettingsPage.tsx` writing to this table.
3. `supabase functions new daily-reminder`. Write `supabase/functions/daily-reminder/index.ts`:
   - For every user with `email_enabled = true` whose local reminder time has just passed (v1 simplification: run this hourly via cron and check `extract(hour from reminder_time) = extract(hour from now())`, accepting UTC-only granularity as a known limitation — document this clearly rather than half-implementing real timezone support), check whether today's `daily_logs` still has any `done = false` rows.
   - If so, send an email via the Resend API (`RESEND_API_KEY` secret) to the user's email (from `auth.users.email`), with subject like "Your quests are still open" and a short plain-text body mentioning how many are left and, if `streaks.penalty_active` or the streak is at risk, a mention of that stake.
4. Schedule this function hourly via `pg_cron`.

**Acceptance criteria:**
- [ ] Toggling `email_enabled` off in Settings stops emails for that user (verify by checking the function's query excludes them).
- [ ] A test account with incomplete quests and a reminder time matching the current hour receives an email when the function runs (test by invoking manually with the account's `reminder_time` set to the current hour).
- [ ] A user with all quests complete does not receive an email even if their reminder hour matches.

**Commit message:**
```
feat(notifications): evening reminder emails via Resend, with per-user opt-out and reminder time
```

**STOP. Wait for "go ahead" before Commit 18.**

---

## Commit 18 — Hardening, error states, and deployment

**Goal:** The app is production-ready: no unhandled crashes, sensible loading/empty/error states everywhere, deployed and reachable at a real URL.

**Depends on:** Commit 17.

**Steps:**
1. Add `src/components/common/ErrorBoundary.tsx` wrapping the whole app in `main.tsx`, showing a plain "Something went wrong" fallback UI rather than a blank white screen.
2. Audit every React Query hook built across all previous commits: confirm each one exposes and the corresponding page handles `isLoading` (skeleton or spinner) and `isError` (a visible message, not a silent failure) states — go through `usePlayerStats`, `useDailyQuests`, `useForge`(referenced, build if not already a discrete hook), `useAnalytics`, and any others.
3. Run through every RLS policy created across all migrations in this plan and confirm, table by table, that: (a) every table has RLS enabled, (b) every policy correctly scopes to `auth.uid()`, (c) no table meant to be service-role-only (`streaks`, grading columns of `ai_submissions`) has an update policy exposed to regular users.
4. `npm run build` locally and fix any TypeScript or build errors.
5. Deploy the frontend to Vercel: connect the GitHub repo, set the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables in Vercel's project settings, deploy.
6. Confirm all Edge Function secrets (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`) are set on the Supabase project (not just locally) via `supabase secrets set`.
7. Rewrite `README.md` properly: what the app is, the full feature list, tech stack, local setup instructions, and a link to this plan file for anyone extending it.

**Acceptance criteria:**
- [ ] The deployed Vercel URL is fully functional end to end: login → onboarding (new account) → dashboard → complete a manual quest → check Forge/Boss/Analytics/Settings pages all load without errors.
- [ ] Every table's RLS has been explicitly re-verified against the checklist in step 3, not assumed correct from memory.
- [ ] `npm run build` completes with zero errors.
- [ ] README accurately describes the finished app.

**Commit message:**
```
chore: hardening pass (error boundaries, loading/error states, RLS audit), production deployment, and final README
```

**STOP. This is the last commit in v1. Wait for the user's confirmation before considering anything beyond this scope (e.g. Shadow Army raids, Instant Dungeon arena, multiclassing) — those were explicitly deferred, not part of this plan.**
