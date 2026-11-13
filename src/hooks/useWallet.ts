import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export function useWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: coins = 0, isLoading } = useQuery<number>({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from('player_wallet')
        .select('coins')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.coins ?? 0;
    },
    enabled: !!user,
  });

  // Live balance: coins also change from server-side events (AI grading, raid rewards).
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`player_wallet:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_wallet', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['wallet', user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return { coins, loading: isLoading };
}
