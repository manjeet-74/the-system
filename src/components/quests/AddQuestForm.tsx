import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { getTodayDateString } from '../../hooks/useDailyQuests';

interface AddQuestFormProps {
  onSuccess?: () => void;
}

export function AddQuestForm({ onSuccess }: AddQuestFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const todayStr = getTodayDateString();

  const [title, setTitle] = useState('');
  const [stat, setStat] = useState<'STR' | 'INT' | 'VIT' | 'SENSE' | 'AGI'>('STR');
  const [xp, setXp] = useState<number>(10);
  const [verificationMethod, setVerificationMethod] = useState<'manual' | 'github' | 'ai_judge'>('manual');
  const [rubric, setRubric] = useState('');
  const [error, setError] = useState('');

  const addQuestMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // 1. Insert new custom template into quest_templates
      const { data: newTemplate, error: insertError } = await supabase
        .from('quest_templates')
        .insert({
          user_id: user.id,
          title: title.trim(),
          stat,
          xp: Number(xp),
          is_default: false,
          verification_method: verificationMethod,
          rubric: verificationMethod === 'ai_judge' ? rubric.trim() : null,
          archived: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Check if today's daily_logs exist for this user; if so, create today's log row for this new quest immediately
      const { data: existingLogs } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('log_date', todayStr);

      if (existingLogs && existingLogs.length > 0 && newTemplate) {
        await supabase.from('daily_logs').insert({
          user_id: user.id,
          log_date: todayStr,
          quest_id: newTemplate.id,
          done: false,
        });
      }

      return newTemplate;
    },
    onSuccess: () => {
      setTitle('');
      setXp(10);
      setRubric('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['quest_templates', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['daily_logs', user?.id, todayStr] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create quest');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    addQuestMutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#04070d] border border-[#3fd6f5]/30 p-4 rounded-lg space-y-4"
    >
      <div className="flex justify-between items-center">
        <h4 className="font-rajdhani text-lg font-bold text-[#3fd6f5]">
          CREATE CUSTOM QUEST
        </h4>
      </div>

      {error && (
        <div className="text-xs text-[#ff4d5e] bg-[#ff4d5e]/10 border border-[#ff4d5e]/30 p-2 rounded">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-rajdhani text-[#6d81a0] mb-1 font-semibold">
          QUEST TITLE
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Read 20 pages of documentation"
          className="w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-rajdhani text-[#6d81a0] mb-1 font-semibold">
            TARGET STAT
          </label>
          <select
            value={stat}
            onChange={(e) => setStat(e.target.value as any)}
            className="w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
          >
            <option value="STR">STR (Strength)</option>
            <option value="AGI">AGI (Agility)</option>
            <option value="INT">INT (Intelligence)</option>
            <option value="VIT">VIT (Vitality)</option>
            <option value="SENSE">SENSE (Perception)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-rajdhani text-[#6d81a0] mb-1 font-semibold">
            XP REWARD
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={xp}
            onChange={(e) => setXp(Number(e.target.value))}
            className="w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-rajdhani text-[#6d81a0] mb-1 font-semibold">
          VERIFICATION METHOD
        </label>
        <select
          value={verificationMethod}
          onChange={(e) => setVerificationMethod(e.target.value as any)}
          className="w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani"
        >
          <option value="manual">Manual Checkbox</option>
          <option value="github">GitHub Commit Push</option>
          <option value="ai_judge">AI Evaluation (Claude)</option>
        </select>
      </div>

      {verificationMethod === 'ai_judge' && (
        <div>
          <label className="block text-xs font-rajdhani text-[#6d81a0] mb-1 font-semibold">
            GRADING RUBRIC
          </label>
          <textarea
            value={rubric}
            onChange={(e) => setRubric(e.target.value)}
            placeholder="Specify expectations for AI grading..."
            className="w-full bg-[#0a0f1c] border border-[#3fd6f5]/30 text-[#e6f1f7] px-3 py-2 rounded text-sm focus:outline-none focus:border-[#3fd6f5] font-rajdhani h-20"
            required
          />
        </div>
      )}

      <button
        type="submit"
        disabled={addQuestMutation.isPending}
        className="w-full bg-[#3fd6f5] text-[#04070d] font-rajdhani font-bold py-2 rounded hover:bg-[#3fd6f5]/90 transition-colors cursor-pointer disabled:opacity-50"
      >
        {addQuestMutation.isPending ? 'CREATING QUEST...' : 'ADD QUEST TO SYSTEM'}
      </button>
    </form>
  );
}
