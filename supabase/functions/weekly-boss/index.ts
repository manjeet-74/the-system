import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCronSecret } from '../_shared/cron.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function getWeekStart(d: Date): string {
  const day = d.getUTCDay(); // 0=Sun
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
  return monday.toISOString().split('T')[0];
}

function getMonthStart(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().split('T')[0];
}

const WEEKLY_BRIEFS = [
  'This week: ship one full feature for a side project, start to finish.',
  'This week: fix the hardest outstanding bug in any codebase you own.',
  'This week: write detailed documentation for something you built.',
  'This week: learn one new tool or technique and apply it to something real.',
];

const MONTHLY_BRIEFS = [
  'This month: build a complete working MVP for one of your project ideas.',
  'This month: contribute something meaningful to an open-source project.',
  'This month: ship a personal project that is publicly accessible.',
];

Deno.serve(async (req) => {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const now = new Date();
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);


  // Overdue bosses can no longer be completed (complete_boss also enforces this).
  await supabase
    .from('boss_challenges')
    .update({ status: 'expired' })
    .eq('status', 'active')
    .lt('deadline', now.toISOString());

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id');

  if (profilesError) {
    return new Response(JSON.stringify({ error: profilesError.message }), { status: 500 });
  }

  const results: string[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.id;

    try {
      // Weekly boss — make sure one exists for the current week (any weekday, so players
      // who joined mid-week are not left without one until next Monday).
      {
        const weekDeadline = new Date(new Date(`${weekStart}T00:00:00Z`).getTime() + 7 * 86400000);

        const { count: weekCount } = await supabase
          .from('boss_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('period', 'weekly')
          .gte('started_at', weekStart);

        if (weekCount === 0) {
          const brief = WEEKLY_BRIEFS[Math.floor(Math.random() * WEEKLY_BRIEFS.length)];
          await supabase.from('boss_challenges').insert({
            user_id: userId,
            title: `Week of ${weekStart}`,
            brief,
            period: 'weekly',
            deadline: weekDeadline.toISOString(),
          });
          results.push(`${userId}: weekly boss created`);
        }
      }

      // Monthly boss — same catch-up rule for the current month.
      {
        const monthDeadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

        const { count: monthCount } = await supabase
          .from('boss_challenges')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('period', 'monthly')
          .gte('started_at', monthStart);

        if (monthCount === 0) {
          const brief = MONTHLY_BRIEFS[Math.floor(Math.random() * MONTHLY_BRIEFS.length)];
          await supabase.from('boss_challenges').insert({
            user_id: userId,
            title: `Month of ${monthStart}`,
            brief,
            period: 'monthly',
            deadline: monthDeadline.toISOString(),
          });
          results.push(`${userId}: monthly boss created`);
        }
      }
    } catch (err: any) {
      results.push(`${userId}: ERROR ${err.message}`);
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
