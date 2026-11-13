-- Roadmap logic: coins, achievements, store, leaderboard, guilds, co-op raids.
-- Everything a player earns or spends is decided here, server-side — the browser can
-- only ask. Internal helpers are not executable by clients (see the revokes at the end).

-- ---------------------------------------------------------------- helpers
create or replace function public.add_coins(p_user uuid, p_amount int)
returns void as $$
begin
  insert into player_wallet (user_id, coins) values (p_user, greatest(0, p_amount))
  on conflict (user_id) do update set coins = greatest(0, player_wallet.coins + p_amount);
end;
$$ language plpgsql security definer set search_path = public;

-- Split XP evenly across the five stats (same remainder-dropping rule as forge/boss).
create or replace function public.award_even_xp(p_user uuid, p_total int)
returns void as $$
begin
  update player_stats
    set str   = str   + (p_total / 5),
        int_  = int_  + (p_total / 5),
        vit   = vit   + (p_total / 5),
        sense = sense + (p_total / 5),
        agi   = agi   + (p_total / 5),
        updated_at = now()
    where user_id = p_user;
end;
$$ language plpgsql security definer set search_path = public;

-- ----------------------------------------------------------- achievements
create or replace function public.check_achievements(p_user uuid)
returns void as $$
declare
  v_quests int;
  v_longest int;
  v_forge int;
  v_boss int;
  v_raid int;
  v_ai int;
  v_level int;
  v_maxstat int;
  v_guild int;
  r record;
  v_ok boolean;
begin
  select count(*) into v_quests from daily_logs where user_id = p_user and done;
  select coalesce(max(longest_streak), 0) into v_longest from streaks where user_id = p_user;
  select count(*) into v_forge from forge_challenges where user_id = p_user and status = 'completed';
  select count(*) into v_boss from boss_challenges where user_id = p_user and status = 'completed';
  select count(*) into v_raid from raids
    where status = 'cleared' and (host_id = p_user or guest_id = p_user);
  select count(*) into v_ai from ai_submissions where user_id = p_user and pass is true;
  select (str + int_ + vit + sense + agi) / 100 + 1, greatest(str, int_, vit, sense, agi)
    into v_level, v_maxstat from player_stats where user_id = p_user;
  select count(*) into v_guild from guild_members where user_id = p_user;

  for r in select id, coin_reward from achievements loop
    v_ok := case r.id
      when 'first_blood'    then v_quests >= 1
      when 'centurion'      then v_quests >= 100
      when 'week_warrior'   then v_longest >= 7
      when 'month_monarch'  then v_longest >= 30
      when 'forge_initiate' then v_forge >= 1
      when 'boss_slayer'    then v_boss >= 1
      when 'raider'         then v_raid >= 1
      when 'judged_worthy'  then v_ai >= 1
      when 'specialist'     then coalesce(v_maxstat, 0) >= 300
      when 'guild_member'   then v_guild >= 1
      when 'rank_d'         then coalesce(v_level, 1) >= 10
      when 'rank_c'         then coalesce(v_level, 1) >= 20
      when 'rank_b'         then coalesce(v_level, 1) >= 35
      when 'rank_a'         then coalesce(v_level, 1) >= 50
      when 'rank_s'         then coalesce(v_level, 1) >= 70
      else false
    end;
    if v_ok then
      insert into user_achievements (user_id, achievement_id) values (p_user, r.id)
      on conflict do nothing;
      if found then
        perform public.add_coins(p_user, r.coin_reward);
      end if;
    end if;
  end loop;
end;
$$ language plpgsql security definer set search_path = public;

-- Called by the client when it opens Profile/Achievements, so rank-based unlocks that
-- happen outside a trigger (e.g. AI-judge XP) are still picked up. Idempotent.
create or replace function public.sync_achievements()
returns void as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform public.check_achievements(auth.uid());
end;
$$ language plpgsql security definer set search_path = public;

