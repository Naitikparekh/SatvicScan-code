import { getApiKey } from './storage';
import type { ClaudeDietResult } from '../types';

const CLAUDE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1200;

const SYSTEM_PROMPT = `You are a Satvik Swaminarayan diet compliance checker.

CORE PRINCIPLE: ANY trace of a prohibited ingredient = REJECT. Unknown source = REJECT. Default is NOT_SAFE.

PROHIBITED — zero tolerance:
All meats, poultry, fish, seafood, eggs in any form, lard, tallow, suet, animal broth, gelatin, animal rennet, isinglass, L-Cysteine/E920, Carmine/E120, Shellac/E904, Lysozyme/E1105, collagen, E631, E635, bone char.
Alliums in any form: onion, garlic, spring onion, leek, chives, shallots, scallions, wild garlic, ramps, asafoetida/hing.
Alcohol: beer, wine, spirits, kombucha, vanilla extract (alcohol-based), malt vinegar, wine vinegar.

AMBIGUOUS — reject if source unknown:
Glycerin (need "vegetable"), enzymes (need "microbial"), mono & diglycerides (need "plant"), natural flavors (REJECT), unspecified spices (REJECT), unspecified seasoning (REJECT), lecithin (need "soy"), omega-3 (need "algae"), vitamin D3 (need "plant-based").

CROSS-CONTAMINATION: "may contain" or "shared equipment" with any prohibited = CAUTION.

Respond ONLY in valid JSON:
{"verdict":"SAFE|NOT_SAFE|CAUTION","productName":"string","summary":"one plain English sentence","flags":[{"type":"bad|caution|good","ingredient":"name","reason":"plain English"}],"ambiguous":["items needing verification"],"analysis":"short paragraph","confidence":"HIGH|MEDIUM|LOW"}`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractFirstJsonObject(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return text.trim();
  return text.slice(start, end + 1).trim();
}

function normalizeResult(raw: any): ClaudeDietResult {
  const verdict = raw?.verdict;
  if (verdict !== 'SAFE' && verdict !== 'NOT_SAFE' && verdict !== 'CAUTION') {
    throw new Error('Claude response missing a valid verdict field');
  }

  const productName =
    typeof raw?.productName === 'string' && raw.productName.trim()
      ? raw.productName.trim()
      : 'Unknown product';

  const summary =
    typeof raw?.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim()
      : 'No summary provided.';

  const analysis =
    typeof raw?.analysis === 'string' ? raw.analysis.trim() : '';

  const confidence: ClaudeDietResult['confidence'] =
    raw?.confidence === 'HIGH' || raw?.confidence === 'MEDIUM' || raw?.confidence === 'LOW'
      ? raw.confidence
      : 'MEDIUM';

  const flags: ClaudeDietResult['flags'] = Array.isArray(raw?.flags)
    ? raw.flags
        .map((f: any) => ({
          type: f?.type,
          ingredient: typeof f?.ingredient === 'string' ? f.ingredient.trim() : '',
          reason: typeof f?.reason === 'string' ? f.reason.trim() : '',
        }))
        .filter(
          (f: any) =>
            (f.type === 'bad' || f.type === 'caution' || f.type === 'good') &&
            f.ingredient.length > 0 &&
            f.reason.length > 0
        )
    : [];

  const ambiguous: string[] = Array.isArray(raw?.ambiguous)
    ? raw.ambiguous.filter((a: any) => typeof a === 'string' && a.trim().length > 0)
    : [];

  return { verdict, productName, summary, flags, ambiguous, analysis, confidence };
}

// ─── Core API call ────────────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  userContent: Array<{ type: string; [key: string]: any }>
): Promise<ClaudeDietResult> {
  const response = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  });

  const data = (await response.json().catch(() => null)) as any;

  if (!response.ok) {
    const errorMsg =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : `Claude API error (${response.status})`;
    throw new Error(errorMsg);
  }

  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') {
    throw new Error('Claude response missing text content');
  }

  const jsonText = extractFirstJsonObject(text);
  const parsed = JSON.parse(jsonText);
  return normalizeResult(parsed);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze an ingredients label photo (base64 JPEG).
 * Loads API key from SecureStore automatically.
 */
export async function analyzeIngredientsImage(args: {
  imageBase64: string;
  productNameHint?: string;
}): Promise<ClaudeDietResult> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const textParts: string[] = [
    'Extract and evaluate the ingredients label visible in this image against Swaminarayan diet rules.',
    'If the image is unreadable or incomplete, return NOT_SAFE with a clear reason in flags and summary.',
  ];
  if (args.productNameHint) {
    textParts.push(`Product name hint: ${args.productNameHint}`);
  }

  return callClaude(apiKey, [
    { type: 'text', text: textParts.join('\n') },
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: args.imageBase64,
      },
    },
  ]);
}

/**
 * Analyze a plain-text ingredients list.
 * Loads API key from SecureStore automatically.
 */
export async function analyzeIngredientsText(args: {
  ingredientsText: string;
  productNameHint?: string;
}): Promise<ClaudeDietResult> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const lines: string[] = [
    'Check this product against Swaminarayan diet rules.',
  ];
  if (args.productNameHint) {
    lines.push(`Product name: ${args.productNameHint}`);
  }
  lines.push('Ingredients:', args.ingredientsText);

  return callClaude(apiKey, [{ type: 'text', text: lines.join('\n') }]);
}

/**
 * Analyze using a provided API key (used from within screens that already have it).
 */
export async function analyzeWithKey(args: {
  apiKey: string;
  ingredientsText: string;
  productNameHint?: string;
}): Promise<ClaudeDietResult> {
  const lines: string[] = [
    'Check this product against Swaminarayan diet rules.',
  ];
  if (args.productNameHint) {
    lines.push(`Product name: ${args.productNameHint}`);
  }
  lines.push('Ingredients:', args.ingredientsText);
  return callClaude(args.apiKey, [{ type: 'text', text: lines.join('\n') }]);
}
