import { useDailyQuests } from '../../hooks/useDailyQuests';
import { QuestRow } from './QuestRow';

export function QuestList() {
  const { dailyLogs, loading, error, toggleQuest, isToggling } = useDailyQuests();

  if (loading) {
    return (
      <div className="bg-[#0a0f1c] border border-[#3fd6f5]/20 p-6 rounded-lg space-y-3 animate-pulse">
        <div className="h-6 w-48 bg-[#04070d] rounded" />
        <div className="h-14 bg-[#04070d] rounded" />
        <div className="h-14 bg-[#04070d] rounded" />
        <div className="h-14 bg-[#04070d] rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0a0f1c] border border-[#ff4d5e]/30 p-6 rounded-lg text-center">
        <p className="font-rajdhani text-[#ff4d5e] font-semibold">
          FAILED TO LOAD DAILY QUESTS: {error.message}
        </p>
      </div>
    );
  }

  const completedCount = dailyLogs.filter((log) => log.done).length;
  const totalCount = dailyLogs.length;

  return (
    <div className="bg-[#0a0f1c] border border-[#3fd6f5]/30 p-6 rounded-lg shadow-[0_0_20px_rgba(63,214,245,0.1)] space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#3fd6f5]/20 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-rajdhani text-xl font-bold text-[#3fd6f5] tracking-wide">
            DAILY QUESTS
          </h3>
          <span className="text-xs font-rajdhani font-semibold text-[#6d81a0]">
            [{completedCount}/{totalCount} COMPLETED]
          </span>
        </div>

        {totalCount > 0 && completedCount === totalCount && (
          <span className="font-rajdhani text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded tracking-wider animate-pulse">
            ALL QUESTS CLEARED
          </span>
        )}
      </div>

      {/* Quest List */}
      {dailyLogs.length === 0 ? (
        <div className="text-center py-8 text-[#6d81a0] font-rajdhani">
          NO DAILY QUESTS AVAILABLE FOR TODAY
        </div>
      ) : (
        <div className="space-y-3">
          {dailyLogs.map((log) => (
            <QuestRow
              key={log.id}
              log={log}
              onToggle={toggleQuest}
              disabled={isToggling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
