import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCronSecret } from '../_shared/cron.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];

  // Fetch all github_links with a repo set
  const { data: links, error: linksError } = await supabase
    .from('github_links')
    .select('user_id, repo_full_name, last_checked_at')
    .not('repo_full_name', 'is', null);

  if (linksError) {
    return new Response(JSON.stringify({ error: linksError.message }), { status: 500 });
  }

  const results: string[] = [];

  for (const link of links ?? []) {
    const { user_id, repo_full_name, last_checked_at } = link;

    try {
      // NOTE: GitHub OAuth provider tokens are not stored in identity_data.
      // We poll unauthenticated (60 req/hr shared limit) for public repos only.
      // Users who need private repo support should add a PAT in Settings (future feature).
      const since = last_checked_at ?? new Date(Date.now() - 86400000).toISOString();
      const githubUrl = `https://api.github.com/repos/${repo_full_name}/commits?since=${since}&per_page=1`;

      const headers: Record<string, string> = {
        'User-Agent': 'the-system-app',
        Accept: 'application/vnd.github.v3+json',
      };

      const githubRes = await fetch(githubUrl, { headers });

      if (!githubRes.ok) {
        results.push(`${user_id}: GitHub API error ${githubRes.status}`);
        continue;
      }

      const commits = await githubRes.json();

      if (Array.isArray(commits) && commits.length > 0) {
        // Find today's github-verified quest that is incomplete
        const { data: logs } = await supabase
          .from('daily_logs')
          .select('id, quest_id, quest_templates(verification_method, stat, xp)')
          .eq('user_id', user_id)
          .eq('log_date', today)
          .eq('done', false);

        for (const log of logs ?? []) {
          const template = (log as any).quest_templates;
          if (template?.verification_method === 'github') {
            // Direct update + stat increment (service role bypasses RLS)
            await supabase
              .from('daily_logs')
              .update({
                done: true,
                completed_at: new Date().toISOString(),
                xp_awarded: template.xp,
                verified_via: 'github',
              })
              .eq('id', log.id);

            const statCol = template.stat === 'INT' ? 'int_' : template.stat.toLowerCase();
            const { data: stats } = await supabase
              .from('player_stats')
              .select(statCol)
              .eq('user_id', user_id)
              .single();

            if (stats) {
              await supabase
                .from('player_stats')
                .update({
                  [statCol]: (stats as any)[statCol] + template.xp,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', user_id);
            }

            results.push(`${user_id}: github quest auto-completed`);
            break; // Only complete one github quest per poll
          }
        }
      }

      // Update last_checked_at
      await supabase
        .from('github_links')
        .update({ last_checked_at: new Date().toISOString() })
        .eq('user_id', user_id);

      results.push(`${user_id}: checked, ${commits.length ?? 0} new commits`);
    } catch (err: any) {
      results.push(`${user_id}: ERROR ${err.message}`);
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
