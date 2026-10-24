import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let submissionId: string;
  try {
    const body = await req.json();
    submissionId = body.submission_id;
    if (!submissionId) throw new Error('submission_id required');
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }

  // Load the submission + quest
  const { data: submission, error: subError } = await supabase
    .from('ai_submissions')
    .select('*, quest_templates(title, rubric, stat, xp)')
    .eq('id', submissionId)
    .single();

  if (subError || !submission) {
    return new Response(JSON.stringify({ error: 'Submission not found' }), { status: 404 });
  }

  const quest = (submission as any).quest_templates;

  try {
    const systemPrompt = `You are a strict but fair code/skill evaluator for a gamification productivity app called THE SYSTEM.
Grade the following submission against the rubric provided.
Respond with ONLY a JSON object — no markdown fences, no prose outside the JSON:
{"pass": boolean, "score": 0-100, "feedback": "1-3 sentences", "xp": integer}
The xp field should be between 0 and ${quest.xp} (the maximum for this quest).`;

    const userContent = `Quest: ${quest.title}\n\nRubric: ${quest.rubric ?? 'No specific rubric. Use general code quality and completeness standards.'}\n\nSubmission:\n${submission.submission_text}`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicRes.ok) {
      throw new Error(`Anthropic API error: ${anthropicRes.status}`);
    }

    const anthropicData = await anthropicRes.json();
    const rawText: string = anthropicData.content?.[0]?.text ?? '';

    // Strip markdown fences if present
    const jsonText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const gradeResult = JSON.parse(jsonText);

    const pass = Boolean(gradeResult.pass);
    const score = Math.min(100, Math.max(0, Number(gradeResult.score) || 0));
    const feedback = String(gradeResult.feedback ?? 'No feedback provided.');
    const xpAwarded = pass ? Math.min(quest.xp, Math.max(0, Number(gradeResult.xp) || quest.xp)) : 0;

    // Update the submission row
    await supabase
      .from('ai_submissions')
      .update({
        status: 'graded',
        pass,
        score,
        feedback,
        xp_awarded: xpAwarded,
        stat_allocated: quest.stat,
        model: 'claude-haiku-4-5',
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    // If passed: mark the daily log complete and award XP
    if (pass) {
      const { data: log } = await supabase
        .from('daily_logs')
        .select('id, done')
        .eq('id', submission.daily_log_id)
        .single();

      if (log && !log.done) {
        await supabase
          .from('daily_logs')
          .update({
            done: true,
            completed_at: new Date().toISOString(),
            xp_awarded: xpAwarded,
            verified_via: 'ai_judge',
          })
          .eq('id', submission.daily_log_id);

        const statCol = quest.stat === 'INT' ? 'int_' : quest.stat.toLowerCase();
        const { data: stats } = await supabase
          .from('player_stats')
          .select(statCol)
          .eq('user_id', submission.user_id)
          .single();

        if (stats) {
          await supabase
            .from('player_stats')
            .update({
              [statCol]: (stats as any)[statCol] + xpAwarded,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', submission.user_id);
        }
      }
    }

    return new Response(
      JSON.stringify({ pass, score, feedback, xp_awarded: xpAwarded }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    // Never leave submission stuck on pending
    await supabase
      .from('ai_submissions')
      .update({
        status: 'error',
        feedback: 'Grading failed due to an internal error. Please try again.',
        graded_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
