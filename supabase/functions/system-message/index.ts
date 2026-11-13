import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { withCors, json, getCallerId } from '../_shared/http.ts';
import { geminiGenerate, geminiAvailable } from '../_shared/gemini.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function rankOf(level: number): string {
  if (level < 10) return 'E';
  if (level < 20) return 'D';
  if (level < 35) return 'C';
  if (level < 50) return 'B';
  if (level < 70) return 'A';
  return 'S';
}

// Used when Gemini is unavailable, rate limited, or returns something unusable, so the
// player always gets a message and the day's row is still cached.
function fallbackMessage(name: string, open: number, streak: number, penalty: boolean): string {
  if (penalty) return `${name}. Penalty phase is active. Clear your quests and redeem yourself.`;
  if (open > 0) {
    return `${name}. ${open} quest${open > 1 ? 's' : ''} remain${open > 1 ? '' : 's'}. ${
      streak > 0 ? `Your ${streak}-day streak depends on it.` : 'Begin.'
    }`;
  }
  return `${name}. All quests cleared. The System acknowledges your effort.`;
}

function clean(text: string): string {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/^["'“”\s]+|["'“”\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 220);
}

Deno.serve(withCors(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const userId = await getCallerId(req, supabase);
  if (!userId) return json({ error: 'unauthorized' }, 401);

  const today = new Date().toISOString().split('T')[0];

  // One message per player per day. Cached rows never call Gemini again.
  const { data: cached } = await supabase
    .from('system_messages')
    .select('message')
    .eq('user_id', userId)
    .eq('day', today)
    .maybeSingle();
  if (cached) return json({ message: cached.message, cached: true });

  const [{ data: profile }, { data: stats }, { data: streak }, { data: logs }] = await Promise.all([
    supabase.from('profiles').select('username, class').eq('id', userId).single(),
    supabase.from('player_stats').select('str, int_, vit, sense, agi').eq('user_id', userId).single(),
    supabase.from('streaks').select('current_streak, penalty_active').eq('user_id', userId).single(),
    supabase.from('daily_logs').select('done').eq('user_id', userId).eq('log_date', today),
  ]);

  // Usernames are user-controlled text that ends up inside a prompt: keep it to a safe charset.
  const name = (profile?.username ?? 'Hunter').replace(/[^\w .-]/g, '').slice(0, 24) || 'Hunter';
  const total = stats ? stats.str + stats.int_ + stats.vit + stats.sense + stats.agi : 0;
  const level = Math.floor(total / 100) + 1;
  const open = (logs ?? []).filter((l) => !l.done).length;
  const done = (logs ?? []).filter((l) => l.done).length;
  const streakDays = streak?.current_streak ?? 0;
  const penalty = !!streak?.penalty_active;

  const fallback = fallbackMessage(name, open, streakDays, penalty);

  let message = fallback;
  if (geminiAvailable) {
    try {
      const { text } = await geminiGenerate({
        user:
          `You are THE SYSTEM, the cold, omniscient interface from a dark-fantasy hunter RPG. ` +
          `Address the player directly in ONE or TWO short sentences (max 30 words). ` +
          `Be terse, ominous and motivating. No emoji, no markdown, no quotation marks. ` +
          `Use only these facts:\n` +
          `Hunter name: ${name}\nRank: ${rankOf(level)} (level ${level})\n` +
          `Quests remaining today: ${open}\nQuests cleared today: ${done}\n` +
          `Current streak: ${streakDays} days\nPenalty active: ${penalty ? 'yes' : 'no'}`,
        maxOutputTokens: 120,
        temperature: 0.9,
        timeoutMs: 8000,
        maxModels: 2,
      });
      const cleaned = clean(text);
      if (cleaned.length >= 10) message = cleaned;
    } catch (_err) {
      // Gemini overloaded/unavailable: fall through to the template below.
    }
  }

  // The template is a stand-in, not the day's real message. Don't cache it, so the next
  // page load tries Gemini again instead of freezing a fallback in for 24 hours.
  if (message === fallback) return json({ message, cached: false, fallback: true });

  // ignoreDuplicates: if two tabs raced, the first writer wins and we return its row.
  await supabase
    .from('system_messages')
    .upsert({ user_id: userId, day: today, message }, { onConflict: 'user_id,day', ignoreDuplicates: true });

  const { data: saved } = await supabase
    .from('system_messages')
    .select('message')
    .eq('user_id', userId)
    .eq('day', today)
    .single();

  return json({ message: saved?.message ?? message, cached: false });
}));
