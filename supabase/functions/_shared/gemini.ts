// Shared Gemini caller for the free tier. Individual Gemini models are intermittently
// overloaded (503), unavailable (404) or quota-limited (429) — and a hung request would hold
// a function open until the platform kills it — so every call has a hard timeout and falls
// back through a chain of models instead of depending on a single one.
//
// Override the chain with the GEMINI_MODELS secret (comma-separated) if Google renames models.
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-2.5-flash'];

export const geminiAvailable = !!GEMINI_API_KEY;

export interface GeminiRequest {
  system?: string;
  user: string;
  maxOutputTokens: number;
  temperature?: number;
  json?: boolean;
  /** Per-attempt timeout. Total worst case is timeoutMs x number of models tried. */
  timeoutMs?: number;
  maxModels?: number;
}

export interface GeminiResult {
  text: string;
  model: string;
}

export async function geminiGenerate(req: GeminiRequest): Promise<GeminiResult> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set');

  const chain = (Deno.env.get('GEMINI_MODELS')?.split(',').map((m) => m.trim()).filter(Boolean) ?? DEFAULT_MODELS)
    .slice(0, req.maxModels ?? 3);
  const failures: string[] = [];

  for (const model of chain) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
          signal: AbortSignal.timeout(req.timeoutMs ?? 10000),
          body: JSON.stringify({
            ...(req.system ? { systemInstruction: { parts: [{ text: req.system }] } } : {}),
            contents: [{ role: 'user', parts: [{ text: req.user }] }],
            generationConfig: {
              maxOutputTokens: req.maxOutputTokens,
              ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
              ...(req.json ? { responseMimeType: 'application/json' } : {}),
              // Thinking is on by default for Gemini 3.x and its tokens consume the output
              // budget, truncating the answer (finishReason MAX_TOKENS). Our prompts need no reasoning.
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
      );

      if (!res.ok) {
        failures.push(`${model}: HTTP ${res.status}`);
        continue; // overloaded / not available / quota: try the next model
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const text: string = candidate?.content?.parts?.[0]?.text ?? '';
      if (!text.trim() || candidate?.finishReason === 'MAX_TOKENS') {
        failures.push(`${model}: empty or truncated (${candidate?.finishReason ?? 'no candidate'})`);
        continue;
      }
      return { text, model };
    } catch (err: any) {
      failures.push(`${model}: ${err?.name === 'TimeoutError' ? 'timeout' : err?.message ?? 'error'}`);
    }
  }

  throw new Error(`Gemini unavailable (${failures.join('; ')})`);
}
