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
-- Inserts are service-role only (done by weekly-boss function).
