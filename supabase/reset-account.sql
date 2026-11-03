-- =============================================================
-- RESET SCRIPT for THE SYSTEM
-- Wipes all gameplay progress for ONE user so you can test from a
-- clean slate. Keeps the account and the 5 default quests.
-- Scoped by email so it can never touch anyone else's data.
--
-- HOW TO RUN:
--   1. Supabase Dashboard -> your project "The System"
--   2. Left sidebar -> SQL Editor -> New query
--   3. Paste this whole file, click RUN
-- =============================================================
do $$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'ymanjeet7063@gmail.com';
  if v_uid is null then
    raise exception 'User not found for that email';
  end if;

  -- Wipe gameplay history
  delete from daily_logs       where user_id = v_uid;
  delete from ai_submissions   where user_id = v_uid;
  delete from forge_challenges where user_id = v_uid;
  delete from boss_challenges  where user_id = v_uid;
  delete from stat_history     where user_id = v_uid;

  -- Remove custom quests, keep the 5 seeded defaults
  delete from quest_templates  where user_id = v_uid and is_default = false;

  -- Reset stats back to zero
  update player_stats
    set str = 0, int_ = 0, vit = 0, sense = 0, agi = 0, updated_at = now()
    where user_id = v_uid;

  -- Reset the streak. Setting last_active_date = null makes the next app load
  -- trigger daily-rollover, which regenerates today's quests fresh.
  update streaks
    set current_streak = 0, longest_streak = 0, penalty_active = false, last_active_date = null
    where user_id = v_uid;

  raise notice 'Reset complete for %', v_uid;
end $$;
