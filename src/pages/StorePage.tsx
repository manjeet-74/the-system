import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useWallet } from '../hooks/useWallet';
import { usePurchases, useStoreItems, type StoreItem } from '../hooks/useCosmetics';
import { ProfileTabs } from '../components/profile/ProfileTabs';

const SECTIONS: { kind: StoreItem['kind']; label: string; hint: string }[] = [
  { kind: 'theme', label: 'HUD THEMES', hint: 'Recolors the entire interface.' },
  { kind: 'title', label: 'TITLES', hint: 'Shown beside your name.' },
  { kind: 'frame', label: 'PORTRAIT FRAMES', hint: 'A ring around your hunter portrait.' },
];

const THEME_SWATCH: Record<string, string> = { crimson: '#ff4d5e', violet: '#a78bfa', emerald: '#34d399' };

export function StorePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const { coins } = useWallet();
  const { data: items = [], isLoading } = useStoreItems();
  const { data: owned = new Set<string>() } = usePurchases();
  const [message, setMessage] = useState('');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['purchases', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
  };

  const act = useMutation({
    mutationFn: async (a: { type: 'buy' | 'equip' | 'unequip'; item: StoreItem }) => {
      if (a.type === 'buy') {
        const { error } = await supabase.rpc('buy_item', { p_item: a.item.id });
        if (error) throw error;
        return;
      }
      if (a.item.kind === 'title') {
        const { error } = await supabase.rpc('equip_title', { p_title: a.type === 'equip' ? a.item.value : null });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('equip_cosmetic', {
          p_kind: a.item.kind,
          p_item: a.type === 'equip' ? a.item.id : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setMessage('');
      refresh();
    },
    onError: (err: any) => setMessage(err?.message ?? 'Something went wrong.'),
  });

  const isEquipped = (i: StoreItem) =>
    i.kind === 'theme'
      ? profile?.equipped_theme === i.value
      : i.kind === 'frame'
        ? profile?.equipped_frame === i.value
        : profile?.equipped_title === i.value;

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileTabs />

      <div className="mb-5">
        <h2 className="font-rajdhani text-2xl font-bold text-[#3fd6f5] tracking-wider">SHADOW EXCHANGE</h2>
        <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">
          Spend the coins you earn from quests, bosses and raids. Purely cosmetic — no real money, ever.
        </p>
        <p className="font-rajdhani font-bold text-amber-300 mt-2">Balance: ◈ {coins.toLocaleString()}</p>
      </div>

      {message && (
        <div className="mb-4 p-3 border border-[#ff4d5e]/40 bg-[#ff4d5e]/10 rounded text-sm text-[#ff4d5e] font-rajdhani">
          {message}
        </div>
      )}
      {isLoading && <p className="text-[#6d81a0] font-rajdhani">Loading…</p>}

      {SECTIONS.map((sec) => (
        <section key={sec.kind} className="mb-8">
          <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">{sec.label}</h3>
          <p className="text-[#6d81a0] font-rajdhani text-xs mb-3">{sec.hint}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {items
              .filter((i) => i.kind === sec.kind)
              .map((i) => {
                const have = owned.has(i.id);
                const on = isEquipped(i);
                const afford = coins >= i.price;
                const swatch = i.kind === 'theme' ? THEME_SWATCH[i.value] : i.kind === 'frame' ? i.value : undefined;
                return (
                  <div
                    key={i.id}
                    className={`rounded-lg border p-4 flex items-center gap-4 ${
                      on ? 'border-[#3fd6f5]/60 bg-[#3fd6f5]/5' : 'border-[#3fd6f5]/15 bg-[#0a0f1c]'
                    }`}
                  >
                    {swatch ? (
                      <span className="w-10 h-10 rounded flex-shrink-0 border-2" style={{ borderColor: swatch, background: `${swatch}22`, boxShadow: `0 0 12px ${swatch}55` }} />
                    ) : (
                      <span className="w-10 h-10 rounded flex-shrink-0 flex items-center justify-center bg-amber-400/10 text-amber-300 font-rajdhani font-bold">T</span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-rajdhani font-bold text-[#e6f1f7]">{i.name}</p>
                      <p className="text-[#6d81a0] font-rajdhani text-xs">{i.description}</p>
                    </div>
                    {have ? (
                      <button
                        type="button"
                        disabled={act.isPending}
                        onClick={() => act.mutate({ type: on ? 'unequip' : 'equip', item: i })}
                        className="border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-bold text-xs px-3 py-1.5 rounded cursor-pointer whitespace-nowrap disabled:opacity-50"
                      >
                        {on ? 'EQUIPPED ✓' : 'EQUIP'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={act.isPending || !afford}
                        onClick={() => act.mutate({ type: 'buy', item: i })}
                        className="bg-amber-400/15 border border-amber-400/50 text-amber-300 hover:bg-amber-400/25 font-rajdhani font-bold text-xs px-3 py-1.5 rounded cursor-pointer whitespace-nowrap disabled:opacity-40"
                        title={afford ? 'Buy' : 'Not enough coins'}
                      >
                        ◈ {i.price}
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
