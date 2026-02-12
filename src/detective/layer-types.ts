import type { LanguageModel } from 'ai';
import type { MultiDocumentKBPort } from '../ports/multi-doc.port.js';
import type { GraphStorePort } from '../ports/graph-store.port.js';
import type { FullTextSearchPort } from '../ports/search.port.js';
import type { InvestigationSource, Hypothesis } from '../ports/detective.port.js';
import { BudgetTracker } from './budget-tracker.js';

/** Shared dependencies for all layers */
export interface LayerDeps {
  model: LanguageModel;
  multiDoc: MultiDocumentKBPort;
  graph: GraphStorePort;
  search: FullTextSearchPort;
  budget: BudgetTracker;
}

/** Layer execution result */
export interface LayerResult {
  answer: string;
  thinking: string;
  sources: InvestigationSource[];
  hypotheses: Hypothesis[];
}

/** Generate answer from sources using LLM */
export async function generateAnswer(
  model: LanguageModel,
  query: string,
  sources: InvestigationSource[],
  extraContext?: string,
): Promise<{ text: string }> {
  const { generateText } = await import('ai');

  const sourceText = sources.length > 0
    ? sources.map((s, i) => `[${i + 1}] ${s.excerpt}`).join('\n\n')
    : 'No direct sources available.';

  return generateText({
    model,
    prompt: `You are an AI Detective analyzing documents. Answer the query using the provided evidence.

Query: ${query}

Evidence:
${sourceText}
${extraContext ? `\nContext:\n${extraContext}` : ''}

Provide a clear, well-structured answer with citations [1], [2] where applicable.`,
  });
}

/** Recursively find a node in a tree by ID */
export function findNodeInTree(
  tree: Record<string, unknown>,
  nodeId: string,
): Record<string, unknown> | null {
  if ((tree as { id?: string }).id === nodeId) return tree;
  const children = tree.children as Array<Record<string, unknown>> | undefined;
  if (!children) return null;
  for (const child of children) {
    const found = findNodeInTree(child, nodeId);
    if (found) return found;
  }
  return null;
}

/** Iterate over all KBs in the multi-doc store */
export function* iterKBs(
  multiDoc: MultiDocumentKBPort,
): Generator<[string, { id: string; tree: Record<string, unknown> }]> {
  for (const doc of multiDoc.listDocuments()) {
    const kb = multiDoc.getKnowledgeBase(doc.id);
    if (kb) yield [doc.id, kb as unknown as { id: string; tree: Record<string, unknown> }];
  }
}
