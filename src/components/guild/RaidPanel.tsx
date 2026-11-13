import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';

export interface Raid {
  id: string;
  boss_id: string;
  boss_title: string;
  boss_brief: string;
  status: 'open' | 'active' | 'cleared';
  deadline: string;
  invite_code: string;
  is_host: boolean;
  partner: string | null;
  my_done: boolean;
  partner_done: boolean;
  my_evidence: string | null;
}

export function useMyRaids() {
  const { user } = useAuth();
  return useQuery<Raid[]>({
    queryKey: ['my_raids', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('my_raids');
      if (error) throw error;
      return (data ?? []) as Raid[];
    },
    enabled: !!user,
    refetchInterval: 20_000, // see your partner's progress without reloading
  });
}

function RaidCard({ raid }: { raid: Raid }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [evidence, setEvidence] = useState('');
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/raid/${raid.invite_code}`;

  const submit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('submit_raid', { p_raid_id: raid.id, p_evidence: evidence });
      if (error) throw error;
    },
    onSuccess: () => {
      setEvidence('');
      ['my_raids', 'player_stats', 'wallet', 'achievements'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k, user?.id] }),
      );
    },
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is shown below for manual copy */
    }
  };

  const daysLeft = Math.max(0, Math.ceil((new Date(raid.deadline).getTime() - Date.now()) / 86400000));

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        raid.status === 'cleared' ? 'border-emerald-400/30 bg-emerald-400/5' : 'border-[#3fd6f5]/25 bg-[#0a0f1c]'
      }`}
    >
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-rajdhani font-bold text-[#e6f1f7]">{raid.boss_title}</p>
          <p className="font-rajdhani text-xs text-[#6d81a0]">
            {raid.partner ? `with ${raid.partner}` : 'waiting for a partner'}
            {raid.status !== 'cleared' && ` · ${daysLeft}d left`}
          </p>
        </div>
        <span
          className={`font-rajdhani text-xs font-bold tracking-wider ${
            raid.status === 'cleared' ? 'text-emerald-400' : raid.status === 'active' ? 'text-[#3fd6f5]' : 'text-amber-300'
          }`}
        >
          {raid.status === 'cleared' ? 'CLEARED' : raid.status === 'active' ? 'IN PROGRESS' : 'OPEN'}
        </span>
      </div>

      {raid.status === 'open' && raid.is_host && (
        <div className="space-y-1">
          <p className="font-rajdhani text-xs text-[#6d81a0]">Send this link to a friend:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 bg-[#04070d] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-1.5 rounded text-xs font-rajdhani"
            />
            <button
              type="button"
              onClick={copy}
              className="border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-bold text-xs px-3 rounded cursor-pointer"
            >
              {copied ? 'COPIED ✓' : 'COPY'}
            </button>
          </div>
        </div>
      )}

      {raid.status === 'active' && (
        <>
          <div className="flex gap-4 font-rajdhani text-xs">
            <span className={raid.my_done ? 'text-emerald-400' : 'text-[#6d81a0]'}>{raid.my_done ? '✓' : '○'} You</span>
            <span className={raid.partner_done ? 'text-emerald-400' : 'text-[#6d81a0]'}>
              {raid.partner_done ? '✓' : '○'} {raid.partner ?? 'Partner'}
            </span>
          </div>
          {raid.my_done ? (
            <p className="font-rajdhani text-sm text-[#6d81a0]">Your report is in. Waiting for {raid.partner ?? 'your partner'}…</p>
          ) : (
            <>
              <p className="selectable font-rajdhani text-sm text-[#6d81a0]">{raid.boss_brief}</p>
              <textarea
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Describe what you did (link to your work if you can) — at least 20 characters."
                className="w-full bg-[#04070d] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
              />
              {submit.error && <p className="text-[#ff4d5e] font-rajdhani text-xs">{(submit.error as Error).message}</p>}
              <button
                type="button"
                disabled={submit.isPending || evidence.trim().length < 20}
                onClick={() => submit.mutate()}
                className="bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold text-sm px-4 py-1.5 rounded cursor-pointer disabled:opacity-40"
              >
                {submit.isPending ? 'SUBMITTING…' : 'SUBMIT MY PART'}
              </button>
            </>
          )}
        </>
      )}

      {raid.status === 'cleared' && (
        <p className="font-rajdhani text-sm text-emerald-400">Both hunters finished. +150 XP and +75 ◈ each.</p>
      )}
    </div>
  );
}

export function RaidList() {
  const { data: raids = [], isLoading } = useMyRaids();
  if (isLoading || raids.length === 0) return null;
  return (
    <section className="space-y-3">
      <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">CO-OP RAIDS</h3>
      {raids.map((r) => (
        <RaidCard key={r.id} raid={r} />
      ))}
    </section>
  );
}
