import type { LanguageModel } from 'ai';
import type { DocumentKnowledgeBase } from '../domain/schemas.js';
import type { FullTextSearchPort } from '../ports/search.port.js';
import type { GraphStorePort } from '../ports/graph-store.port.js';
import type { MultiDocumentKBPort } from '../ports/multi-doc.port.js';
import { BM25Adapter } from '../search/bm25-adapter.js';
import { InMemoryGraphAdapter } from '../graph/in-memory-graph.adapter.js';
import { MultiDocumentKB } from '../multi-doc/multi-document-kb.js';
import { HybridSearchAdapter } from '../search/hybrid-search.adapter.js';
import { AIDetective } from '../detective/ai-detective.js';
import type { DetectivePort } from '../ports/detective.port.js';

/** Shared CLI state — singleton across commands */
export class CLIState {
  readonly bm25: FullTextSearchPort;
  readonly graph: InMemoryGraphAdapter;
  readonly multiDoc: MultiDocumentKBPort;
  readonly hybridSearch: HybridSearchAdapter;
  private detectiveInstance: DetectivePort | null = null;
  private modelRef: LanguageModel | null = null;

  constructor() {
    this.bm25 = new BM25Adapter();
    this.graph = new InMemoryGraphAdapter();
    this.multiDoc = new MultiDocumentKB(this.bm25, this.graph);
    this.hybridSearch = new HybridSearchAdapter(this.bm25, this.graph);
  }

  setModel(model: LanguageModel): void {
    this.modelRef = model;
    this.detectiveInstance = new AIDetective(
      model, this.multiDoc, this.graph, this.bm25,
    );
  }

  get model(): LanguageModel {
    if (!this.modelRef) throw new Error('Model not configured. Use --provider flag.');
    return this.modelRef;
  }

  get detective(): DetectivePort {
    if (!this.detectiveInstance) throw new Error('Detective not initialized. Configure model first.');
    return this.detectiveInstance;
  }

  /** Index a knowledge base into the search/graph systems */
  addKB(kb: DocumentKnowledgeBase): void {
    this.multiDoc.addKnowledgeBase(kb);
  }

  /** Get summary stats */
  getStats(): {
    documents: number;
    graphStats: { nodeCount: number; edgeCount: number; communityCount: number; density: number };
    searchStats: { documentCount: number; termCount: number; nodeCount: number };
  } {
    return {
      documents: this.multiDoc.getDocumentCount(),
      graphStats: this.graph.getStats(),
      searchStats: this.bm25.getStats(),
    };
  }
}

export const state = new CLIState();
