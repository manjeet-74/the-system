import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  title: string | null;
  coin_reward: number;
  sort: number;
}

export interface StoreItem {
  id: string;
  kind: 'theme' | 'title' | 'frame';
  name: string;
  description: string;
  price: number;
  value: string;
  sort: number;
}

export function useAchievements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      if (!user) return { all: [] as Achievement[], unlocked: new Set<string>() };
      // Pick up any unlocks that happened outside a DB trigger (idempotent, cheap).
      await supabase.rpc('sync_achievements');
      // A sync can mint coins, so refresh the balance — once per fetch, never during render.
      queryClient.invalidateQueries({ queryKey: ['wallet', user.id] });
      const [all, mine] = await Promise.all([
        supabase.from('achievements').select('*').order('sort'),
        supabase.from('user_achievements').select('achievement_id').eq('user_id', user.id),
      ]);
      if (all.error) throw all.error;
      if (mine.error) throw mine.error;
      return {
        all: (all.data ?? []) as Achievement[],
        unlocked: new Set((mine.data ?? []).map((r) => r.achievement_id as string)),
      };
    },
    enabled: !!user,
  });

  return query;
}

export function useStoreItems() {
  return useQuery<StoreItem[]>({
    queryKey: ['store_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('store_items').select('*').order('sort');
      if (error) throw error;
      return (data ?? []) as StoreItem[];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePurchases() {
  const { user } = useAuth();
  return useQuery<Set<string>>({
    queryKey: ['purchases', user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase.from('purchases').select('item_id').eq('user_id', user.id);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.item_id as string));
    },
    enabled: !!user,
  });
}

/** Every title the player may equip: achievement titles + purchased title items. */
export function useOwnedTitles(): string[] {
  const { data: ach } = useAchievements();
  const { data: items = [] } = useStoreItems();
  const { data: owned } = usePurchases();
  const titles = new Set<string>();
  for (const a of ach?.all ?? []) if (a.title && ach?.unlocked.has(a.id)) titles.add(a.title);
  for (const i of items) if (i.kind === 'title' && owned?.has(i.id)) titles.add(i.value);
  return [...titles];
}
