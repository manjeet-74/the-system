import { useState } from 'react';
import type { DailyLogWithQuest } from '../../hooks/useDailyQuests';
import { AiSubmitModal } from './AiSubmitModal';

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
  const isGitHub = quest.verification_method === 'github';
  const isAiJudge = quest.verification_method === 'ai_judge';
  const isManual = !isGitHub && !isAiJudge;
  const canUndo = isDone && isManual; // manual quests can be un-ticked if clicked by mistake
  const statStyle = STAT_COLORS[quest.stat] || 'text-[#3fd6f5] border-[#3fd6f5]/30 bg-[#3fd6f5]/10';
  const [showAiModal, setShowAiModal] = useState(false);

  const handleRowClick = () => {
    if (disabled) return;
    if (isAiJudge) {
      if (isDone) return; // AI-graded results aren't manually reversible
      setShowAiModal(true);
      return;
    }
    if (isGitHub) return; // GitHub quests are auto-verified only
    // Manual quests toggle both directions: complete, or undo an accidental tick
    onToggle(log.id, isDone);
  };

  return (
    <>
      <div
        onClick={handleRowClick}
        title={
          canUndo
            ? 'Click to undo — mark this quest incomplete'
            : isDone
            ? 'Quest completed for today'
            : isGitHub
            ? 'Auto-verified on GitHub commit push'
            : undefined
        }
        className={`group flex items-center justify-between p-4 bg-[#04070d] border rounded transition-all duration-200 ${
          isGitHub && !isDone
            ? 'cursor-not-allowed border-[#3fd6f5]/20 opacity-70'
            : canUndo
            ? 'border-[#3fd6f5]/15 opacity-60 hover:opacity-100 hover:border-[#3fd6f5]/40 cursor-pointer'
            : isDone
            ? 'border-[#3fd6f5]/10 opacity-50 bg-[#04070d]/60 cursor-default'
            : 'border-[#3fd6f5]/30 hover:border-[#3fd6f5]/60 hover:shadow-[0_0_12px_rgba(63,214,245,0.15)] cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-4">
          {/* Checkbox — hide for github quests (auto-verified), show spinner for ai_judge */}
          {!isGitHub && (
            <div
              className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${
                isDone
                  ? 'bg-[#3fd6f5] border-[#3fd6f5] text-[#04070d]'
                  : isAiJudge
                  ? 'border-[#3fd6f5]/50 bg-transparent'
                  : 'border-[#3fd6f5]/50 group-hover:border-[#3fd6f5] bg-transparent'
              }`}
            >
              {isDone && (
                <svg className="w-4 h-4 stroke-current stroke-[3]" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {isAiJudge && !isDone && (
                <svg className="w-3 h-3 text-[#3fd6f5]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
            </div>
          )}

          {isGitHub && (
            <div className="w-6 h-6 rounded border border-[#3fd6f5]/30 flex items-center justify-center">
              {isDone ? (
                <svg className="w-4 h-4 text-[#3fd6f5] stroke-current stroke-[3]" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-[#6d81a0]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              )}
            </div>
          )}

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
            {isGitHub && !isDone && (
              <span className="text-[10px] font-rajdhani text-[#6d81a0] tracking-wider">
                auto-verified on commit push
              </span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2">
          {isAiJudge && !isDone && (
            <span className="text-[10px] font-rajdhani font-bold text-[#3fd6f5]/70 border border-[#3fd6f5]/30 px-2 py-0.5 rounded uppercase tracking-wider">
              SUBMIT
            </span>
          )}
          {isGitHub && !isDone && (
            <span className="text-[10px] font-rajdhani font-semibold text-[#6d81a0] border border-[#6d81a0]/30 px-2 py-0.5 rounded uppercase">
              GITHUB
            </span>
          )}
          <span
            className={`font-rajdhani text-xs font-bold border px-2 py-1 rounded tracking-wider ${statStyle}`}
          >
            +{quest.xp} {quest.stat}
          </span>

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

      {showAiModal && (
        <AiSubmitModal
          log={log}
          onClose={() => setShowAiModal(false)}
          onSuccess={() => {
            setShowAiModal(false);
            onToggle(log.id, false); // trigger re-fetch
          }}
        />
      )}
    </>
  );
}
