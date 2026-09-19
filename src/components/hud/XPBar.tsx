interface XPBarProps {
  xp: number;
  maxXP?: number;
}

export function XPBar({ xp, maxXP = 100 }: XPBarProps) {
  const percentage = Math.min(100, Math.max(0, (xp / maxXP) * 100));

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1 text-xs font-rajdhani">
        <span className="text-[#6d81a0] font-semibold tracking-wider">EXP PROGRESS</span>
        <span className="text-[#3fd6f5] font-bold">
          {xp} / {maxXP} XP ({Math.round(percentage)}%)
        </span>
      </div>
      <div className="w-full h-3 bg-[#04070d] border border-[#3fd6f5]/30 rounded p-[2px] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#3fd6f5]/70 to-[#3fd6f5] rounded-sm transition-all duration-500 shadow-[0_0_10px_rgba(63,214,245,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
