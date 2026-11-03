import type { Rank } from '../../lib/gameMath';

interface RankBadgeProps {
  rank: Rank;
}

const RANK_COLORS: Record<Rank, { border: string; text: string; glow: string }> = {
  E: { border: 'border-slate-500', text: 'text-slate-300', glow: 'rgba(100,116,139,0.2)' },
  D: { border: 'border-emerald-500', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.3)' },
  C: { border: 'border-cyan-500', text: 'text-cyan-400', glow: 'rgba(6,182,212,0.4)' },
  B: { border: 'border-blue-500', text: 'text-blue-400', glow: 'rgba(59,130,246,0.4)' },
  A: { border: 'border-purple-500', text: 'text-purple-400', glow: 'rgba(168,85,247,0.5)' },
  S: { border: 'border-amber-400', text: 'text-amber-300', glow: 'rgba(251,191,36,0.6)' },
};

export function RankBadge({ rank }: RankBadgeProps) {
  const style = RANK_COLORS[rank] || RANK_COLORS.E;

  return (
    <div
      className={`relative inline-flex items-center justify-center w-16 h-16 bg-[#04070d] border-2 ${style.border} rounded`}
      style={{ boxShadow: `0 0 15px ${style.glow}` }}
    >
      <span className="font-rajdhani text-xs text-[#6d81a0] absolute top-1 font-semibold">
        RANK
      </span>
      <span className={`font-rajdhani text-3xl font-extrabold ${style.text} mt-2`}>
        {rank}
      </span>
    </div>
  );
}
