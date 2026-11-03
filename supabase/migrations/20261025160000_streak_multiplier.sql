-- P1.2 Streak Multiplier
-- Longer streaks multiply the XP earned per quest. The logic lives in the DB
-- (inside the SECURITY DEFINER complete_quest RPC) so it cannot be cheated from
-- the browser console — the client never decides how much XP it gets.
--
-- Tiers:  <3 days = 1.0x | 3-6 = 1.1x | 7-13 = 1.25x | 14-29 = 1.5x | 30+ = 2.0x

-- A small pure function so the tiers live in exactly one place and can be reused
-- (by complete_quest, and later by the HUD via an RPC if we want).
create or replace function public.streak_multiplier(p_streak int)
returns numeric as $$
begin
  return case
    when p_streak >= 30 then 2.0
    when p_streak >= 14 then 1.5
    when p_streak >= 7  then 1.25
    when p_streak >= 3  then 1.1
    else 1.0
  end;
end;
$$ language plpgsql immutable;

-- Rewrite complete_quest to apply the multiplier on completion, and to reverse
-- the EXACT amount that was awarded when a quest is un-completed.
create or replace function public.complete_quest(p_log_id uuid, p_done boolean)
returns void as $$
declare
  v_user_id uuid;
  v_quest_id uuid;
  v_stat text;
  v_column text;
  v_xp int;
  v_prev_done boolean;
  v_prev_award int;
  v_streak int;
  v_mult numeric;
  v_award int;
  v_delta int;
begin
  -- Load the log, including what was previously awarded (so un-complete is exact).
  select user_id, quest_id, done, xp_awarded
    into v_user_id, v_quest_id, v_prev_done, v_prev_award
  from daily_logs where id = p_log_id;

  if v_user_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  -- No-op if the state is already what was requested.
  if v_prev_done = p_done then
    return;
  end if;

  select stat, xp into v_stat, v_xp from quest_templates where id = v_quest_id;

  if p_done then
    -- Completing: look up the player's current streak and compute the award.
    select coalesce(current_streak, 0) into v_streak
    from streaks where user_id = v_user_id;

    v_mult  := public.streak_multiplier(coalesce(v_streak, 0));
    v_award := round(v_xp * v_mult);   -- the real XP, boosted by the streak
    v_delta := v_award;
  else
    -- Un-completing: reverse exactly what was stored on the log last time,
    -- falling back to the base xp for old rows that predate this column.
    v_award := null;
    v_delta := -coalesce(v_prev_award, v_xp);
  end if;

  update daily_logs
    set done = p_done,
        completed_at = case when p_done then now() else null end,
        xp_awarded   = v_award,
        verified_via = case when p_done then 'manual' else null end
    where id = p_log_id;

  v_column := case when v_stat = 'INT' then 'int_' else lower(v_stat) end;

  execute format(
    'update player_stats set %I = greatest(0, %I + $1), updated_at = now() where user_id = $2',
    v_column, v_column
  ) using v_delta, v_user_id;
end;
$$ language plpgsql security definer;
