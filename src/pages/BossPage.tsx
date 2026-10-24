import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface BossChallenge {
  id: string;
  title: string;
  brief: string;
  period: 'weekly' | 'monthly';
  status: 'active' | 'completed' | 'expired';
  started_at: string;
  deadline: string;
  completed_at: string | null;
}

export function BossPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: challenges = [], isLoading, error } = useQuery<BossChallenge[]>({
    queryKey: ['boss_challenges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error: fetchErr } = await supabase
        .from('boss_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });
      if (fetchErr) throw fetchErr;
      return data ?? [];
    },
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase
        .from('boss_challenges')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', challengeId)
        .eq('user_id', user?.id ?? '');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boss_challenges', user?.id] });
    },
  });

  const active = challenges.filter((c) => c.status === 'active');
  const history = challenges.filter((c) => c.status !== 'active');

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="font-rajdhani text-2xl font-bold text-[#ff4d5e] tracking-wider">BOSS FIGHTS</h2>
        <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">
          Weekly and monthly boss challenges. Self-reported — no shortcuts.
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-[#ff4d5e]/30 border-t-[#ff4d5e] rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-3 border border-[#ff4d5e]/40 bg-[#ff4d5e]/10 rounded text-sm text-[#ff4d5e] font-rajdhani">
          Failed to load boss challenges: {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <section className="space-y-3">
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
              ACTIVE BOSSES
            </h3>
            {active.length === 0 ? (
              <div className="border border-[#ff4d5e]/10 rounded-lg p-6 text-center">
                <p className="text-[#6d81a0] font-rajdhani text-sm">
                  No active boss fights. They appear at the start of each week and month.
                </p>
              </div>
            ) : (
              active.map((c) => {
                const deadline = new Date(c.deadline);
                const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
                return (
                  <div
                    key={c.id}
                    className="border border-[#ff4d5e]/30 bg-[#ff4d5e]/5 rounded-lg p-5 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-rajdhani font-bold text-[#ff4d5e] tracking-widest">
                        {c.period.toUpperCase()} BOSS
                      </span>
                      <span className="text-xs text-[#6d81a0] font-rajdhani">
                        {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                      </span>
                    </div>
                    <h4 className="font-rajdhani text-lg font-bold text-[#e6f1f7]">{c.title}</h4>
                    <p className="text-[#6d81a0] font-rajdhani text-sm">{c.brief}</p>
                    <button
                      onClick={() => completeMutation.mutate(c.id)}
                      disabled={completeMutation.isPending}
                      className="border border-[#ff4d5e]/50 text-[#ff4d5e] hover:bg-[#ff4d5e]/10 font-rajdhani font-bold text-sm px-4 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {completeMutation.isPending ? 'COMPLETING...' : 'DEFEAT BOSS'}
                    </button>
                  </div>
                );
              })
            )}
          </section>

          <section className="space-y-3">
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
              HISTORY
            </h3>
            {history.length === 0 ? (
              <p className="text-[#6d81a0] font-rajdhani text-sm text-center py-4">
                No completed or expired bosses yet.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 bg-[#04070d] border border-[#3fd6f5]/10 rounded"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-rajdhani font-bold text-[#6d81a0] tracking-wider">
                        {c.period.toUpperCase()}
                      </span>
                      <span className="text-[#6d81a0] font-rajdhani text-sm line-clamp-1">{c.title}</span>
                    </div>
                    <span
                      className={`text-xs font-rajdhani font-bold tracking-wider ${
                        c.status === 'completed' ? 'text-emerald-400' : 'text-[#ff4d5e]'
                      }`}
                    >
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
