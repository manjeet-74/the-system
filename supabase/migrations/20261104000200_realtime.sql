-- The HUD subscribes to postgres_changes on these tables, but Postgres only emits those
-- events for tables in the supabase_realtime publication. Without this, changes made
-- server-side (AI grading, GitHub verification, rollover, raid rewards) never reach the
-- open browser tab until a manual refresh. Guarded so it is a no-op outside Supabase.
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['player_stats', 'streaks', 'player_wallet'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then
        null; -- already published
      end;
    end loop;
  end if;
end $$;