-- -------------------------------------------- coin + achievement triggers
-- One trigger on daily_logs covers every completion path: the complete_quest RPC,
-- github-verify and ai-judge all flip done=true, so all of them pay coins and unlock.
create or replace function public.log_pay_coins()
returns trigger as $$
begin
  if new.done and not old.done and not new.coins_paid then
    perform public.add_coins(new.user_id, coalesce(new.xp_awarded, 0));
    new.coins_paid := true;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists daily_logs_pay_coins on daily_logs;
create trigger daily_logs_pay_coins
  before update of done on daily_logs
  for each row execute procedure public.log_pay_coins();

create or replace function public.log_check_achievements()
returns trigger as $$
begin
  perform public.check_achievements(new.user_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists daily_logs_check_achievements on daily_logs;
create trigger daily_logs_check_achievements
  after update of done on daily_logs
  for each row when (new.done and not old.done)
  execute procedure public.log_check_achievements();

-- ----------------------------------------- forge / boss now pay coins too
create or replace function public.complete_forge(p_forge_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_reward_xp int;
  v_status text;
begin
  select user_id, reward_xp, status into v_user_id, v_reward_xp, v_status
    from forge_challenges where id = p_forge_id;

  if v_user_id is distinct from auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_status <> 'active' then
    return;
  end if;

  update forge_challenges set status = 'completed', completed_at = now() where id = p_forge_id;
  perform public.award_even_xp(v_user_id, v_reward_xp);
  perform public.add_coins(v_user_id, v_reward_xp / 2);
  perform public.check_achievements(v_user_id);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.complete_boss(p_boss_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_status text;
  v_period text;
  v_deadline timestamptz;
  v_total_xp int;
begin
  select user_id, status, period, deadline into v_user_id, v_status, v_period, v_deadline
    from boss_challenges where id = p_boss_id;

  if v_user_id is null then
    raise exception 'boss not found';
  end if;
  if v_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;
  if v_status <> 'active' then
    return;
  end if;
  if v_deadline <= now() then
    raise exception 'this boss has expired';
  end if;

  update boss_challenges set status = 'completed', completed_at = now() where id = p_boss_id;

  v_total_xp := case when v_period = 'monthly' then 250 else 100 end;
  perform public.award_even_xp(v_user_id, v_total_xp);
  perform public.add_coins(v_user_id, v_total_xp / 2);
  perform public.check_achievements(v_user_id);
end;
$$ language plpgsql security definer set search_path = public;

-- -------------------------------------------------------------------store
create or replace function public.buy_item(p_item text)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_item store_items%rowtype;
  v_coins int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_item from store_items where id = p_item;
  if not found then raise exception 'item not found'; end if;
  if exists (select 1 from purchases where user_id = v_uid and item_id = p_item) then
    raise exception 'you already own this item';
  end if;

  select coins into v_coins from player_wallet where user_id = v_uid for update;
  if coalesce(v_coins, 0) < v_item.price then
    raise exception 'not enough coins';
  end if;

  update player_wallet set coins = coins - v_item.price where user_id = v_uid;
  insert into purchases (user_id, item_id) values (v_uid, p_item);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.equip_cosmetic(p_kind text, p_item text)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_value text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_kind not in ('theme', 'frame') then raise exception 'invalid kind'; end if;

  if p_item is not null then
    select si.value into v_value
    from store_items si join purchases pu on pu.item_id = si.id
    where si.id = p_item and si.kind = p_kind and pu.user_id = v_uid;
    if v_value is null then raise exception 'you do not own this item'; end if;
  end if;

  if p_kind = 'theme' then
    update profiles set equipped_theme = v_value where id = v_uid;
  else
    update profiles set equipped_frame = v_value where id = v_uid;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.equip_title(p_title text)
returns void as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  if p_title is not null then
    if not exists (
         select 1 from purchases pu join store_items si on si.id = pu.item_id
         where pu.user_id = v_uid and si.kind = 'title' and si.name = p_title)
       and not exists (
         select 1 from user_achievements ua join achievements a on a.id = ua.achievement_id
         where ua.user_id = v_uid and a.title = p_title)
    then
      raise exception 'you have not unlocked this title';
    end if;
  end if;

  update profiles set equipped_title = p_title where id = v_uid;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------------------------------------------------------------- profile
create or replace function public.get_profile_summary()
returns jsonb as $$
  select jsonb_build_object(
    'quests_done',    (select count(*) from daily_logs where user_id = auth.uid() and done),
    'bosses_defeated',(select count(*) from boss_challenges where user_id = auth.uid() and status = 'completed'),
    'forges_done',    (select count(*) from forge_challenges where user_id = auth.uid() and status = 'completed'),
    'raids_cleared',  (select count(*) from raids where status = 'cleared' and auth.uid() in (host_id, guest_id)),
    'achievements',   (select count(*) from user_achievements where user_id = auth.uid()),
    'longest_streak', (select coalesce(max(longest_streak), 0) from streaks where user_id = auth.uid()),
    'coins',          (select coalesce(max(coins), 0) from player_wallet where user_id = auth.uid())
  );
$$ language sql stable security definer set search_path = public;

-- ------------------------------------------------------------ leaderboard
-- Only hunters who opted in (profiles.public_profile) appear to others. You always see
-- your own row. Scope 'guild' ranks only the members of your own guild.
create or replace function public.get_leaderboard(
  p_kind text default 'weekly',
  p_scope text default 'global',
  p_limit int default 50
)
returns table (
  rank bigint, user_id uuid, username text, level int, total_xp int,
  weekly_xp int, streak int, title text, frame text, is_me boolean
)
language sql stable security definer set search_path = public as $$
  with wk as (
    select user_id, coalesce(sum(xp_awarded), 0)::int as xp
    from daily_logs
    where done and log_date >= date_trunc('week', (now() at time zone 'utc'))::date
    group by user_id
  ),
  my_guild as (
    select guild_id from guild_members where user_id = auth.uid()
  ),
  base as (
    select p.id as uid, p.username, p.equipped_title, p.equipped_frame,
           (s.str + s.int_ + s.vit + s.sense + s.agi) as total_xp,
           coalesce(wk.xp, 0) as weekly_xp,
           coalesce(st.current_streak, 0) as streak
    from profiles p
    join player_stats s on s.user_id = p.id
    left join streaks st on st.user_id = p.id
    left join wk on wk.user_id = p.id
    where case when p_scope = 'guild'
            then p.id in (select gm.user_id from guild_members gm
                          where gm.guild_id = (select guild_id from my_guild))
            else (p.public_profile or p.id = auth.uid())
          end
  ),
  ranked as (
    select b.*,
           rank() over (
             order by case p_kind when 'level' then b.total_xp
                                  when 'streak' then b.streak
                                  else b.weekly_xp end desc,
                      b.total_xp desc
           ) as rnk
    from base b
  )
  select rnk, uid, username, (total_xp / 100 + 1)::int, total_xp::int, weekly_xp::int,
         streak::int, equipped_title, equipped_frame, (uid = auth.uid())
  from ranked
  where rnk <= greatest(1, least(p_limit, 100)) or uid = auth.uid()
  order by rnk, username
  limit 101;
$$;

-- ----------------------------------------------------------------- guilds
create or replace function public.get_my_guild()
returns jsonb as $$
declare
  v_gid uuid;
  v_role text;
  v_week date := date_trunc('week', (now() at time zone 'utc'))::date;
  v_result jsonb;
begin
  select guild_id, role into v_gid, v_role from guild_members where user_id = auth.uid();
  if v_gid is null then return null; end if;

  with wk as (
    select user_id, coalesce(sum(xp_awarded), 0)::int as xp
    from daily_logs where done and log_date >= v_week group by user_id
  ),
  mem as (
    select gm.user_id, gm.role, p.username, p.equipped_title as title, p.equipped_frame as frame,
           ((s.str + s.int_ + s.vit + s.sense + s.agi) / 100 + 1)::int as level,
           coalesce(wk.xp, 0) as weekly_xp
    from guild_members gm
    join profiles p on p.id = gm.user_id
    join player_stats s on s.user_id = gm.user_id
    left join wk on wk.user_id = gm.user_id
    where gm.guild_id = v_gid
  )
  select jsonb_build_object(
           'id', g.id, 'name', g.name, 'invite_code', g.invite_code, 'my_role', v_role,
           'goal', 300 * (select count(*) from mem),
           'progress', (select coalesce(sum(weekly_xp), 0) from mem),
           'members', (select jsonb_agg(to_jsonb(mem) order by mem.weekly_xp desc) from mem)
         )
    into v_result
  from guilds g where g.id = v_gid;

  return v_result;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function public.create_guild(p_name text)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(p_name);
  v_gid uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 24 then
    raise exception 'guild name must be 3-24 characters';
  end if;
  if exists (select 1 from guild_members where user_id = v_uid) then
    raise exception 'leave your current guild first';
  end if;

  begin
    insert into guilds (name, owner_id) values (v_name, v_uid) returning id into v_gid;
  exception when unique_violation then
    raise exception 'that guild name is taken';
  end;

  insert into guild_members (user_id, guild_id, role) values (v_uid, v_gid, 'owner');
  perform public.check_achievements(v_uid);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.join_guild(p_code text)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_gid uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from guild_members where user_id = v_uid) then
    raise exception 'leave your current guild first';
  end if;

  select id into v_gid from guilds where invite_code = trim(p_code) for update;
  if v_gid is null then raise exception 'invalid invite code'; end if;
  if (select count(*) from guild_members where guild_id = v_gid) >= 20 then
    raise exception 'this guild is full (20 members)';
  end if;

  insert into guild_members (user_id, guild_id) values (v_uid, v_gid);
  perform public.check_achievements(v_uid);
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.leave_guild()
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_gid uuid;
  v_role text;
  v_next uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select guild_id, role into v_gid, v_role from guild_members where user_id = v_uid;
  if v_gid is null then return; end if;

  delete from guild_members where user_id = v_uid;

  select user_id into v_next from guild_members where guild_id = v_gid order by joined_at limit 1;
  if v_next is null then
    delete from guilds where id = v_gid;
  elsif v_role = 'owner' then
    update guild_members set role = 'owner' where user_id = v_next;
    update guilds set owner_id = v_next where id = v_gid;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------------ raids
create or replace function public.create_raid(p_boss_id uuid)
returns uuid as $$
declare
  v_uid uuid := auth.uid();
  v_boss boss_challenges%rowtype;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_boss from boss_challenges
    where id = p_boss_id and user_id = v_uid and status = 'active' and deadline > now();
  if not found then raise exception 'that boss is not available for a raid'; end if;

  insert into raids (boss_id, boss_title, boss_brief, host_id, deadline)
  values (v_boss.id, v_boss.title, v_boss.brief, v_uid, v_boss.deadline)
  on conflict (host_id, boss_id) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from raids where host_id = v_uid and boss_id = p_boss_id;
  end if;
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- What a visitor sees on the invite page before joining. Never exposes evidence.
create or replace function public.get_raid_preview(p_code text)
returns jsonb as $$
  select jsonb_build_object(
    'id', r.id, 'boss_title', r.boss_title, 'boss_brief', r.boss_brief,
    'status', r.status, 'deadline', r.deadline,
    'host', (select username from profiles where id = r.host_id),
    'is_host', r.host_id = auth.uid(),
    'is_guest', r.guest_id = auth.uid()
  )
  from raids r where r.invite_code = trim(p_code);
$$ language sql stable security definer set search_path = public;

create or replace function public.join_raid(p_code text)
returns uuid as $$
declare
  v_uid uuid := auth.uid();
  r raids%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into r from raids where invite_code = trim(p_code) for update;
  if not found then raise exception 'raid not found'; end if;
  if r.host_id = v_uid then raise exception 'you cannot join your own raid'; end if;
  if r.guest_id = v_uid then return r.id; end if;
  if r.status <> 'open' or r.guest_id is not null then raise exception 'this raid already has two hunters'; end if;
  if r.deadline <= now() then raise exception 'this raid has expired'; end if;

  update raids set guest_id = v_uid, status = 'active' where id = r.id;
  return r.id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.submit_raid(p_raid_id uuid, p_evidence text)
returns void as $$
declare
  v_uid uuid := auth.uid();
  v_evidence text := left(trim(p_evidence), 2000);
  r raids%rowtype;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into r from raids where id = p_raid_id for update;
  if not found or v_uid not in (r.host_id, coalesce(r.guest_id, r.host_id)) then
    raise exception 'not authorized';
  end if;
  if r.status = 'cleared' then return; end if;
  if r.status <> 'active' then raise exception 'wait for your partner to join first'; end if;
  if r.deadline <= now() then raise exception 'this raid has expired'; end if;
  if char_length(v_evidence) < 20 then
    raise exception 'describe what you did (at least 20 characters)';
  end if;

  if v_uid = r.host_id then
    update raids set host_evidence = v_evidence, host_done_at = coalesce(host_done_at, now()) where id = r.id;
  else
    update raids set guest_evidence = v_evidence, guest_done_at = coalesce(guest_done_at, now()) where id = r.id;
  end if;

  select * into r from raids where id = p_raid_id;
  if r.host_done_at is not null and r.guest_done_at is not null and r.status = 'active' then
    update raids set status = 'cleared', cleared_at = now() where id = r.id;
    perform public.award_even_xp(r.host_id, 150);
    perform public.award_even_xp(r.guest_id, 150);
    perform public.add_coins(r.host_id, 75);
    perform public.add_coins(r.guest_id, 75);
    perform public.check_achievements(r.host_id);
    perform public.check_achievements(r.guest_id);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.my_raids()
returns jsonb as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'boss_id', r.boss_id, 'boss_title', r.boss_title, 'boss_brief', r.boss_brief, 'status', r.status,
    'deadline', r.deadline, 'invite_code', r.invite_code,
    'is_host', r.host_id = auth.uid(),
    'partner', (select p.username from profiles p
                where p.id = case when r.host_id = auth.uid() then r.guest_id else r.host_id end),
    'my_done',      case when r.host_id = auth.uid() then r.host_done_at is not null else r.guest_done_at is not null end,
    'partner_done', case when r.host_id = auth.uid() then r.guest_done_at is not null else r.host_done_at is not null end,
    'my_evidence',  case when r.host_id = auth.uid() then r.host_evidence else r.guest_evidence end
  ) order by r.created_at desc), '[]'::jsonb)
  from raids r where auth.uid() in (r.host_id, r.guest_id);
