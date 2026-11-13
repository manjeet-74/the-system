import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { rankOf } from '../lib/gameMath';
import { frameStyle } from '../lib/cosmetics';

type Kind = 'weekly' | 'level' | 'streak';
type Scope = 'global' | 'guild';

interface Row {
  rank: number;
  user_id: string;
  username: string | null;
  level: number;
  total_xp: number;
  weekly_xp: number;
  streak: number;
  title: string | null;
  frame: string | null;
  is_me: boolean;
}

const KINDS: { key: Kind; label: string }[] = [
  { key: 'weekly', label: 'WEEKLY XP' },
  { key: 'level', label: 'LEVEL' },
  { key: 'streak', label: 'STREAK' },
];

function Pill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-rajdhani font-bold text-xs tracking-wider px-4 py-1.5 rounded border cursor-pointer transition-colors ${
        active ? 'bg-[#3fd6f5]/15 border-[#3fd6f5] text-[#3fd6f5]' : 'border-[#3fd6f5]/20 text-[#6d81a0] hover:text-[#e6f1f7]'
      }`}
    >
      {children}
    </button>
  );
}

export function LeaderboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { profile, updateProfile } = useProfile();
  const [kind, setKind] = useState<Kind>('weekly');
  const [scope, setScope] = useState<Scope>('global');

  const { data: rows = [], isLoading, error } = useQuery<Row[]>({
    queryKey: ['leaderboard', user?.id, kind, scope],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('get_leaderboard', {
        p_kind: kind,
        p_scope: scope,
        p_limit: 50,
      });
      if (err) throw err;
      return (data ?? []) as Row[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const optIn = useMutation({
    mutationFn: () => updateProfile({ public_profile: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
  });

  const metric = (r: Row) =>
    kind === 'weekly' ? `${r.weekly_xp} XP` : kind === 'level' ? `LV ${r.level}` : `${r.streak} days`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="font-rajdhani text-2xl font-bold text-[#3fd6f5] tracking-wider">RANKINGS</h2>
        <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">
          Weekly XP resets every Monday (UTC). Only hunters who opted in appear on the global board.
        </p>
      </div>

      {profile && !profile.public_profile && scope === 'global' && (
        <div className="border border-amber-400/30 bg-amber-400/5 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="font-rajdhani text-sm text-[#e6f1f7]">
            You're hidden from the global board. Join it to compete — only your name, level and streak are shown.
          </p>
          <button
            type="button"
            onClick={() => optIn.mutate()}
            disabled={optIn.isPending}
            className="bg-amber-400 text-[#04070d] font-rajdhani font-bold text-sm px-4 py-1.5 rounded cursor-pointer disabled:opacity-50"
          >
            {optIn.isPending ? 'JOINING…' : 'JOIN THE BOARD'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <Pill key={k.key} active={kind === k.key} onClick={() => setKind(k.key)}>
              {k.label}
            </Pill>
          ))}
        </div>
        <div className="flex gap-2">
          <Pill active={scope === 'global'} onClick={() => setScope('global')}>GLOBAL</Pill>
          <Pill active={scope === 'guild'} onClick={() => setScope('guild')}>MY GUILD</Pill>
        </div>
      </div>

      {error && <p className="text-[#ff4d5e] font-rajdhani text-sm">Failed to load: {(error as Error).message}</p>}
      {isLoading && (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-[#3fd6f5]/30 border-t-[#3fd6f5] rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <div className="border border-[#3fd6f5]/10 rounded-lg p-8 text-center">
          <p className="text-[#6d81a0] font-rajdhani text-sm">
            {scope === 'guild'
              ? "You're not in a guild yet — join or create one on the Guild page."
              : 'Nobody has joined the board yet. Be the first.'}
          </p>
        </div>
      )}

      <ol className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.user_id}
            className={`flex items-center gap-4 rounded-lg border px-4 py-3 ${
              r.is_me ? 'border-[#3fd6f5]/60 bg-[#3fd6f5]/5' : 'border-[#3fd6f5]/10 bg-[#0a0f1c]'
            }`}
          >
            <span
              className={`font-rajdhani font-extrabold text-xl w-10 text-center ${
                r.rank === 1 ? 'text-amber-300' : r.rank === 2 ? 'text-slate-300' : r.rank === 3 ? 'text-orange-400' : 'text-[#6d81a0]'
              }`}
            >
              {r.rank}
            </span>
            <span
              className="w-10 h-10 rounded border-2 flex items-center justify-center font-rajdhani font-extrabold text-[#e6f1f7] bg-[#04070d] flex-shrink-0"
              style={frameStyle(r.frame)}
            >
              {rankOf(r.level)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-rajdhani font-bold text-[#e6f1f7] truncate">
                {r.username ?? 'Hunter'} {r.is_me && <span className="text-[#3fd6f5] text-xs">(you)</span>}
              </p>
              <p className="font-rajdhani text-xs text-[#6d81a0] truncate">
                LV {r.level}
                {r.title ? ` · ${r.title}` : ''}
              </p>
            </div>
            <span className="font-rajdhani font-bold text-[#3fd6f5] whitespace-nowrap">{metric(r)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
