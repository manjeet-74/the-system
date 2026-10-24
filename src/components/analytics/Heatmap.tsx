import type { DailyCompletion } from '../../hooks/useAnalytics';

interface HeatmapProps {
  data: DailyCompletion[];
  days?: number;
}

function ratioToColor(ratio: number): string {
  if (ratio === 0) return 'bg-[#0a0f1c] border border-[#3fd6f5]/10';
  if (ratio < 0.33) return 'bg-[#3fd6f5]/20 border border-[#3fd6f5]/20';
  if (ratio < 0.67) return 'bg-[#3fd6f5]/40 border border-[#3fd6f5]/40';
  if (ratio < 1) return 'bg-[#3fd6f5]/60 border border-[#3fd6f5]/60';
  return 'bg-[#3fd6f5] border border-[#3fd6f5]';
}

export function Heatmap({ data, days = 90 }: HeatmapProps) {
  // Build a map from date string → ratio
  const ratioMap: Record<string, number> = {};
  for (const d of data) {
    ratioMap[d.log_date] = d.ratio;
  }

  // Generate the last `days` days
  const cells: { date: string; ratio: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    cells.push({ date: dateStr, ratio: ratioMap[dateStr] ?? -1 });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {cells.map(({ date, ratio }) => (
          <div
            key={date}
            title={`${date}: ${ratio < 0 ? 'no data' : `${Math.round(ratio * 100)}% complete`}`}
            className={`w-3 h-3 rounded-sm cursor-default transition-opacity ${
              ratio < 0
                ? 'bg-transparent border border-[#3fd6f5]/5'
                : ratioToColor(ratio)
            }`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-[#6d81a0] font-rajdhani">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="w-3 h-3 rounded-sm bg-[#0a0f1c] border border-[#3fd6f5]/10" />
          <div className="w-3 h-3 rounded-sm bg-[#3fd6f5]/20" />
          <div className="w-3 h-3 rounded-sm bg-[#3fd6f5]/40" />
          <div className="w-3 h-3 rounded-sm bg-[#3fd6f5]/60" />
          <div className="w-3 h-3 rounded-sm bg-[#3fd6f5]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
