import type { InvestigationSource } from '../ports/detective.port.js';
import type { LayerDeps, LayerResult } from './layer-types.js';
import { generateAnswer, findNodeInTree, iterKBs } from './layer-types.js';

// Re-export types
export type { LayerDeps, LayerResult } from './layer-types.js';

// ─── Layer 1: Reader ─────────────────────────────────────
export async function executeLayer1(query: string, deps: LayerDeps): Promise<LayerResult> {
  const { search, multiDoc, budget, model } = deps;
  const sources: InvestigationSource[] = [];

  budget.spend(1); // bm25_search
  const results = search.search(query, { limit: 5 });

  for (const result of results.slice(0, 3)) {
    if (!budget.canAfford(3)) break;
    budget.spend(3); // section_read
    const kb = multiDoc.getKnowledgeBase(result.documentId);
    if (!kb) continue;
    const node = findNodeInTree(kb.tree as unknown as Record<string, unknown>, result.nodeId);
    if (node) {
      const rawText = 'rawText' in node ? String(node.rawText) : '';
      const summary = 'summary' in node ? String(node.summary) : '';
      sources.push({
        documentId: result.documentId,
        nodeId: result.nodeId,
        excerpt: (rawText || summary).slice(0, 500),
        relevance: result.score,
      });
    }
  }

  const answer = await generateAnswer(model, query, sources);
  return {
    answer: answer.text,
    thinking: `Layer 1 Reader: Found ${results.length} matches, read ${sources.length} sections.`,
    sources,
    hypotheses: [],
  };
}

// ─── Layer 2: Analyst ────────────────────────────────────
export async function executeLayer2(query: string, deps: LayerDeps): Promise<LayerResult> {
  const { search, graph, multiDoc, budget, model } = deps;
  const sources: InvestigationSource[] = [];

  budget.spend(1);
  const results = search.search(query, { limit: 10 });

  budget.spend(2); // graph_query
  const topNodeIds = results.slice(0, 3).map((r) => r.nodeId);
  const relatedNodes = new Set<string>();
  for (const nid of topNodeIds) {
    for (const n of graph.getNeighbors(nid, { maxDepth: 1 })) relatedNodes.add(n.id);
  }

  const readTargets = [...new Set([...topNodeIds, ...relatedNodes])].slice(0, 5);
  for (const nodeId of readTargets) {
    if (!budget.canAfford(3)) break;
    budget.spend(3);
    for (const [, kb] of iterKBs(multiDoc)) {
      const node = findNodeInTree(kb.tree, nodeId);
      if (node) {
        const rawText = 'rawText' in node ? String(node.rawText) : '';
        const summary = 'summary' in node ? String(node.summary) : '';
        sources.push({
          documentId: kb.id, nodeId,
          excerpt: (rawText || summary).slice(0, 500),
          relevance: 0.8,
        });
        break;
      }
    }
  }

  const answer = await generateAnswer(model, query, sources);
  return {
    answer: answer.text,
    thinking: `Layer 2 Analyst: BM25 ${results.length} results, graph expanded ${relatedNodes.size} nodes, read ${sources.length} sections.`,
    sources,
    hypotheses: [],
  };
}

// ─── Layer 3: Strategist ─────────────────────────────────
export async function executeLayer3(query: string, deps: LayerDeps): Promise<LayerResult> {
  const { search, graph, budget, model } = deps;

  const communities = graph.detectCommunities();
  budget.spend(1);
  const results = search.search(query, { limit: 20 });

  const communityHits = new Map<string, number>();
  for (const r of results) {
    const c = graph.getCommunity(r.nodeId);
    if (c) communityHits.set(c.id, (communityHits.get(c.id) ?? 0) + 1);
  }

  const topCommunities = [...communityHits.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => communities.find((c) => c.id === id))
    .filter(Boolean);

  const ctx = topCommunities
    .map((c) => `Community ${c!.id}: ${c!.nodeIds.length} nodes, ${c!.summary ?? 'no summary'}`)
    .join('\n');

  const answer = await generateAnswer(model, query, [], ctx);
  return {
    answer: answer.text,
    thinking: `Layer 3 Strategist: ${communities.length} communities, ${results.length} BM25 hits, ${topCommunities.length} relevant.`,
    sources: [],
    hypotheses: [],
  };
}

// ─── Layer 4: Meta-Strategist ────────────────────────────
export async function executeLayer4(query: string, deps: LayerDeps): Promise<LayerResult> {
  const { graph, multiDoc, model } = deps;

  const stats = graph.getStats();
  const communities = graph.detectCommunities();
  const docs = multiDoc.listDocuments();

  const metaView = [
    `Total: ${stats.nodeCount} entities, ${stats.edgeCount} relations, ${communities.length} communities`,
    `Documents: ${docs.map((d) => d.filename).join(', ')}`,
    `Communities: ${communities.map((c) => `${c.id}(${c.nodeIds.length} nodes)`).join(', ')}`,
  ].join('\n');

  const answer = await generateAnswer(model, query, [], metaView);
  return {
    answer: answer.text,
    thinking: `Layer 4 Meta-Strategist: ${stats.nodeCount} entities, ${stats.edgeCount} relations, ${communities.length} communities.`,
    sources: [],
    hypotheses: [],
  };
}
