import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

Deno.serve(async (_req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getUTCHours();

  // Fetch users with email enabled whose reminder hour matches current UTC hour
  const { data: prefs, error: prefsError } = await supabase
    .from('notification_prefs')
    .select('user_id, reminder_time')
    .eq('email_enabled', true);

  if (prefsError) {
    return new Response(JSON.stringify({ error: prefsError.message }), { status: 500 });
  }

  const results: string[] = [];

  for (const pref of prefs ?? []) {
    const reminderHour = parseInt(pref.reminder_time?.split(':')[0] ?? '20', 10);
    if (reminderHour !== currentHour) continue;

    const { user_id } = pref;

    try {
      // Check for incomplete quests today
      const { data: incompleteLogs, error: logsError } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user_id)
        .eq('log_date', today)
        .eq('done', false);

      if (logsError || !incompleteLogs || incompleteLogs.length === 0) continue;

      // Fetch user email
      const { data: userData } = await supabase.auth.admin.getUserById(user_id);
      const email = userData?.user?.email;
      if (!email) continue;

      // Check streak for context
      const { data: streak } = await supabase
        .from('streaks')
        .select('current_streak, penalty_active')
        .eq('user_id', user_id)
        .single();

      const incompleteCount = incompleteLogs.length;
      const streakLine =
        streak?.penalty_active
          ? `\n\nWarning: your streak is at risk! Complete your quests or face a stat penalty.`
          : streak?.current_streak && streak.current_streak > 0
          ? `\n\nYou have a ${streak.current_streak}-day streak — don't break it now.`
          : '';

      const emailBody = `You still have ${incompleteCount} quest${incompleteCount > 1 ? 's' : ''} open today.${streakLine}\n\nOpen THE SYSTEM and complete your quests before midnight.`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'THE SYSTEM <noreply@thesystem.app>',
          to: [email],
          subject: `Your quests are still open (${incompleteCount} remaining)`,
          text: emailBody,
        }),
      });

      results.push(`${user_id}: reminder sent to ${email}`);
    } catch (err: any) {
      results.push(`${user_id}: ERROR ${err.message}`);
    }
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
