import type { DocumentKnowledgeBase, Entity } from '../domain/schemas.js';
import type { FullTextSearchPort, SearchResult } from '../ports/search.port.js';
import type { GraphStorePort, GraphNode } from '../ports/graph-store.port.js';

/** Cross-document entity link */
export interface EntityLink {
  entityId: string;
  documentId: string;
  canonicalId: string;
}

/** Unified search result across multiple documents */
export interface MultiDocSearchResult {
  documentId: string;
  filename: string;
  nodeId: string;
  score: number;
  field: string;
  highlights: string[];
}

/** Options for multi-doc search */
export interface MultiDocSearchOptions {
  limit?: number;
  minScore?: number;
  documentIds?: string[];
}

/** Multi-document knowledge base port */
export interface MultiDocumentKBPort {
  addKnowledgeBase(kb: DocumentKnowledgeBase): void;
  removeKnowledgeBase(documentId: string): void;
  getKnowledgeBase(documentId: string): DocumentKnowledgeBase | undefined;
  listDocuments(): Array<{ id: string; filename: string }>;
  search(query: string, options?: MultiDocSearchOptions): MultiDocSearchResult[];
  getEntityLinks(entityId: string): EntityLink[];
  getDocumentCount(): number;
}
