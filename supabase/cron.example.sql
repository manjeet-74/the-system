-- Schedules THE SYSTEM's background jobs with pg_cron + pg_net.
-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor). Safe to re-run: it
-- removes the old jobs first.
--
-- Replace the three placeholders:
--   __PROJECT_URL__   https://<your-project-ref>.supabase.co
--   __ANON_KEY__      your project's public anon key (the gateway only needs *a* valid JWT)
--   __CRON_SECRET__   the value you set with: supabase secrets set CRON_SECRET=<random hex>
--
-- Never commit the filled-in version.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobname) from cron.job
where jobname in ('system-daily-rollover', 'system-weekly-boss', 'system-github-verify', 'system-daily-reminder');

-- 00:05 UTC every day: roll every player over (new quests, streak, penalties).
select cron.schedule('system-daily-rollover', '5 0 * * *', $job$
  select net.http_post(
    url := '__PROJECT_URL__/functions/v1/daily-rollover',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer __ANON_KEY__', 'apikey', '__ANON_KEY__', 'x-cron-secret', '__CRON_SECRET__'),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$job$);

-- 00:15 UTC every day: make sure every player has this week's / month's boss; expire overdue ones.
select cron.schedule('system-weekly-boss', '15 0 * * *', $job$
  select net.http_post(
    url := '__PROJECT_URL__/functions/v1/weekly-boss',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer __ANON_KEY__', 'apikey', '__ANON_KEY__', 'x-cron-secret', '__CRON_SECRET__'),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$job$);

-- Every 30 minutes: auto-complete GitHub-verified quests when new commits landed.
select cron.schedule('system-github-verify', '*/30 * * * *', $job$
  select net.http_post(
    url := '__PROJECT_URL__/functions/v1/github-verify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer __ANON_KEY__', 'apikey', '__ANON_KEY__', 'x-cron-secret', '__CRON_SECRET__'),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$job$);

-- Top of every hour: push/email players whose reminder hour it is and who still have open quests.
select cron.schedule('system-daily-reminder', '0 * * * *', $job$
  select net.http_post(
    url := '__PROJECT_URL__/functions/v1/daily-reminder',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer __ANON_KEY__', 'apikey', '__ANON_KEY__', 'x-cron-secret', '__CRON_SECRET__'),
    body := '{}'::jsonb, timeout_milliseconds := 120000);
$job$);

-- Check they are registered:  select jobname, schedule, active from cron.job order by jobname;
