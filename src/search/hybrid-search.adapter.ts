import type { FullTextSearchPort } from '../ports/search.port.js';
import type { GraphStorePort } from '../ports/graph-store.port.js';
import type {
  HybridSearchPort,
  HybridResult,
  HybridSearchOptions,
  ScoredResult,
} from '../ports/hybrid-search.port.js';

/** Reciprocal Rank Fusion constant */
const DEFAULT_RRF_K = 60;

/**
 * Hybrid search combining BM25 + Graph with RRF (Reciprocal Rank Fusion).
 * Synergistic: graph entities expand BM25 terms, BM25 scores weight graph traversal.
 */
export class HybridSearchAdapter implements HybridSearchPort {
  constructor(
    private readonly bm25: FullTextSearchPort,
    private readonly graph: GraphStorePort,
  ) {}

  async search(query: string, options?: HybridSearchOptions): Promise<HybridResult[]> {
    const limit = options?.limit ?? 10;
    const k = options?.rrfK ?? DEFAULT_RRF_K;
    const channels = options?.channels ?? ['bm25', 'graph'];

    const channelResults: ScoredResult[][] = [];

    if (channels.includes('bm25')) {
      channelResults.push(this.searchBM25(query, limit * 2));
    }
    if (channels.includes('graph')) {
      channelResults.push(this.searchGraph(query, limit * 2));
    }

    return this.fuseWithRRF(channelResults, k, limit);
  }

  /** BM25 channel: direct keyword search */
  private searchBM25(query: string, limit: number): ScoredResult[] {
    // Expand query with graph aliases
    const expandedTerms = this.expandQueryWithGraph(query);
    const searchQuery = expandedTerms.length > 0
      ? `${query} ${expandedTerms.join(' ')}`
      : query;

    return this.bm25.search(searchQuery, { limit }).map((r) => ({
      documentId: r.documentId,
      nodeId: r.nodeId,
      score: r.score,
      channel: 'bm25' as const,
      highlights: r.highlights,
    }));
  }

  /** Graph channel: entity + relation traversal */
  private searchGraph(query: string, limit: number): ScoredResult[] {
    const results: ScoredResult[] = [];

    // Find entities matching query terms
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    for (const term of queryTerms) {
      const nodes = this.graph.findNodesByLabel(term);
      for (const node of nodes) {
        results.push({
          documentId: node.documentId ?? '',
          nodeId: node.id,
          score: 1.0,
          channel: 'graph',
          highlights: [`Entity: ${node.label}`],
        });

        // Add neighbors (1-hop)
        const neighbors = this.graph.getNeighbors(node.id, { maxDepth: 1, limit: 5 });
        for (const neighbor of neighbors) {
          results.push({
            documentId: neighbor.documentId ?? '',
            nodeId: neighbor.id,
            score: 0.7,
            channel: 'graph',
            highlights: [`Related to: ${node.label} → ${neighbor.label}`],
          });
        }
      }
    }

    // Deduplicate by nodeId, keeping highest score
    const deduped = new Map<string, ScoredResult>();
    for (const r of results) {
      const existing = deduped.get(r.nodeId);
      if (!existing || r.score > existing.score) {
        deduped.set(r.nodeId, r);
      }
    }

    return [...deduped.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** Expand query terms using graph aliases and related entities */
  private expandQueryWithGraph(query: string): string[] {
    const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const expanded: string[] = [];

    for (const term of terms) {
      const nodes = this.graph.findNodesByLabel(term);
      for (const node of nodes.slice(0, 2)) {
        // Add entity aliases/normalized forms
        const val = node.properties['value'] as string | undefined;
        if (val && val.toLowerCase() !== term) {
          expanded.push(val);
        }
        // Add labels of direct neighbors
        const neighbors = this.graph.getNeighbors(node.id, { maxDepth: 1, limit: 3 });
        for (const n of neighbors) {
          if (!terms.includes(n.label.toLowerCase())) {
            expanded.push(n.label);
          }
        }
      }
    }
    return [...new Set(expanded)].slice(0, 5);
  }

  /** Reciprocal Rank Fusion: fuse multiple ranked lists */
  private fuseWithRRF(
    channelResults: ScoredResult[][],
    k: number,
    limit: number,
  ): HybridResult[] {
    const fusedScores = new Map<string, {
      documentId: string;
      nodeId: string;
      fusedScore: number;
      channels: Array<{ channel: string; rank: number; score: number }>;
      highlights: string[];
    }>();

    for (const results of channelResults) {
      for (let rank = 0; rank < results.length; rank++) {
        const r = results[rank];
        const key = `${r.documentId}:${r.nodeId}`;
        const rrfScore = 1 / (k + rank + 1);

        const existing = fusedScores.get(key);
        if (existing) {
          existing.fusedScore += rrfScore;
          existing.channels.push({ channel: r.channel, rank: rank + 1, score: r.score });
          existing.highlights.push(...r.highlights);
        } else {
          fusedScores.set(key, {
            documentId: r.documentId,
            nodeId: r.nodeId,
            fusedScore: rrfScore,
            channels: [{ channel: r.channel, rank: rank + 1, score: r.score }],
            highlights: [...r.highlights],
          });
        }
      }
    }

    return [...fusedScores.values()]
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, limit);
  }
}
