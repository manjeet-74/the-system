import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface PlayerStats {
  user_id: string;
  str: number;
  int_: number;
  vit: number;
  sense: number;
  agi: number;
  updated_at: string;
}

export function usePlayerStats() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery<PlayerStats | null>({
    queryKey: ['player_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Supabase Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`player_stats:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_stats',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['player_stats', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    stats: stats ?? {
      user_id: user?.id || '',
      str: 0,
      int_: 0,
      vit: 0,
      sense: 0,
      agi: 0,
      updated_at: new Date().toISOString(),
    },
    loading: isLoading,
    error,
    refetchStats: refetch,
  };
}
