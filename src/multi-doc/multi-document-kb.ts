import type { DocumentKnowledgeBase } from '../domain/schemas.js';
import type { FullTextSearchPort } from '../ports/search.port.js';
import type { GraphStorePort } from '../ports/graph-store.port.js';
import type {
  MultiDocumentKBPort,
  MultiDocSearchResult,
  MultiDocSearchOptions,
  EntityLink,
} from '../ports/multi-doc.port.js';
import { EntityLinker } from './entity-linker.js';

/** Manages multiple KBs with unified BM25 search and cross-doc entity linking */
export class MultiDocumentKB implements MultiDocumentKBPort {
  private kbs = new Map<string, DocumentKnowledgeBase>();
  private filenames = new Map<string, string>();
  private entityLinker = new EntityLinker();

  constructor(
    private readonly searchIndex: FullTextSearchPort,
    private readonly graph: GraphStorePort,
  ) {}

  addKnowledgeBase(kb: DocumentKnowledgeBase): void {
    this.kbs.set(kb.id, kb);
    this.filenames.set(kb.id, kb.filename);

    // Index in BM25
    this.searchIndex.indexKnowledgeBase(kb);

    // Index entities + relations in graph
    this.graph.indexEntities(kb.id, kb.entities);
    this.graph.indexRelations(kb.id, kb.relations);

    // Add document node to graph
    this.graph.addNode({
      id: `doc:${kb.id}`,
      type: 'document',
      label: kb.filename,
      properties: { totalPages: kb.totalPages, description: kb.description },
      documentId: kb.id,
    });

    // Cross-doc entity linking
    this.entityLinker.linkEntities(kb.id, kb.entities);

    // Add cross-doc edges for linked entities
    this.addCrossDocEdges(kb.id);
  }

  removeKnowledgeBase(documentId: string): void {
    // Remove entity/relation nodes from graph before removing KB
    const kb = this.kbs.get(documentId);
    if (kb) {
      for (const entity of kb.entities) this.graph.removeNode(entity.id);
    }
    this.searchIndex.removeDocument(documentId);
    this.graph.removeNode(`doc:${documentId}`);
    this.entityLinker.removeDocument(documentId);
    this.kbs.delete(documentId);
    this.filenames.delete(documentId);
  }

  getKnowledgeBase(documentId: string): DocumentKnowledgeBase | undefined {
    return this.kbs.get(documentId);
  }

  listDocuments(): Array<{ id: string; filename: string }> {
    return [...this.filenames.entries()].map(([id, filename]) => ({ id, filename }));
  }

  search(query: string, options?: MultiDocSearchOptions): MultiDocSearchResult[] {
    const limit = options?.limit ?? 10;
    const minScore = options?.minScore ?? 0.0;
    const bm25Results = this.searchIndex.search(query, { limit: limit * 2, minScore });

    let results: MultiDocSearchResult[] = bm25Results.map((r) => ({
      documentId: r.documentId,
      filename: this.filenames.get(r.documentId) ?? 'unknown',
      nodeId: r.nodeId,
      score: r.score,
      field: r.field,
      highlights: r.highlights,
    }));

    // Filter by document IDs if specified
    if (options?.documentIds) {
      const docSet = new Set(options.documentIds);
      results = results.filter((r) => docSet.has(r.documentId));
    }

    return results.slice(0, limit);
  }

  getEntityLinks(entityId: string): EntityLink[] {
    return this.entityLinker.getLinks(entityId);
  }

  getDocumentCount(): number {
    return this.kbs.size;
  }

  /** Add edges between same entities across different documents */
  private addCrossDocEdges(newDocId: string): void {
    const kb = this.kbs.get(newDocId);
    if (!kb) return;

    for (const entity of kb.entities) {
      const links = this.entityLinker.getLinks(entity.id);
      const otherDocs = links.filter((l) => l.documentId !== newDocId);
      for (const other of otherDocs) {
        this.graph.addEdge({
          id: `xdoc:${entity.id}:${other.entityId}`,
          source: entity.id,
          target: other.entityId,
          type: 'same_entity',
          weight: 1.0,
          properties: { crossDocument: true },
        });
      }
    }
  }
}
