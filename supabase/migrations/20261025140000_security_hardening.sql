-- Security / integrity hardening.
-- Before this, authenticated users could write their own player_stats and daily_logs
-- directly from the browser, bypassing the quest/XP/verification system entirely.
-- All legitimate stat and completion writes go through SECURITY DEFINER RPCs
-- (complete_quest, complete_forge, complete_boss) or service-role edge functions,
-- so clients only need read access (+ a constrained insert for custom quests' logs).

-- 1. player_stats: remove the client UPDATE path.
--    SECURITY DEFINER RPCs run as the function owner and bypass RLS, so quest/forge/boss
--    completion still writes stats; the service-role rollover/verify functions still write.
--    The SELECT policy stays, so the realtime HUD subscription keeps working.
drop policy if exists "update own stats" on player_stats;

-- 2. daily_logs: replace the blanket "for all" policy with read + constrained insert.
--    Completing a quest (done = true) is only possible through complete_quest (manual),
--    github-verify, or ai-judge — never a raw client write — so a user can no longer
--    self-complete a GitHub/AI quest without doing the work.
drop policy if exists "manage own logs" on daily_logs;
create policy "select own logs" on daily_logs
  for select using (auth.uid() = user_id);
create policy "insert own incomplete logs" on daily_logs
  for insert with check (auth.uid() = user_id and done = false);

-- 3. boss_challenges: completion now goes through complete_boss (below). Remove the
--    unguarded client UPDATE policy that allowed re-completing an already-finished boss
--    and re-awarding XP. SELECT stays.
drop policy if exists "complete own boss" on boss_challenges;

-- 4. complete_boss RPC — idempotent, transactional XP award (mirrors complete_forge).
--    Guarded on status = 'active', so re-calling on a completed/expired boss is a no-op
--    and never double-awards. Weekly = 100 XP total, monthly = 250, split evenly across stats.
create or replace function public.complete_boss(p_boss_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_status text;
  v_period text;
  v_total_xp int;
  v_per_stat int;
begin
  select user_id, status, period
    into v_user_id, v_status, v_period
    from boss_challenges where id = p_boss_id;

  if v_user_id is null then
    raise exception 'boss not found';
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'not authorized';
  end if;

  if v_status <> 'active' then
    return; -- already completed or expired: no-op, no re-award
  end if;

  update boss_challenges
    set status = 'completed', completed_at = now()
    where id = p_boss_id;

  v_total_xp := case when v_period = 'monthly' then 250 else 100 end;
  v_per_stat := v_total_xp / 5;

  update player_stats
    set str   = str   + v_per_stat,
        int_  = int_  + v_per_stat,
        vit   = vit   + v_per_stat,
        sense = sense + v_per_stat,
        agi   = agi   + v_per_stat,
        updated_at = now()
    where user_id = v_user_id;
end;
$$ language plpgsql security definer;
