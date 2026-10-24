create table stat_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  recorded_at timestamptz not null default now(),
  str int not null default 0,
  int_ int not null default 0,
  vit int not null default 0,
  sense int not null default 0,
  agi int not null default 0
);

alter table stat_history enable row level security;
create policy "select own stat history" on stat_history for select using (auth.uid() = user_id);
-- Inserts are service-role only (done by daily-rollover function).

create index stat_history_user_time_idx on stat_history(user_id, recorded_at desc);
