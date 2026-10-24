import { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { Heatmap } from '../components/analytics/Heatmap';
import { StatChart } from '../components/analytics/StatChart';
import { CompletionRateChart } from '../components/analytics/CompletionRateChart';

const WINDOWS = [7, 30, 90] as const;

export function AnalyticsPage() {
  const [window, setWindow] = useState<7 | 30 | 90>(90);
  const {
    heatmap, heatmapLoading, heatmapError,
    statHistory, statHistoryLoading, statHistoryError,
    completionRates, completionRatesLoading, completionRatesError,
  } = useAnalytics(window);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-rajdhani text-2xl font-bold text-[#3fd6f5] tracking-wider">ANALYTICS</h2>
          <p className="text-[#6d81a0] font-rajdhani text-sm mt-1">
            Progress history and completion patterns.
          </p>
        </div>
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`font-rajdhani font-bold text-xs px-3 py-1.5 rounded border transition-colors cursor-pointer ${
                window === w
                  ? 'bg-[#3fd6f5]/10 border-[#3fd6f5]/50 text-[#3fd6f5]'
                  : 'border-[#3fd6f5]/20 text-[#6d81a0] hover:border-[#3fd6f5]/40'
              }`}
            >
              {w}D
            </button>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      <section className="space-y-3">
        <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
          COMPLETION HEATMAP
        </h3>
        {heatmapLoading ? (
          <Skeleton />
        ) : heatmapError ? (
          <ErrorMsg msg={(heatmapError as Error).message} />
        ) : (
          <Heatmap data={heatmap} days={window} />
        )}
      </section>

      {/* Stat Growth */}
      <section className="space-y-3">
        <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
          STAT GROWTH OVER TIME
        </h3>
        {statHistoryLoading ? (
          <Skeleton />
        ) : statHistoryError ? (
          <ErrorMsg msg={(statHistoryError as Error).message} />
        ) : (
          <div className="bg-[#04070d] border border-[#3fd6f5]/10 rounded-lg p-4">
            <StatChart data={statHistory} />
          </div>
        )}
      </section>

      {/* Completion Rate by Stat */}
      <section className="space-y-3">
        <h3 className="font-rajdhani font-bold text-[#e6f1f7] tracking-wider text-sm">
          COMPLETION RATE BY STAT
        </h3>
        {completionRatesLoading ? (
          <Skeleton />
        ) : completionRatesError ? (
          <ErrorMsg msg={(completionRatesError as Error).message} />
        ) : (
          <div className="bg-[#04070d] border border-[#3fd6f5]/10 rounded-lg p-4">
            <CompletionRateChart data={completionRates} />
          </div>
        )}
      </section>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-32 bg-[#0a0f1c] border border-[#3fd6f5]/10 rounded-lg animate-pulse" />
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div className="p-3 border border-[#ff4d5e]/40 bg-[#ff4d5e]/10 rounded text-sm text-[#ff4d5e] font-rajdhani">
      Error: {msg}
    </div>
  );
}
