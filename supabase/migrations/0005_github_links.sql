create table github_links (
  user_id uuid primary key references profiles(id) on delete cascade,
  github_username text,
  repo_full_name text,
  last_checked_at timestamptz
);

alter table github_links enable row level security;
create policy "manage own github link" on github_links for all using (auth.uid() = user_id);
