-- Fixes: complete_quest tried to update a column named exactly "VIT"/"STR"/etc
-- (uppercase, quoted) because quest_templates.stat is stored uppercase, while
-- the real player_stats columns are lowercase (and INT is actually named int_,
-- since "int" is a reserved word). This replaces the function with a correct
-- mapping from stat label -> real column name.

create or replace function public.complete_quest(p_log_id uuid, p_done boolean)
returns void as $$
declare
  v_user_id uuid;
  v_quest_id uuid;
  v_stat text;
  v_column text;
  v_xp int;
  v_prev_done boolean;
  v_delta int;
begin
  select user_id, quest_id, done into v_user_id, v_quest_id, v_prev_done
  from daily_logs where id = p_log_id;

  if v_user_id != auth.uid() then
    raise exception 'not authorized';
  end if;

  select stat, xp into v_stat, v_xp from quest_templates where id = v_quest_id;

  if v_prev_done = p_done then
    return;
  end if;

  v_delta := case when p_done then v_xp else -v_xp end;

  update daily_logs
    set done = p_done,
        completed_at = case when p_done then now() else null end,
        xp_awarded = case when p_done then v_xp else null end,
        verified_via = case when p_done then 'manual' else null end
    where id = p_log_id;

  v_column := case when v_stat = 'INT' then 'int_' else lower(v_stat) end;

  execute format(
    'update player_stats set %I = greatest(0, %I + $1), updated_at = now() where user_id = $2',
    v_column, v_column
  ) using v_delta, v_user_id;
end;
$$ language plpgsql security definer;