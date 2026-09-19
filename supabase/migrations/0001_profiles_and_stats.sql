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
