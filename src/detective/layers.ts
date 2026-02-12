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

// ─── Layer 1: Reader ─────────────────────────────────────
/** Direct text reading for specific queries */
export async function executeLayer1(
  query: string,
  deps: LayerDeps,
): Promise<LayerResult> {
  const { search, multiDoc, budget, model } = deps;
  const hypotheses: Hypothesis[] = [];
  const sources: InvestigationSource[] = [];

  // BM25 search for relevant sections
  budget.spend(1); // bm25_search
  const results = search.search(query, { limit: 5 });

  // Read top sections
  for (const result of results.slice(0, 3)) {
    if (!budget.canAfford(3)) break;
    budget.spend(3); // section_read
    const kb = multiDoc.getKnowledgeBase(result.documentId);
    if (!kb) continue;
    const node = findNodeInTree(kb.tree, result.nodeId);
    if (node) {
      sources.push({
        documentId: result.documentId,
        nodeId: result.nodeId,
        excerpt: (node.rawText ?? node.summary ?? '').slice(0, 500),
        relevance: result.score,
      });
    }
  }

  // Generate answer from sources
  const { generateText } = await import('ai');
  const answer = await generateAnswer(model, query, sources);

  return {
    answer: answer.text,
    thinking: `Layer 1 Reader: Found ${results.length} matches, read ${sources.length} sections.`,
    sources,
    hypotheses,
  };
}

// ─── Layer 2: Analyst ────────────────────────────────────
/** Cross-document analysis with graph-guided deep-reads */
export async function executeLayer2(
  query: string,
  deps: LayerDeps,
): Promise<LayerResult> {
  const { search, graph, multiDoc, budget, model } = deps;
  const sources: InvestigationSource[] = [];

  // BM25 search
  budget.spend(1);
  const results = search.search(query, { limit: 10 });

  // Graph expansion on top entities
  budget.spend(2);
  const topNodeIds = results.slice(0, 3).map((r) => r.nodeId);
  const relatedNodes = new Set<string>();
  for (const nid of topNodeIds) {
    const neighbors = graph.getNeighbors(nid, { maxDepth: 1 });
    for (const n of neighbors) relatedNodes.add(n.id);
  }

  // Selective deep-read guided by graph
  const readTargets = [...new Set([...topNodeIds, ...relatedNodes])].slice(0, 5);
  for (const nodeId of readTargets) {
    if (!budget.canAfford(3)) break;
    budget.spend(3);
    for (const [, kb] of iterKBs(multiDoc)) {
      const node = findNodeInTree(kb.tree, nodeId);
      if (node) {
        sources.push({
          documentId: kb.id,
          nodeId,
          excerpt: (node.rawText ?? node.summary ?? '').slice(0, 500),
          relevance: 0.8,
        });
        break;
      }
    }
  }

  const { generateText } = await import('ai');
  const answer = await generateAnswer(model, query, sources);

  return {
    answer: answer.text,
    thinking: `Layer 2 Analyst: BM25 ${results.length} results, graph expanded ${relatedNodes.size} related nodes, read ${sources.length} sections.`,
    sources,
    hypotheses: [],
  };
}

// ─── Layer 3: Strategist ─────────────────────────────────
/** Pattern reasoning on communities and cross-source intersections */
export async function executeLayer3(
  query: string,
  deps: LayerDeps,
): Promise<LayerResult> {
  const { search, graph, budget, model } = deps;
  const sources: InvestigationSource[] = [];

  // Detect communities
  const communities = graph.detectCommunities();

  // BM25 broad search
  budget.spend(1);
  const results = search.search(query, { limit: 20 });

  // Map results to communities
  const communityHits = new Map<string, number>();
  for (const r of results) {
    const community = graph.getCommunity(r.nodeId);
    if (community) {
      communityHits.set(community.id, (communityHits.get(community.id) ?? 0) + 1);
    }
  }

  // Extract top community patterns
  const topCommunities = [...communityHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => communities.find((c) => c.id === id))
    .filter(Boolean);

  // Build community context for LLM
  const communityContext = topCommunities
    .map((c) => `Community ${c!.id}: ${c!.nodeIds.length} nodes, ${c!.summary ?? 'no summary'}`)
    .join('\n');

  const { generateText } = await import('ai');
  const answer = await generateAnswer(model, query, sources, communityContext);

  return {
    answer: answer.text,
    thinking: `Layer 3 Strategist: ${communities.length} communities, ${results.length} BM25 hits, ${topCommunities.length} relevant communities.`,
    sources,
    hypotheses: [],
  };
}

// ─── Layer 4: Meta-Strategist ────────────────────────────
/** Executive meta-reasoning on the entire knowledge graph */
export async function executeLayer4(
  query: string,
  deps: LayerDeps,
): Promise<LayerResult> {
  const { graph, multiDoc, budget, model } = deps;

  // Get graph overview
  const stats = graph.getStats();
  const communities = graph.detectCommunities();
  const docs = multiDoc.listDocuments();

  // Build meta-view
  const metaView = [
    `Total: ${stats.nodeCount} entities, ${stats.edgeCount} relations, ${communities.length} communities`,
    `Documents: ${docs.map((d) => d.filename).join(', ')}`,
    `Communities: ${communities.map((c) => `${c.id}(${c.nodeIds.length} nodes)`).join(', ')}`,
  ].join('\n');

  const { generateText } = await import('ai');
  const answer = await generateAnswer(model, query, [], metaView);

  return {
    answer: answer.text,
    thinking: `Layer 4 Meta-Strategist: ${stats.nodeCount} entities, ${stats.edgeCount} relations, ${communities.length} communities, ${docs.length} documents.`,
    sources: [],
    hypotheses: [],
  };
}

// ─── Helpers ─────────────────────────────────────────────

async function generateAnswer(
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

function findNodeInTree(tree: { id: string; children: unknown[] }, nodeId: string): Record<string, unknown> | null {
  if (tree.id === nodeId) return tree as Record<string, unknown>;
  const children = (tree as Record<string, unknown>).children as Array<Record<string, unknown>> | undefined;
  if (!children) return null;
  for (const child of children) {
    const found = findNodeInTree(child as { id: string; children: unknown[] }, nodeId);
    if (found) return found;
  }
  return null;
}

function* iterKBs(multiDoc: MultiDocumentKBPort): Generator<[string, { id: string; tree: Record<string, unknown> }]> {
  for (const doc of multiDoc.listDocuments()) {
    const kb = multiDoc.getKnowledgeBase(doc.id);
    if (kb) yield [doc.id, kb as unknown as { id: string; tree: Record<string, unknown> }];
  }
}
