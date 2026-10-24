import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface ForgeChallenge {
  id: string;
  user_id: string;
  tier: 'spark' | 'build' | 'dungeon';
  brief: string;
  status: 'active' | 'completed' | 'expired';
  unlocked_at: string;
  deadline: string | null;
  completed_at: string | null;
  reward_xp: number;
}

export function useForge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: challenges = [],
    isLoading,
    error,
  } = useQuery<ForgeChallenge[]>({
    queryKey: ['forge_challenges', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('forge_challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const activeChallenge = challenges.find((c) => c.status === 'active') ?? null;
  const history = challenges.filter((c) => c.status !== 'active');

  const completeMutation = useMutation({
    mutationFn: async (forgeId: string) => {
      const { error } = await supabase.rpc('complete_forge', { p_forge_id: forgeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forge_challenges', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['player_stats', user?.id] });
    },
  });

  return {
    challenges,
    activeChallenge,
    history,
    loading: isLoading,
    error,
    completeForge: (id: string) => completeMutation.mutateAsync(id),
    isCompleting: completeMutation.isPending,
    completeError: completeMutation.error,
  };
}
