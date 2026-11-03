import type { PlayerStats } from '../../hooks/usePlayerStats';

interface StatGridProps {
  stats: PlayerStats;
}

const STAT_LABELS: { key: keyof Omit<PlayerStats, 'user_id' | 'updated_at'>; label: string; desc: string }[] = [
  { key: 'str', label: 'STR', desc: 'STRENGTH' },
  { key: 'agi', label: 'AGI', desc: 'AGILITY' },
  { key: 'int_', label: 'INT', desc: 'INTELLIGENCE' },
  { key: 'vit', label: 'VIT', desc: 'VITALITY' },
  { key: 'sense', label: 'SENSE', desc: 'PERCEPTION' },
];

export function StatGrid({ stats }: StatGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 w-full">
      {STAT_LABELS.map(({ key, label, desc }, idx) => (
        <div
          key={key}
          className={`bg-[#04070d] border border-[#3fd6f5]/20 p-3 rounded text-center relative overflow-hidden group hover:border-[#3fd6f5]/50 transition-colors ${
            idx === STAT_LABELS.length - 1 ? 'col-span-2 sm:col-span-1' : ''
          }`}
        >
          <div className="text-[10px] font-rajdhani text-[#6d81a0] font-semibold tracking-wider">
            {desc}
          </div>
          <div className="font-rajdhani text-2xl font-bold text-[#e6f1f7] my-1">
            {stats[key] || 0}
          </div>
          <div className="text-[10px] font-rajdhani text-[#3fd6f5] font-bold">
            [{label}]
          </div>
        </div>
      ))}
    </div>
  );
}
