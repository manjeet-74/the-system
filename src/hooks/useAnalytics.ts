import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface DailyCompletion {
  log_date: string;
  done_count: number;
  total_count: number;
  ratio: number;
}

export interface StatSnapshot {
  recorded_at: string;
  str: number;
  int_: number;
  vit: number;
  sense: number;
  agi: number;
}

export interface StatCompletionRate {
  stat: string;
  done: number;
  total: number;
  rate: number;
}

export function useAnalytics(windowDays = 90) {
  const { user } = useAuth();

  const heatmapQuery = useQuery<DailyCompletion[]>({
    queryKey: ['analytics_heatmap', user?.id, windowDays],
    queryFn: async () => {
      if (!user) return [];
      const since = new Date(Date.now() - windowDays * 86400000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_logs')
        .select('log_date, done')
        .eq('user_id', user.id)
        .gte('log_date', since);

      if (error) throw error;

      const byDate: Record<string, { done: number; total: number }> = {};
      for (const row of data ?? []) {
        if (!byDate[row.log_date]) byDate[row.log_date] = { done: 0, total: 0 };
        byDate[row.log_date].total += 1;
        if (row.done) byDate[row.log_date].done += 1;
      }

      return Object.entries(byDate).map(([log_date, counts]) => ({
        log_date,
        done_count: counts.done,
        total_count: counts.total,
        ratio: counts.total > 0 ? counts.done / counts.total : 0,
      }));
    },
    enabled: !!user,
  });

  const statHistoryQuery = useQuery<StatSnapshot[]>({
    queryKey: ['analytics_stat_history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('stat_history')
        .select('recorded_at, str, int_, vit, sense, agi')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: true })
        .limit(90);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const completionRateQuery = useQuery<StatCompletionRate[]>({
    queryKey: ['analytics_completion_rate', user?.id, windowDays],
    queryFn: async () => {
      if (!user) return [];
      const since = new Date(Date.now() - windowDays * 86400000).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_logs')
        .select('done, quest_templates(stat)')
        .eq('user_id', user.id)
        .gte('log_date', since);

      if (error) throw error;

      const byStat: Record<string, { done: number; total: number }> = {};
      for (const row of data ?? []) {
        const stat = (row.quest_templates as any)?.stat ?? 'UNKNOWN';
        if (!byStat[stat]) byStat[stat] = { done: 0, total: 0 };
        byStat[stat].total += 1;
        if (row.done) byStat[stat].done += 1;
      }

      return Object.entries(byStat).map(([stat, counts]) => ({
        stat,
        done: counts.done,
        total: counts.total,
        rate: counts.total > 0 ? counts.done / counts.total : 0,
      }));
    },
    enabled: !!user,
  });

  return {
    heatmap: heatmapQuery.data ?? [],
    heatmapLoading: heatmapQuery.isLoading,
    heatmapError: heatmapQuery.error,
    statHistory: statHistoryQuery.data ?? [],
    statHistoryLoading: statHistoryQuery.isLoading,
    statHistoryError: statHistoryQuery.error,
    completionRates: completionRateQuery.data ?? [],
    completionRatesLoading: completionRateQuery.isLoading,
    completionRatesError: completionRateQuery.error,
  };
}
