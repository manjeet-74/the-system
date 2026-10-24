import type { ForgeChallenge } from '../../hooks/useForge';

const TIER_COLORS: Record<string, string> = {
  spark: 'text-amber-400',
  build: 'text-cyan-400',
  dungeon: 'text-purple-400',
};

interface ForgeHistoryProps {
  challenges: ForgeChallenge[];
}

export function ForgeHistory({ challenges }: ForgeHistoryProps) {
  if (challenges.length === 0) {
    return (
      <p className="text-[#6d81a0] font-rajdhani text-sm text-center py-6">
        No completed or expired challenges yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {challenges.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between p-3 bg-[#04070d] border border-[#3fd6f5]/10 rounded"
        >
          <div className="flex items-center gap-3">
            <span className={`text-xs font-rajdhani font-bold tracking-wider ${TIER_COLORS[c.tier]}`}>
              {c.tier.toUpperCase()}
            </span>
            <span className="text-[#6d81a0] font-rajdhani text-sm line-clamp-1">{c.brief}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span
              className={`text-xs font-rajdhani font-bold tracking-wider ${
                c.status === 'completed' ? 'text-emerald-400' : 'text-[#ff4d5e]'
              }`}
            >
              {c.status.toUpperCase()}
            </span>
            {c.status === 'completed' && (
              <span className="text-xs text-[#3fd6f5] font-rajdhani">+{c.reward_xp} XP</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
