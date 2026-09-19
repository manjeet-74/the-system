import type { Rank } from '../../lib/gameMath';

interface RankBadgeProps {
  rank: Rank;
}

const RANK_COLORS: Record<Rank, { border: string; text: string; shadow: string }> = {
  E: { border: 'border-slate-500', text: 'text-slate-300', shadow: 'shadow-slate-500/20' },
  D: { border: 'border-emerald-500', text: 'text-emerald-400', shadow: 'shadow-emerald-500/30' },
  C: { border: 'border-cyan-500', text: 'text-cyan-400', shadow: 'shadow-cyan-500/40' },
  B: { border: 'border-blue-500', text: 'text-blue-400', shadow: 'shadow-blue-500/40' },
  A: { border: 'border-purple-500', text: 'text-purple-400', shadow: 'shadow-purple-500/50' },
  S: { border: 'border-amber-400', text: 'text-amber-300', shadow: 'shadow-amber-400/60' },
};

export function RankBadge({ rank }: RankBadgeProps) {
  const style = RANK_COLORS[rank] || RANK_COLORS.E;

  return (
    <div
      className={`relative inline-flex items-center justify-center w-16 h-16 bg-[#04070d] border-2 ${style.border} rounded shadow-[0_0_15px] ${style.shadow}`}
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
