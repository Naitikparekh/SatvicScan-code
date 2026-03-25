import { dietSystemPrompt } from '@/constants/dietPrompt';

export type ClaudeVerdict = 'SAFE' | 'NOT_SAFE' | 'CAUTION';
export type ClaudeFlag = { type: 'bad' | 'caution' | 'good'; ingredient: string; reason: string };
export type ClaudeDietResult = {
  verdict: ClaudeVerdict;
  productName: string;
  summary: string;
  flags: ClaudeFlag[];
  analysis: string;
};

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return text.trim();
  return text.slice(start, end + 1).trim();
}

function normalizeResult(raw: any): ClaudeDietResult {
  const verdict = raw?.verdict;
  const productName = typeof raw?.productName === 'string' ? raw.productName : '';
  const summary = typeof raw?.summary === 'string' ? raw.summary : '';
  const analysis = typeof raw?.analysis === 'string' ? raw.analysis : '';
  const flags = Array.isArray(raw?.flags) ? raw.flags : [];

  if (verdict !== 'SAFE' && verdict !== 'NOT_SAFE' && verdict !== 'CAUTION') {
    throw new Error('Claude response missing a valid verdict');
  }

  return {
    verdict,
    productName: productName || 'Unknown product',
    summary: summary || 'No summary provided.',
    analysis: analysis || '',
    flags: flags
      .map((f: any) => ({
        type: f?.type,
        ingredient: typeof f?.ingredient === 'string' ? f.ingredient : '',
        reason: typeof f?.reason === 'string' ? f.reason : '',
      }))
      .filter(
        (f: any) =>
          (f.type === 'bad' || f.type === 'caution' || f.type === 'good') &&
          f.ingredient.length > 0 &&
          f.reason.length > 0
      ),
  };
}

async function callClaude(apiKey: string, userContent: any[]): Promise<ClaudeDietResult> {
  const res = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 600,
      temperature: 0,
      system: dietSystemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const msg =
      (typeof data?.error?.message === 'string' && data.error.message) ||
      `Claude request failed (${res.status})`;
    throw new Error(msg);
  }

  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') throw new Error('Claude response missing text content');

  const jsonText = extractFirstJsonObject(text);
  const parsed = JSON.parse(jsonText);
  return normalizeResult(parsed);
}

export async function analyzeIngredientsText(args: {
  apiKey: string;
  ingredientsText: string;
  productNameHint?: string;
}): Promise<ClaudeDietResult> {
  const { apiKey, ingredientsText, productNameHint } = args;
  const prompt = [
    `Check this product against Swaminarayan diet rules.`,
    productNameHint ? `Product name: ${productNameHint}` : null,
    `Ingredients text:`,
    ingredientsText,
  ]
    .filter(Boolean)
    .join('\n');

  return callClaude(apiKey, [{ type: 'text', text: prompt }]);
}

export async function analyzeIngredientsImage(args: {
  apiKey: string;
  imageBase64: string;
  productNameHint?: string;
}): Promise<ClaudeDietResult> {
  const { apiKey, imageBase64, productNameHint } = args;
  const prompt = [
    `Extract and evaluate the ingredients label in the image against Swaminarayan diet rules.`,
    `If the image is unreadable or incomplete, return NOT_SAFE with a clear reason in flags and summary.`,
    productNameHint ? `Product name hint: ${productNameHint}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return callClaude(apiKey, [
    { type: 'text', text: prompt },
    {
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 },
    },
  ]);
}