$$ language sql stable security definer set search_path = public;

-- -------------------------------------------------------------- privileges
-- Internal helpers: callable by the database itself and the service role only.
revoke execute on function public.add_coins(uuid, int) from public, anon, authenticated;
revoke execute on function public.award_even_xp(uuid, int) from public, anon, authenticated;
revoke execute on function public.check_achievements(uuid) from public, anon, authenticated;

-- Player-facing RPCs require a logged-in user.
revoke execute on function public.sync_achievements() from public, anon;
revoke execute on function public.buy_item(text) from public, anon;
revoke execute on function public.equip_cosmetic(text, text) from public, anon;
revoke execute on function public.equip_title(text) from public, anon;
revoke execute on function public.get_profile_summary() from public, anon;
revoke execute on function public.get_my_guild() from public, anon;
revoke execute on function public.create_guild(text) from public, anon;
revoke execute on function public.join_guild(text) from public, anon;
revoke execute on function public.leave_guild() from public, anon;
revoke execute on function public.create_raid(uuid) from public, anon;
revoke execute on function public.get_raid_preview(text) from public, anon;
revoke execute on function public.join_raid(text) from public, anon;
revoke execute on function public.submit_raid(uuid, text) from public, anon;
revoke execute on function public.my_raids() from public, anon;
revoke execute on function public.get_leaderboard(text, text, int) from public, anon;
