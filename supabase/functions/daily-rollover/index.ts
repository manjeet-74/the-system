import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FORGE_TIERS: Record<number, { tier: string; brief: string; daysDeadline: number; rewardXp: number }> = {
  3: {
    tier: 'spark',
    brief: 'Ship one working component or script end-to-end today.',
    daysDeadline: 1,
    rewardXp: 50,
  },
  5: {
    tier: 'build',
    brief: 'Spend the next few days building a small complete feature for one of your side projects.',
    daysDeadline: 5,
    rewardXp: 100,
  },
  7: {
    tier: 'dungeon',
    brief: 'Timed sprint: build something substantial before your deadline.',
    daysDeadline: 3,
    rewardXp: 150,
  },
  14: {
    tier: 'build',
    brief: 'Two-week build: ship a meaningful upgrade to one of your projects.',
    daysDeadline: 7,
    rewardXp: 200,
  },
  30: {
    tier: 'dungeon',
    brief: 'Month-long dungeon: complete an ambitious project milestone.',
    daysDeadline: 7,
    rewardXp: 300,
  },
};

const FORGE_THRESHOLDS = [3, 5, 7, 14, 30];

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Fetch all profiles
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
      // Fetch streak row
      const { data: streakRow } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!streakRow) {
        results.push(`${userId}: no streak row, skipping`);
        continue;
      }

      // Skip if already processed today
      if (streakRow.last_active_date === today) {
        results.push(`${userId}: already processed`);
        continue;
      }

      // First-ever run for this user
      if (!streakRow.last_active_date) {
        await generateTodaysLogs(supabase, userId, today);
        await supabase
          .from('streaks')
          .update({ last_active_date: today })
          .eq('user_id', userId);

        // Snapshot stats
        await snapshotStats(supabase, userId);
        results.push(`${userId}: first run, logs generated`);
        continue;
      }

      // Evaluate yesterday's logs
      const { data: yesterdaysLogs } = await supabase
        .from('daily_logs')
        .select('done, quest_id, quest_templates(stat, xp)')
        .eq('user_id', userId)
        .eq('log_date', yesterday);

      let newStreak = streakRow.current_streak;
      let penaltyActive = streakRow.penalty_active;

      if (yesterdaysLogs && yesterdaysLogs.length > 0) {
        const allDone = yesterdaysLogs.every((log: any) => log.done);

        if (allDone) {
          newStreak += 1;
          penaltyActive = false;
        } else {
          // Apply stat decay for each incomplete quest
          const incompleteLogs = yesterdaysLogs.filter((log: any) => !log.done);

          // Group by stat for batch update
          const statDecay: Record<string, number> = {};
          for (const log of incompleteLogs) {
            const stat = (log.quest_templates as any)?.stat?.toLowerCase();
            if (stat) {
              statDecay[stat] = (statDecay[stat] || 0) + 8;
            }
          }

          // Fetch current stats
          const { data: currentStats } = await supabase
            .from('player_stats')
            .select('str, int_, vit, sense, agi')
            .eq('user_id', userId)
            .single();

          if (currentStats) {
            const updates: Record<string, number> = {};
            for (const [stat, decay] of Object.entries(statDecay)) {
              const colName = stat === 'int' ? 'int_' : stat;
              const currentVal = (currentStats as any)[colName] ?? 0;
              updates[colName] = Math.max(0, currentVal - decay);
            }

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('player_stats')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('user_id', userId);
            }
          }

          newStreak = 0;
          penaltyActive = true;
        }
      }

      const longestStreak = Math.max(streakRow.longest_streak, newStreak);

      // Update streak row
      await supabase
        .from('streaks')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          penalty_active: penaltyActive,
          last_active_date: today,
        })
        .eq('user_id', userId);

      // Check forge unlocks for newly achieved streak milestones
      if (!penaltyActive && newStreak > 0) {
        for (const threshold of FORGE_THRESHOLDS) {
          if (newStreak === threshold) {
            const forgeDef = FORGE_TIERS[threshold];

            // Only insert if user hasn't had this tier at this exact streak count
            const { count } = await supabase
              .from('forge_challenges')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('tier', forgeDef.tier)
              .gte('unlocked_at', new Date(Date.now() - 7 * 86400000).toISOString());

            if (count === 0) {
              const deadline = new Date(Date.now() + forgeDef.daysDeadline * 86400000);
              await supabase.from('forge_challenges').insert({
                user_id: userId,
                tier: forgeDef.tier,
                brief: forgeDef.brief,
                deadline: deadline.toISOString(),
                reward_xp: forgeDef.rewardXp,
              });
            }
          }
        }
      }

      // Generate today's logs
      await generateTodaysLogs(supabase, userId, today, penaltyActive);

      // Snapshot stats for analytics
      await snapshotStats(supabase, userId);

      results.push(`${userId}: streak=${newStreak}, penalty=${penaltyActive}`);
    } catch (err: any) {
      results.push(`${userId}: ERROR ${err.message}`);
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function generateTodaysLogs(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  today: string,
  penaltyActive = false
) {
  // Fetch active quest templates
  const { data: templates } = await supabase
    .from('quest_templates')
    .select('id, stat, xp')
    .eq('user_id', userId)
    .eq('archived', false);

  if (!templates || templates.length === 0) return;

  const logsToInsert = templates.map((t: any) => ({
    user_id: userId,
    log_date: today,
    quest_id: t.id,
    done: false,
  }));

  await supabase
    .from('daily_logs')
    .upsert(logsToInsert, { onConflict: 'user_id,log_date,quest_id', ignoreDuplicates: true });

  // Insert Redemption Trial if penalty is active
  if (penaltyActive) {
    // Find the user's lowest stat
    const { data: stats } = await supabase
      .from('player_stats')
      .select('str, int_, vit, sense, agi')
      .eq('user_id', userId)
      .single();

    let lowestStat = 'STR';
    if (stats) {
      const statMap: Record<string, number> = {
        STR: stats.str,
        INT: stats.int_,
        VIT: stats.vit,
        SENSE: stats.sense,
        AGI: stats.agi,
      };
      lowestStat = Object.entries(statMap).sort(([, a], [, b]) => a - b)[0][0];
    }

    // Create a redemption trial quest template (ad-hoc, non-default)
    const { data: redemptionTemplate } = await supabase
      .from('quest_templates')
      .insert({
        user_id: userId,
        title: 'Redemption Trial — clear this first',
        stat: lowestStat,
        xp: 25,
        is_default: false,
        verification_method: 'manual',
        archived: false,
      })
      .select()
      .single();

    if (redemptionTemplate) {
      await supabase.from('daily_logs').upsert(
        {
          user_id: userId,
          log_date: today,
          quest_id: redemptionTemplate.id,
          done: false,
          is_penalty: true,
        },
        { onConflict: 'user_id,log_date,quest_id', ignoreDuplicates: true }
      );
    }
  }
}

async function snapshotStats(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: stats } = await supabase
    .from('player_stats')
    .select('str, int_, vit, sense, agi')
    .eq('user_id', userId)
    .single();

  if (stats) {
    await supabase.from('stat_history').insert({
      user_id: userId,
      str: stats.str,
      int_: stats.int_,
      vit: stats.vit,
      sense: stats.sense,
      agi: stats.agi,
    });
  }
}
