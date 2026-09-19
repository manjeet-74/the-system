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
