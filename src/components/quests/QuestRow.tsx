import type { DailyLogWithQuest } from '../../hooks/useDailyQuests';

interface QuestRowProps {
  log: DailyLogWithQuest;
  onToggle: (logId: string, currentDone: boolean) => void;
  onArchive?: (questId: string) => void;
  disabled?: boolean;
}

const STAT_COLORS: Record<string, string> = {
  STR: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  AGI: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  INT: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  VIT: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  SENSE: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
};

export function QuestRow({ log, onToggle, onArchive, disabled }: QuestRowProps) {
  const quest = log.quest_templates;
  const isDone = log.done;
  const isDefault = quest.is_default;
  const statStyle = STAT_COLORS[quest.stat] || 'text-[#3fd6f5] border-[#3fd6f5]/30 bg-[#3fd6f5]/10';

  return (
    <div
      onClick={() => !disabled && onToggle(log.id, isDone)}
      className={`group flex items-center justify-between p-4 bg-[#04070d] border rounded transition-all duration-200 cursor-pointer ${
        isDone
          ? 'border-[#3fd6f5]/10 opacity-50 bg-[#04070d]/60'
          : 'border-[#3fd6f5]/30 hover:border-[#3fd6f5]/60 hover:shadow-[0_0_12px_rgba(63,214,245,0.15)]'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <div
          className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
            isDone
              ? 'bg-[#3fd6f5] border-[#3fd6f5] text-[#04070d]'
              : 'border-[#3fd6f5]/50 group-hover:border-[#3fd6f5] bg-transparent'
          }`}
        >
          {isDone && (
            <svg className="w-4 h-4 stroke-current stroke-[3]" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Title */}
        <div>
          <h4
            className={`font-rajdhani text-lg font-semibold tracking-wide transition-all ${
              isDone ? 'line-through text-[#6d81a0]' : 'text-[#e6f1f7]'
            }`}
          >
            {quest.title}
          </h4>
          {log.is_penalty && (
            <span className="text-[10px] font-rajdhani font-bold text-[#ff4d5e] tracking-wider uppercase">
              [REDEMPTION TRIAL]
            </span>
          )}
        </div>
      </div>

      {/* Meta (Stat + XP + Actions) */}
      <div className="flex items-center gap-2">
        {quest.verification_method !== 'manual' && (
          <span className="text-[10px] font-rajdhani font-semibold text-[#6d81a0] border border-[#6d81a0]/30 px-2 py-0.5 rounded uppercase">
            {quest.verification_method}
          </span>
        )}
        <span
          className={`font-rajdhani text-xs font-bold border px-2 py-1 rounded tracking-wider ${statStyle}`}
        >
          +{quest.xp} {quest.stat}
        </span>

        {/* Archive Action for Non-Default Quests */}
        {!isDefault && onArchive && (
          <button
            type="button"
            title="Archive Quest"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(quest.id);
            }}
            className="p-1 text-[#6d81a0] hover:text-[#ff4d5e] hover:bg-[#ff4d5e]/10 rounded transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
