import type { SearchResult as BM25Result } from '../ports/search.port.js';
import type { GraphNode } from '../ports/graph-store.port.js';

/** A scored result from any search channel */
export interface ScoredResult {
  documentId: string;
  nodeId: string;
  score: number;
  channel: 'bm25' | 'graph' | 'agentic';
  highlights: string[];
}

/** Fused result after RRF */
export interface HybridResult {
  documentId: string;
  nodeId: string;
  fusedScore: number;
  channels: Array<{ channel: string; rank: number; score: number }>;
  highlights: string[];
}

/** Options for hybrid search */
export interface HybridSearchOptions {
  limit?: number;
  channels?: Array<'bm25' | 'graph' | 'agentic'>;
  rrfK?: number; // RRF constant, default 60
}

/** Hybrid search port combining multiple channels */
export interface HybridSearchPort {
  search(query: string, options?: HybridSearchOptions): Promise<HybridResult[]>;
}
