-- Roadmap foundation: tables for profile cosmetics, coins, achievements, store,
-- daily system messages, guilds, co-op raids and web-push subscriptions.
-- Logic (RPCs, triggers) lives in the next migration.

-- ---------------------------------------------------------------- profiles
alter table profiles
  add column if not exists public_profile boolean not null default false,
  add column if not exists equipped_title text,
  add column if not exists equipped_theme text,
  add column if not exists equipped_frame text;

alter table profiles drop constraint if exists profiles_username_len;
alter table profiles
  add constraint profiles_username_len
  check (username is null or char_length(username) between 1 and 40);

-- Clients may only edit the harmless columns. Cosmetics (title/theme/frame) change
-- through equip_* RPCs that verify ownership, so nobody can self-grant a purchase.
revoke update on profiles from authenticated, anon;
grant update (username, class, courage_test_passed, public_profile) on profiles to authenticated;

-- ------------------------------------------------------------------ wallet
create table if not exists player_wallet (
  user_id uuid primary key references profiles(id) on delete cascade,
  coins int not null default 0 check (coins >= 0)
);
alter table player_wallet enable row level security;
drop policy if exists "select own wallet" on player_wallet;
create policy "select own wallet" on player_wallet for select using (auth.uid() = user_id);
-- No client write policies: coins only change through SECURITY DEFINER functions.

insert into player_wallet (user_id, coins)
select p.id, coalesce(s.str + s.int_ + s.vit + s.sense + s.agi, 0)
from profiles p left join player_stats s on s.user_id = p.id
on conflict (user_id) do nothing;

create or replace function public.seed_wallet()
returns trigger as $$
begin
  insert into public.player_wallet (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_profile_created_seed_wallet on profiles;
create trigger on_profile_created_seed_wallet
  after insert on profiles
  for each row execute procedure public.seed_wallet();

-- Coins are paid exactly once per quest log, so complete -> undo -> redo can't farm them.
alter table daily_logs add column if not exists coins_paid boolean not null default false;

-- ------------------------------------------------------------ achievements
create table if not exists achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  title text,
  coin_reward int not null default 0,
  sort int not null default 0
);
create table if not exists user_achievements (
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_id text not null references achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);
alter table achievements enable row level security;
alter table user_achievements enable row level security;
drop policy if exists "read achievements" on achievements;
create policy "read achievements" on achievements for select to authenticated using (true);
drop policy if exists "select own unlocks" on user_achievements;
create policy "select own unlocks" on user_achievements for select using (auth.uid() = user_id);

insert into achievements (id, name, description, icon, title, coin_reward, sort) values
  ('first_blood',   'First Blood',      'Complete your first quest.',                  '⚔', 'Awakened',        10, 10),
  ('centurion',     'Centurion',        'Complete 100 quests.',                        '🛡', 'Centurion',      100, 20),
  ('week_warrior',  'Flawless Week',    'Reach a 7-day streak.',                       '🔥', 'Unbroken',        50, 30),
  ('month_monarch', 'Iron Will',        'Reach a 30-day streak.',                      '👑', 'Iron Will',      200, 40),
  ('forge_initiate','Forged',           'Complete a Forge challenge.',                 '⚒', 'Forged',          40, 50),
  ('boss_slayer',   'Boss Slayer',      'Defeat a boss.',                              '💀', 'Boss Slayer',     60, 60),
  ('raider',        'Raider',           'Clear a co-op raid with another hunter.',     '🤝', 'Raider',          75, 70),
  ('judged_worthy', 'Judged Worthy',    'Pass an AI Judge evaluation.',                '⚖', 'Judged Worthy',    30, 80),
  ('specialist',    'Specialist',       'Raise a single stat to 300.',                 '🎯', 'Specialist',      60, 90),
  ('guild_member',  'Not Alone',        'Join a guild.',                               '🏰', null,              20, 100),
  ('rank_d',        'D-Rank Hunter',    'Reach rank D (level 10).',                    'D',  'D-Rank Hunter',   50, 110),
  ('rank_c',        'C-Rank Hunter',    'Reach rank C (level 20).',                    'C',  'C-Rank Hunter',  100, 120),
  ('rank_b',        'B-Rank Hunter',    'Reach rank B (level 35).',                    'B',  'B-Rank Hunter',  200, 130),
  ('rank_a',        'A-Rank Hunter',    'Reach rank A (level 50).',                    'A',  'A-Rank Hunter',  400, 140),
  ('rank_s',        'S-Rank Hunter',    'Reach rank S (level 70).',                    'S',  'S-Rank Hunter',  800, 150)
