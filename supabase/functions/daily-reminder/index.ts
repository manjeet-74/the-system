import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { requireCronSecret } from '../_shared/cron.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
// Resend only lets you send from a domain you verified. Until you verify one, the free
// sandbox sender below can only deliver to the email address of your own Resend account.
const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'THE SYSTEM <onboarding@resend.dev>';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com';
const pushEnabled = !!VAPID_PUBLIC_KEY && !!VAPID_PRIVATE_KEY;
if (pushEnabled) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);

Deno.serve(async (req) => {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getUTCHours();

  const { data: prefs, error: prefsError } = await supabase
    .from('notification_prefs')
    .select('user_id, reminder_time, email_enabled');

  if (prefsError) {
    return new Response(JSON.stringify({ error: prefsError.message }), { status: 500 });
  }

  const results: string[] = [];

  for (const pref of prefs ?? []) {
    const reminderHour = parseInt(pref.reminder_time?.split(':')[0] ?? '20', 10);
    if (reminderHour !== currentHour) continue;

    const { user_id } = pref;

    try {
      const { data: incompleteLogs, error: logsError } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user_id)
        .eq('log_date', today)
        .eq('done', false);

      if (logsError || !incompleteLogs || incompleteLogs.length === 0) continue;

      const { data: streak } = await supabase
        .from('streaks')
        .select('current_streak, penalty_active')
        .eq('user_id', user_id)
        .single();

      const incompleteCount = incompleteLogs.length;
      const plural = incompleteCount > 1 ? 's' : '';
      const streakLine = streak?.penalty_active
        ? 'Your streak is at risk — complete your quests or face a stat penalty.'
        : streak?.current_streak && streak.current_streak > 0
        ? `You have a ${streak.current_streak}-day streak — do not break it now.`
        : '';

      // ---- Web push (free, works for every user who enabled it in Settings) ----
      if (pushEnabled) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .eq('user_id', user_id);

        for (const sub of subs ?? []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({
                title: 'THE SYSTEM',
                body: `${incompleteCount} quest${plural} still open today. ${streakLine}`.trim(),
                url: '/',
              }),
            );
            results.push(`${user_id}: push sent`);
          } catch (err: any) {
            // 404/410 = the browser unsubscribed; drop the dead subscription.
            if (err?.statusCode === 404 || err?.statusCode === 410) {
              await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            }
            results.push(`${user_id}: push failed (${err?.statusCode ?? err?.message})`);
          }
        }
      }

      // ---- Email (needs a verified Resend domain to reach other people) ----
      if (pref.email_enabled && RESEND_API_KEY) {
        const { data: userData } = await supabase.auth.admin.getUserById(user_id);
        const email = userData?.user?.email;
        if (!email) continue;

        const emailBody = `You still have ${incompleteCount} quest${plural} open today.${
          streakLine ? `\n\n${streakLine}` : ''
        }\n\nOpen THE SYSTEM and complete your quests before midnight.`;

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to: [email],
            subject: `Your quests are still open (${incompleteCount} remaining)`,
            text: emailBody,
          }),
        });

        if (!resendRes.ok) {
          const errBody = await resendRes.text();
          results.push(`${user_id}: Resend error ${resendRes.status} — ${errBody}`);
          continue;
        }
        results.push(`${user_id}: email sent`);
      }
    } catch (err: any) {
      results.push(`${user_id}: ERROR ${err.message}`);
    }
  }

  return new Response(JSON.stringify({ sent: results.length, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
