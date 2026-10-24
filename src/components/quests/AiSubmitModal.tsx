import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import type { DailyLogWithQuest } from '../../hooks/useDailyQuests';

interface AiSubmitModalProps {
  log: DailyLogWithQuest;
  onClose: () => void;
  onSuccess: () => void;
}

type SubmitState = 'idle' | 'submitting' | 'grading' | 'result' | 'error';

interface GradeResult {
  pass: boolean;
  score: number;
  feedback: string;
  xp_awarded: number;
}

export function AiSubmitModal({ log, onClose, onSuccess }: AiSubmitModalProps) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [result, setResult] = useState<GradeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const quest = log.quest_templates;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim()) return;

    setState('submitting');
    setErrorMsg('');

    try {
      // Insert pending submission
      const { data: submission, error: insertErr } = await supabase
        .from('ai_submissions')
        .insert({
          user_id: user.id,
          quest_id: quest.id,
          daily_log_id: log.id,
          submission_text: text.trim(),
          model: 'claude-haiku-4-5',
          status: 'pending',
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      setState('grading');

      // Invoke the ai-judge edge function
      const { error: invokeErr } = await supabase.functions.invoke('ai-judge', {
        body: { submission_id: submission.id },
      });

      if (invokeErr) throw invokeErr;

      // Poll for graded result (max 30s)
      let attempts = 0;
      const maxAttempts = 30;

      const poll = async (): Promise<void> => {
        const { data: updatedSub } = await supabase
          .from('ai_submissions')
          .select('status, pass, score, feedback, xp_awarded')
          .eq('id', submission.id)
          .single();

        if (!updatedSub || updatedSub.status === 'pending') {
          if (attempts++ < maxAttempts) {
            await new Promise((r) => setTimeout(r, 1000));
            return poll();
          }
          throw new Error('Grading timed out. Please try again.');
        }

        if (updatedSub.status === 'error') {
          throw new Error(updatedSub.feedback ?? 'Grading failed. Please try again.');
        }

        setResult({
          pass: updatedSub.pass ?? false,
          score: updatedSub.score ?? 0,
          feedback: updatedSub.feedback ?? '',
          xp_awarded: updatedSub.xp_awarded ?? 0,
        });
        setState('result');
      };

      await poll();
    } catch (err: any) {
      setState('error');
      setErrorMsg(err.message ?? 'Submission failed');
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0a0f1c] border border-[#3fd6f5]/30 rounded-lg max-w-lg w-full p-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-rajdhani font-bold text-[#3fd6f5] tracking-widest uppercase">
              AI JUDGE
            </p>
            <h3 className="font-rajdhani text-xl font-bold text-[#e6f1f7] mt-0.5">
              {quest.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6d81a0] hover:text-[#e6f1f7] transition-colors cursor-pointer text-xl"
          >
            ✕
          </button>
        </div>

        {quest.rubric && (
          <div className="bg-[#04070d] border border-[#3fd6f5]/20 p-3 rounded text-xs text-[#6d81a0] font-rajdhani">
            <span className="text-[#3fd6f5]/70 font-bold">RUBRIC: </span>
            {quest.rubric}
          </div>
        )}

        {/* States */}
        {state === 'idle' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-rajdhani text-[#6d81a0] mb-1 font-semibold">
                YOUR SUBMISSION
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your code, explanation, or proof of work here..."
                className="w-full h-36 bg-[#04070d] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-mono resize-none"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold py-2 rounded hover:bg-[#3fd6f5]/90 transition-colors cursor-pointer"
            >
              SUBMIT FOR GRADING
            </button>
          </form>
        )}

        {(state === 'submitting' || state === 'grading') && (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 border-2 border-[#3fd6f5]/30 border-t-[#3fd6f5] rounded-full animate-spin mx-auto" />
            <p className="font-rajdhani text-[#6d81a0] text-sm">
              {state === 'submitting' ? 'Uploading submission...' : 'AI Judge is evaluating...'}
            </p>
          </div>
        )}

        {state === 'result' && result && (
          <div className="space-y-4">
            <div
              className={`p-4 rounded border text-center ${
                result.pass
                  ? 'border-emerald-500/40 bg-emerald-500/10'
                  : 'border-[#ff4d5e]/40 bg-[#ff4d5e]/10'
              }`}
            >
              <div
                className={`font-rajdhani text-3xl font-extrabold tracking-widest ${
                  result.pass ? 'text-emerald-400' : 'text-[#ff4d5e]'
                }`}
              >
                {result.pass ? 'PASSED' : 'FAILED'}
              </div>
              <div className="text-sm text-[#6d81a0] font-rajdhani mt-1">
                Score: {result.score}/100
                {result.pass && ` · +${result.xp_awarded} ${quest.stat} XP`}
              </div>
            </div>

            <p className="text-sm text-[#e6f1f7] font-rajdhani">{result.feedback}</p>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-bold py-2 rounded transition-colors cursor-pointer"
            >
              {result.pass ? 'CLOSE' : 'TRY AGAIN TOMORROW'}
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <div className="p-3 border border-[#ff4d5e]/40 bg-[#ff4d5e]/10 rounded text-sm text-[#ff4d5e] font-rajdhani">
              {errorMsg}
            </div>
            <button
              onClick={() => setState('idle')}
              className="w-full border border-[#3fd6f5]/40 text-[#3fd6f5] hover:bg-[#3fd6f5]/10 font-rajdhani font-bold py-2 rounded transition-colors cursor-pointer"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
