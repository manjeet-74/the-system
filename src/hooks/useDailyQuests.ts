import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface QuestTemplate {
  id: string;
  user_id: string;
  title: string;
  stat: 'STR' | 'INT' | 'VIT' | 'SENSE' | 'AGI';
  xp: number;
  is_default: boolean;
  verification_method: 'manual' | 'github' | 'ai_judge';
  rubric: string | null;
  archived: boolean;
  created_at: string;
}

export interface DailyLogWithQuest {
  id: string;
  user_id: string;
  log_date: string;
  quest_id: string;
  done: boolean;
  completed_at: string | null;
  xp_awarded: number | null;
  verified_via: string | null;
  is_penalty: boolean;
  quest_templates: QuestTemplate;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useDailyQuests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const todayStr = getTodayDateString();

  const {
    data: dailyLogs = [],
    isLoading,
    error,
    refetch,
  } = useQuery<DailyLogWithQuest[]>({
    queryKey: ['daily_logs', user?.id, todayStr],
    queryFn: async () => {
      if (!user) return [];

      // 1. Fetch existing daily logs for today
      const { data: existingLogs, error: fetchError } = await supabase
        .from('daily_logs')
        .select('*, quest_templates(*)')
        .eq('user_id', user.id)
        .eq('log_date', todayStr);

      if (fetchError) throw fetchError;

      if (existingLogs && existingLogs.length > 0) {
        return existingLogs as DailyLogWithQuest[];
      }

      // No logs yet — invoke the daily-rollover edge function to seed today's quests for this user.
      // The function processes all profiles but skips those already rolled over today, so it is safe
      // to call at any time. New users (null last_active_date) will have their first logs generated.
      await supabase.functions.invoke('daily-rollover');

      // Re-fetch after rollover
      const { data: newLogs, error: refetchError } = await supabase
        .from('daily_logs')
        .select('*, quest_templates(*)')
        .eq('user_id', user.id)
        .eq('log_date', todayStr);

      if (refetchError) throw refetchError;
      return (newLogs ?? []) as DailyLogWithQuest[];
    },
    enabled: !!user,
  });

  const toggleQuestMutation = useMutation({
    mutationFn: async ({ logId, done }: { logId: string; done: boolean }) => {
      const { error } = await supabase.rpc('complete_quest', {
        p_log_id: logId,
        p_done: done,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily_logs', user?.id, todayStr] });
      queryClient.invalidateQueries({ queryKey: ['player_stats', user?.id] });
    },
  });

  return {
    dailyLogs,
    loading: isLoading,
    error,
    refetchDailyQuests: refetch,
    toggleQuest: (logId: string, currentDone: boolean) =>
      // Swallow the rejection here so an RPC failure doesn't become an unhandled promise
      // rejection; the error is surfaced to the UI via toggleError below.
      toggleQuestMutation.mutateAsync({ logId, done: !currentDone }).catch(() => {}),
    isToggling: toggleQuestMutation.isPending,
    toggleError: toggleQuestMutation.error as Error | null,
  };
}
