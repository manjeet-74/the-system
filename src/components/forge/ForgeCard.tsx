import type { ForgeChallenge } from '../../hooks/useForge';

const TIER_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  spark: { color: 'text-amber-400', bg: 'border-amber-500/30 bg-amber-500/5', label: 'SPARK' },
  build: { color: 'text-cyan-400', bg: 'border-cyan-500/30 bg-cyan-500/5', label: 'BUILD' },
  dungeon: { color: 'text-purple-400', bg: 'border-purple-500/30 bg-purple-500/5', label: 'DUNGEON' },
};

interface ForgeCardProps {
  challenge: ForgeChallenge;
  onComplete: (id: string) => void;
  isCompleting: boolean;
}

export function ForgeCard({ challenge, onComplete, isCompleting }: ForgeCardProps) {
  const style = TIER_STYLES[challenge.tier] ?? TIER_STYLES.spark;

  const deadlineDate = challenge.deadline ? new Date(challenge.deadline) : null;
  const isExpired = deadlineDate ? deadlineDate < new Date() : false;
  const daysLeft = deadlineDate
    ? Math.max(0, Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className={`border rounded-lg p-5 space-y-3 ${style.bg}`}>
      <div className="flex justify-between items-start">
        <span className={`text-xs font-rajdhani font-bold tracking-widest ${style.color}`}>
          {style.label} CHALLENGE
        </span>
        <span className="text-xs font-rajdhani text-[#6d81a0]">
          +{challenge.reward_xp} XP
        </span>
      </div>

      <p className="text-[#e6f1f7] font-rajdhani text-base selectable">{challenge.brief}</p>

      <div className="flex justify-between items-center">
        <span className="text-xs text-[#6d81a0] font-rajdhani">
          {isExpired
            ? 'DEADLINE PASSED'
            : daysLeft !== null
            ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
            : ''}
        </span>

        {challenge.status === 'active' && !isExpired && (
          <button
            onClick={() => onComplete(challenge.id)}
            disabled={isCompleting}
            className={`${style.color} border font-rajdhani font-bold text-sm px-4 py-1.5 rounded transition-colors cursor-pointer disabled:opacity-50 hover:opacity-80`}
            style={{ borderColor: 'currentColor' }}
          >
            {isCompleting ? 'COMPLETING...' : 'MARK COMPLETE'}
          </button>
        )}

        {isExpired && challenge.status === 'active' && (
          <span className="text-xs text-[#ff4d5e] font-rajdhani font-bold">EXPIRED</span>
        )}
      </div>
    </div>
  );
}
