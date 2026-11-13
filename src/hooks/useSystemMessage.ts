import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

/** One line from THE SYSTEM per day. The edge function caches it, so this is one cheap call. */
export function useSystemMessage() {
  const { user } = useAuth();
  const day = new Date().toISOString().split('T')[0];

  return useQuery<string | null>({
    queryKey: ['system_message', user?.id, day],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('system-message');
      if (error) throw error;
      return (data?.message as string) ?? null;
    },
    enabled: !!user,
    staleTime: Infinity, // the message is fixed for the day
    retry: 1,
  });
}
