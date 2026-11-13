import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface Streak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  penalty_active: boolean;
}

export function useStreak() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: streak,
    isLoading,
    error,
    refetch,
  } = useQuery<Streak | null>({
    queryKey: ['streak', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription for streaks table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      // Unique name per hook instance: supabase-js returns the *existing* channel for a repeated
      // topic, and adding listeners to an already-subscribed channel throws. Several components
      // (HUD, rank-up overlay, wallet chips) watch the same table at once.
      .channel(`streaks:${user.id}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'streaks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['streak', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    streak: streak ?? {
      user_id: user?.id || '',
      current_streak: 0,
      longest_streak: 0,
      last_active_date: null,
      penalty_active: false,
    },
    loading: isLoading,
    error,
    refetchStreak: refetch,
  };
}
