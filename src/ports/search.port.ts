import type { DocumentKnowledgeBase } from '../domain/schemas.js';

export interface SearchResult {
  documentId: string;
  nodeId: string;
  score: number;
  field: string;
  highlights: string[];
}

export interface SearchOptions {
  limit?: number;
  fields?: string[];
  minScore?: number;
}

export interface FullTextSearchPort {
  /** Index a knowledge base for search */
  indexKnowledgeBase(kb: DocumentKnowledgeBase): void;
  /** Remove a document from the index */
  removeDocument(documentId: string): void;
  /** Search across all indexed documents */
  search(query: string, options?: SearchOptions): SearchResult[];
  /** Get index stats */
  getStats(): { documentCount: number; termCount: number; nodeCount: number };
}
