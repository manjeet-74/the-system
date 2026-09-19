import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import type { QuestTemplate } from './useDailyQuests';
import { getTodayDateString } from './useDailyQuests';

export function useQuestTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const todayStr = getTodayDateString();

  const {
    data: questTemplates = [],
    isLoading,
    error,
    refetch,
  } = useQuery<QuestTemplate[]>({
    queryKey: ['quest_templates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('quest_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as QuestTemplate[];
    },
    enabled: !!user,
  });

  const archiveQuestMutation = useMutation({
    mutationFn: async (questId: string) => {
      if (!user) throw new Error('Not authenticated');

      // Verify that quest is not a default quest
      const { data: targetQuest } = await supabase
        .from('quest_templates')
        .select('is_default')
        .eq('id', questId)
        .single();

      if (targetQuest?.is_default) {
        throw new Error('Default system quests cannot be archived');
      }

      const { error } = await supabase
        .from('quest_templates')
        .update({ archived: true })
        .eq('id', questId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quest_templates', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily_logs', user?.id, todayStr] });
    },
  });

  return {
    questTemplates,
    activeTemplates: questTemplates.filter((q) => !q.archived),
    loading: isLoading,
    error,
    refetchTemplates: refetch,
    archiveQuest: (questId: string) => archiveQuestMutation.mutateAsync(questId),
    isArchiving: archiveQuestMutation.isPending,
  };
}
