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