on conflict (id) do update
  set name = excluded.name, description = excluded.description, icon = excluded.icon,
      title = excluded.title, coin_reward = excluded.coin_reward, sort = excluded.sort;

-- ------------------------------------------------------------------- store
create table if not exists store_items (
  id text primary key,
  kind text not null check (kind in ('theme', 'title', 'frame')),
  name text not null,
  description text not null,
  price int not null check (price >= 0),
  value text not null,
  sort int not null default 0
);
create table if not exists purchases (
  user_id uuid not null references profiles(id) on delete cascade,
  item_id text not null references store_items(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, item_id)
);
alter table store_items enable row level security;
alter table purchases enable row level security;
drop policy if exists "read store" on store_items;
create policy "read store" on store_items for select to authenticated using (true);
drop policy if exists "select own purchases" on purchases;
create policy "select own purchases" on purchases for select using (auth.uid() = user_id);

insert into store_items (id, kind, name, description, price, value, sort) values
  ('theme_crimson', 'theme', 'Crimson Monarch', 'Recolors the whole HUD blood red.',        150, 'crimson', 10),
  ('theme_violet',  'theme', 'Shadow Violet',   'Recolors the whole HUD royal violet.',     150, 'violet',  20),
  ('theme_emerald', 'theme', 'Emerald Gate',    'Recolors the whole HUD emerald green.',    150, 'emerald', 30),
  ('title_shadow',  'title', 'Shadow Monarch',  'A title fit for the ruler of shadows.',    300, 'Shadow Monarch', 40),
  ('title_ruler',   'title', 'Ruler of Code',   'Display it beside your name.',             250, 'Ruler of Code',  50),
  ('title_grinder', 'title', 'The Grinder',     'For those who never skip a day.',          120, 'The Grinder',    60),
  ('title_night',   'title', 'Night Owl',       'Quests are done when the world sleeps.',   100, 'Night Owl',      70),
  ('frame_gold',    'frame', 'Gold Frame',      'A gold ring around your portrait.',        200, '#f5c33f', 80),
  ('frame_violet',  'frame', 'Violet Frame',    'A violet ring around your portrait.',      200, '#a78bfa', 90),
  ('frame_crimson', 'frame', 'Crimson Frame',   'A crimson ring around your portrait.',     200, '#ff4d5e', 100),
  ('frame_emerald', 'frame', 'Emerald Frame',   'An emerald ring around your portrait.',    200, '#34d399', 110)
on conflict (id) do update
  set kind = excluded.kind, name = excluded.name, description = excluded.description,
      price = excluded.price, value = excluded.value, sort = excluded.sort;

-- -------------------------------------------------------- system messages
create table if not exists system_messages (
  user_id uuid not null references profiles(id) on delete cascade,
  day date not null,
  message text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table system_messages enable row level security;
drop policy if exists "select own messages" on system_messages;
create policy "select own messages" on system_messages for select using (auth.uid() = user_id);
-- Inserts come from the system-message edge function (service role).

-- ----------------------------------------------------------------- guilds
create table if not exists guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 24),
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists guilds_name_lower_idx on guilds (lower(name));

create table if not exists guild_members (
  user_id uuid primary key references profiles(id) on delete cascade,
  guild_id uuid not null references guilds(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now()
);
create index if not exists guild_members_guild_idx on guild_members (guild_id);
-- RLS on, no policies: guild data is only reachable through the RPCs below.
alter table guilds enable row level security;
alter table guild_members enable row level security;

-- ------------------------------------------------------------------ raids
create table if not exists raids (
  id uuid primary key default gen_random_uuid(),
  boss_id uuid not null references boss_challenges(id) on delete cascade,
  boss_title text not null,
  boss_brief text not null,
  host_id uuid not null references profiles(id) on delete cascade,
  guest_id uuid references profiles(id) on delete set null,
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  host_evidence text,
  guest_evidence text,
  host_done_at timestamptz,
  guest_done_at timestamptz,
  status text not null default 'open' check (status in ('open', 'active', 'cleared')),
  deadline timestamptz not null,
  created_at timestamptz not null default now(),
  cleared_at timestamptz,
  unique (host_id, boss_id)
);
alter table raids enable row level security;
drop policy if exists "select own raids" on raids;
create policy "select own raids" on raids for select
  using (auth.uid() = host_id or auth.uid() = guest_id);

-- ------------------------------------------------------------------- push
create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "manage own push subs" on push_subscriptions;
create policy "manage own push subs" on push_subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
