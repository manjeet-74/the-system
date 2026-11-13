import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

interface Member {
  user_id: string;
  role: 'owner' | 'member';
  username: string | null;
  title: string | null;
  level: number;
  weekly_xp: number;
}
interface Guild {
  id: string;
  name: string;
  invite_code: string;
  my_role: 'owner' | 'member';
  goal: number;
  progress: number;
  members: Member[];
}

const inputCls =
  'flex-1 bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani';
const btnCls =
  'bg-[#3fd6f5]/10 border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/20 font-rajdhani font-bold text-sm px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap';

export function GuildPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Invite links look like /guild?join=CODE
  useEffect(() => {
    const c = params.get('join');
    if (c) setCode(c);
  }, [params]);

  const { data: guild, isLoading } = useQuery<Guild | null>({
    queryKey: ['guild', user?.id],
    queryFn: async () => {
      const { data, error: err } = await supabase.rpc('get_my_guild');
      if (err) throw err;
      return (data as Guild | null) ?? null;
    },
    enabled: !!user,
  });

  const done = () => {
    setError('');
    setParams({}, { replace: true });
    queryClient.invalidateQueries({ queryKey: ['guild'] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    queryClient.invalidateQueries({ queryKey: ['achievements'] });
    queryClient.invalidateQueries({ queryKey: ['wallet'] });
  };
  const fail = (err: any) => setError(err?.message ?? 'Something went wrong.');

  const create = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.rpc('create_guild', { p_name: name });
      if (err) throw err;
    },
    onSuccess: () => {
      setName('');
      done();
    },
    onError: fail,
  });
  const join = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.rpc('join_guild', { p_code: code });
      if (err) throw err;
    },
    onSuccess: () => {
      setCode('');
      done();
    },
    onError: fail,
  });
  const leave = useMutation({
    mutationFn: async () => {
      const { error: err } = await supabase.rpc('leave_guild');
      if (err) throw err;
    },
    onSuccess: done,
    onError: fail,
  });

  const inviteUrl = guild ? `${window.location.origin}/guild?join=${guild.invite_code}` : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy — select the link and copy it manually.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#3fd6f5]/30 border-t-[#3fd6f5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="font-rajdhani text-2xl font-bold text-[#3fd6f5] tracking-wider">GUILD</h2>
        <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">
          Hunt together. Your guild shares a weekly XP goal — 300 XP per member.
        </p>
      </div>

      {error && (
        <div className="p-3 border border-[#ff4d5e]/40 bg-[#ff4d5e]/10 rounded text-sm text-[#ff4d5e] font-rajdhani">{error}</div>
      )}

      {!guild ? (
        <div className="space-y-5">
          <section className="bg-[#04070d] border border-[#3fd6f5]/20 rounded-lg p-5 space-y-3">
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">JOIN A GUILD</h3>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Invite code" className={inputCls} />
              <button type="button" className={btnCls} disabled={!code.trim() || join.isPending} onClick={() => join.mutate()}>
                {join.isPending ? 'JOINING…' : 'JOIN'}
              </button>
            </div>
          </section>
          <section className="bg-[#04070d] border border-[#3fd6f5]/20 rounded-lg p-5 space-y-3">
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">FOUND A GUILD</h3>
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="Guild name (3–24 characters)" className={inputCls} />
              <button type="button" className={btnCls} disabled={name.trim().length < 3 || create.isPending} onClick={() => create.mutate()}>
                {create.isPending ? 'CREATING…' : 'CREATE'}
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="bg-[#0a0f1c] border border-[#3fd6f5]/30 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-rajdhani text-2xl font-bold text-[#e6f1f7]">{guild.name}</h3>
              <span className="font-rajdhani text-xs text-[#6d81a0]">{guild.members.length} / 20 members</span>
            </div>
            <div>
              <div className="flex justify-between font-rajdhani text-xs text-[#6d81a0] mb-1">
                <span>WEEKLY GUILD GOAL</span>
                <span>
                  <span className="text-[#3fd6f5] font-bold">{guild.progress}</span> / {guild.goal} XP
                </span>
              </div>
              <div className="h-3 bg-[#04070d] rounded overflow-hidden border border-[#3fd6f5]/20">
                <div
                  className="h-full bg-gradient-to-r from-[#3fd6f5]/60 to-[#3fd6f5] transition-all duration-500"
                  style={{ width: `${Math.min(100, (guild.progress / Math.max(1, guild.goal)) * 100)}%` }}
                />
              </div>
              {guild.progress >= guild.goal && (
                <p className="font-rajdhani text-xs text-emerald-400 font-bold mt-1">GOAL REACHED THIS WEEK ✓</p>
              )}
            </div>
            <div>
              <p className="font-rajdhani text-xs text-[#6d81a0] mb-1 font-semibold tracking-wider">INVITE LINK</p>
              <div className="flex gap-2">
                <input readOnly value={inviteUrl} className={`${inputCls} text-xs`} onFocus={(e) => e.currentTarget.select()} />
                <button type="button" className={btnCls} onClick={copy}>
                  {copied ? 'COPIED ✓' : 'COPY'}
                </button>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">ROSTER · THIS WEEK</h3>
            {guild.members.map((m, i) => (
              <div
                key={m.user_id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 ${
                  m.user_id === user?.id ? 'border-[#3fd6f5]/50 bg-[#3fd6f5]/5' : 'border-[#3fd6f5]/10 bg-[#0a0f1c]'
                }`}
              >
                <span className="font-rajdhani font-bold text-[#6d81a0] w-6">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-rajdhani font-bold text-[#e6f1f7] truncate">
                    {m.username ?? 'Hunter'}
                    {m.role === 'owner' && <span className="ml-2 text-[10px] text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded">LEADER</span>}
                  </p>
                  <p className="font-rajdhani text-xs text-[#6d81a0]">
                    LV {m.level}
                    {m.title ? ` · ${m.title}` : ''}
                  </p>
                </div>
                <span className="font-rajdhani font-bold text-[#3fd6f5]">{m.weekly_xp} XP</span>
              </div>
            ))}
          </section>

          <button
            type="button"
            disabled={leave.isPending}
            onClick={() => {
              if (window.confirm(`Leave ${guild.name}?`)) leave.mutate();
            }}
            className="border border-[#ff4d5e]/40 text-[#ff4d5e] hover:bg-[#ff4d5e]/10 font-rajdhani font-bold text-sm px-4 py-2 rounded cursor-pointer disabled:opacity-50"
          >
            {leave.isPending ? 'LEAVING…' : 'LEAVE GUILD'}
          </button>
        </div>
      )}
    </div>
  );
}
