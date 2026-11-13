import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  username: string | null;
  class: string | null;
  courage_test_passed: boolean;
  created_at: string;
  public_profile: boolean;
  equipped_title: string | null;
  equipped_theme: string | null;
  equipped_frame: string | null;
}

export function useProfile() {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading: profileLoading,
    error,
    refetch,
  } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error('No authenticated user');
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(['profile', user?.id], updatedData);
    },
  });

  return {
    profile,
    loading: authLoading || (!!user && profileLoading),
    error,
    refetchProfile: refetch,
    updateProfile: updateProfileMutation.mutateAsync,
  };
}
