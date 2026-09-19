import { usePlayerStats } from '../../hooks/usePlayerStats';
import { useProfile } from '../../hooks/useProfile';
import { levelOf, rankOf, totalXP, xpIntoLevel } from '../../lib/gameMath';
import { RankBadge } from './RankBadge';
import { XPBar } from './XPBar';
import { StatGrid } from './StatGrid';

export function StatusBar() {
  const { stats, loading: statsLoading } = usePlayerStats();
  const { profile, loading: profileLoading } = useProfile();

  if (statsLoading || profileLoading) {
    return (
      <div className="bg-[#0a0f1c] border border-[#3fd6f5]/20 p-6 rounded-lg animate-pulse">
        <div className="h-20 bg-[#04070d] rounded mb-4" />
        <div className="h-16 bg-[#04070d] rounded" />
      </div>
    );
  }

  const level = levelOf(stats);
  const rank = rankOf(level);
  const currentXP = xpIntoLevel(stats);
  const overallXP = totalXP(stats);

  return (
    <div className="bg-[#0a0f1c] border border-[#3fd6f5]/30 p-6 rounded-lg shadow-[0_0_20px_rgba(63,214,245,0.1)] space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#3fd6f5]/20 pb-6">
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-rajdhani text-2xl font-bold text-[#e6f1f7]">
                {profile?.username || 'Hunter'}
              </h2>
              <span className="font-rajdhani text-xs bg-[#3fd6f5]/10 text-[#3fd6f5] border border-[#3fd6f5]/30 px-2 py-0.5 rounded font-semibold">
                {profile?.class || 'SHADOW HUNTER'}
              </span>
            </div>
            <div className="font-rajdhani text-sm text-[#6d81a0] mt-1">
              LEVEL <span className="text-[#3fd6f5] font-bold text-lg">{level}</span>
              <span className="mx-2">•</span>
              TOTAL XP <span className="text-[#e6f1f7] font-semibold">{overallXP}</span>
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div className="w-full sm:w-72">
          <XPBar xp={currentXP} maxXP={100} />
        </div>
      </div>

      {/* Stats Grid */}
      <StatGrid stats={stats} />
    </div>
  );
}
