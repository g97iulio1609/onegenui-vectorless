import type { LanguageModel } from 'ai';
import type { LayerLevel } from '../ports/detective.port.js';

/** Query classification patterns for layer routing */
const LAYER_PATTERNS: Array<{ layer: LayerLevel; patterns: RegExp[] }> = [
  {
    layer: 1,
    patterns: [
      /\b(leggi|read|show|mostra|clausol[ae]|sezione|articol[oi]|paragraf[oi])\b/i,
      /\b(what does|cosa dice|che dice|cita|quote)\b/i,
      /\b(specific|specifico|esatto|exact|clause|section)\b/i,
    ],
  },
  {
    layer: 2,
    patterns: [
      /\b(compar[ae]|confront[ao]|cross[\s-]?referenc|impact|relat|connessione)\b/i,
      /\b(how does|come|impatt[ao]|influenz[ao]|collegat[io])\b/i,
    ],
  },
  {
    layer: 3,
    patterns: [
      /\b(pattern|trend|rischio|risk|churn|anomal[iy]|opportunit|cluster)\b/i,
      /\b(quali clienti|which customer|a rischio|at risk|emergent)\b/i,
    ],
  },
  {
    layer: 4,
    patterns: [
      /\b(stato|state|health|salute|strategi[ca]|panoramic[ao]|executive|overview)\b/i,
      /\b(priorit[àa]|big picture|overall|complessiv[ao]|aziend[ae])\b/i,
    ],
  },
];

/** Classify a query to the appropriate investigation layer */
export function classifyQueryLayer(query: string, docCount: number): LayerLevel {
  // Pattern-based classification
  for (const { layer, patterns } of LAYER_PATTERNS) {
    if (patterns.some((p) => p.test(query))) return layer;
  }

  // Fallback: scale-based
  if (docCount < 5) return 1;
  if (docCount < 50) return 2;
  if (docCount < 500) return 3;
  return 4;
}

/** LLM-based query classification for ambiguous queries */
export async function classifyQueryLayerWithLLM(
  query: string,
  docCount: number,
  model: LanguageModel,
): Promise<LayerLevel> {
  // Try pattern first
  const patternResult = classifyQueryLayer(query, docCount);

  // Use LLM only for uncertain cases (no pattern matched and moderate scale)
  if (docCount < 5 || docCount > 500) return patternResult;

  const { generateText, Output } = await import('ai');
  const { z } = await import('zod');

  const schema = z.object({
    layer: z.number().int().min(1).max(4).describe('1=specific text, 2=cross-doc analysis, 3=pattern/trend, 4=executive overview'),
    reason: z.string().describe('Brief reason for classification'),
  });

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema }),
      prompt: `Classify this query into an investigation layer (1-4).
Layer 1 (Reader): Specific text lookup, exact sections, citations
Layer 2 (Analyst): Cross-document analysis, comparisons, impact analysis
Layer 3 (Strategist): Pattern recognition, trends, anomalies, risk assessment
Layer 4 (Meta-Strategist): Executive overview, strategic priorities, big picture

Document count: ${docCount}
Query: "${query}"`,
    });

    if (output?.layer) {
      const clamped = Math.min(4, Math.max(1, Math.round(output.layer))) as LayerLevel;
      return clamped;
    }
  } catch {
    // Fallback to pattern result
  }
  return patternResult;
}
