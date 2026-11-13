import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useAchievements } from '../hooks/useCosmetics';
import { ProfileTabs } from '../components/profile/ProfileTabs';

export function AchievementsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { data, isLoading, error } = useAchievements();

  const equip = useMutation({
    mutationFn: async (title: string | null) => {
      const { error: err } = await supabase.rpc('equip_title', { p_title: title });
      if (err) throw err;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });

  const total = data?.all.length ?? 0;
  const got = data?.unlocked.size ?? 0;

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileTabs />

      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="font-rajdhani text-2xl font-bold text-[#3fd6f5] tracking-wider">ACHIEVEMENTS</h2>
          <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">Milestones pay coins. Some unlock a title.</p>
        </div>
        <span className="font-rajdhani font-bold text-[#e6f1f7]">
          {got} <span className="text-[#6d81a0]">/ {total}</span>
        </span>
      </div>

      {isLoading && <p className="text-[#6d81a0] font-rajdhani">Loading…</p>}
      {error && <p className="text-[#ff4d5e] font-rajdhani text-sm">Failed to load: {(error as Error).message}</p>}
      {equip.error && <p className="text-[#ff4d5e] font-rajdhani text-sm mb-3">{(equip.error as Error).message}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {data?.all.map((a) => {
          const unlocked = data.unlocked.has(a.id);
          const equipped = !!a.title && profile?.equipped_title === a.title;
          return (
            <div
              key={a.id}
              className={`rounded-lg border p-4 flex gap-4 items-start ${
                unlocked ? 'border-[#3fd6f5]/40 bg-[#0a0f1c]' : 'border-[#3fd6f5]/10 bg-[#04070d] opacity-60'
              }`}
            >
              <div
                className={`w-12 h-12 rounded flex items-center justify-center text-2xl font-rajdhani font-extrabold flex-shrink-0 ${
                  unlocked ? 'bg-[#3fd6f5]/10 text-[#3fd6f5]' : 'bg-[#0a0f1c] text-[#33415c] grayscale'
                }`}
              >
                {a.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-rajdhani font-bold text-[#e6f1f7]">{a.name}</p>
                <p className="text-[#6d81a0] font-rajdhani text-sm">{a.description}</p>
                <p className="font-rajdhani text-xs mt-1 text-amber-300">
                  +{a.coin_reward} ◈{a.title ? <span className="text-[#6d81a0]"> · title “{a.title}”</span> : null}
                </p>
                {unlocked && a.title && (
                  <button
                    type="button"
                    onClick={() => equip.mutate(equipped ? null : a.title)}
                    disabled={equip.isPending}
                    className="mt-2 border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-bold text-xs px-3 py-1 rounded cursor-pointer disabled:opacity-50"
                  >
                    {equipped ? 'EQUIPPED ✓ (click to remove)' : 'EQUIP TITLE'}
                  </button>
                )}
              </div>
              {unlocked && <span className="text-emerald-400 font-rajdhani font-bold text-xs">UNLOCKED</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
