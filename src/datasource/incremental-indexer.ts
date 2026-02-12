import type { DataSourcePort, ChangeEvent, Unsubscribe } from '../ports/datasource.port.js';
import type { FullTextSearchPort } from '../ports/search.port.js';
import type { GraphStorePort } from '../ports/graph-store.port.js';
import type { MultiDocumentKBPort } from '../ports/multi-doc.port.js';

/** Callback for indexing events */
export type IndexEventCallback = (event: {
  type: 'indexed' | 'removed' | 'error';
  documentId: string;
  sourceId: string;
  durationMs?: number;
  error?: unknown;
}) => void;

/** Watches data sources and incrementally re-indexes changed documents */
export class IncrementalIndexer {
  private subscriptions: Unsubscribe[] = [];
  private listeners: IndexEventCallback[] = [];
  private pendingOps = new Map<string, Promise<void>>();

  constructor(
    private readonly multiDoc: MultiDocumentKBPort,
    private readonly buildKB: (content: string, filename: string) => Promise<{
      id: string;
      filename: string;
    } & Record<string, unknown>>,
  ) {}

  /** Start watching a data source */
  watch(source: DataSourcePort): Unsubscribe {
    const unsubscribe = source.watchChanges(async (event) => {
      await this.handleChange(event, source.sourceId);
    });
    this.subscriptions.push(unsubscribe);
    return unsubscribe;
  }

  /** Register an event listener */
  onEvent(callback: IndexEventCallback): void {
    this.listeners.push(callback);
  }

  /** Stop all watchers */
  stopAll(): void {
    for (const unsub of this.subscriptions) unsub();
    this.subscriptions = [];
  }

  /** Initial bulk index from a data source */
  async indexAll(source: DataSourcePort): Promise<number> {
    const docs = await source.listDocuments({ limit: 1000 });
    let indexed = 0;
    for (const doc of docs) {
      try {
        const start = Date.now();
        const kb = await this.buildKB(doc.content, doc.title);
        this.multiDoc.addKnowledgeBase(kb as Parameters<MultiDocumentKBPort['addKnowledgeBase']>[0]);
        indexed++;
        this.emit({
          type: 'indexed',
          documentId: doc.id,
          sourceId: source.sourceId,
          durationMs: Date.now() - start,
        });
      } catch (error) {
        this.emit({ type: 'error', documentId: doc.id, sourceId: source.sourceId, error });
      }
    }
    return indexed;
  }

  private async handleChange(event: ChangeEvent, sourceId: string): Promise<void> {
    const docId = event.document.id;
    // Serialize operations per document to prevent race conditions
    const prev = this.pendingOps.get(docId) ?? Promise.resolve();
    const op = prev.then(() => this.processChange(event, sourceId));
    this.pendingOps.set(docId, op);
    await op;
  }

  private async processChange(event: ChangeEvent, sourceId: string): Promise<void> {
    const { type, document } = event;

    try {
      if (type === 'removed') {
        this.multiDoc.removeKnowledgeBase(document.id);
        this.emit({ type: 'removed', documentId: document.id, sourceId });
        return;
      }

      const start = Date.now();
      if (type === 'modified') {
        this.multiDoc.removeKnowledgeBase(document.id);
      }
      const kb = await this.buildKB(document.content, document.title);
      this.multiDoc.addKnowledgeBase(kb as Parameters<MultiDocumentKBPort['addKnowledgeBase']>[0]);
      this.emit({
        type: 'indexed',
        documentId: document.id,
        sourceId,
        durationMs: Date.now() - start,
      });
    } catch (error) {
      this.emit({ type: 'error', documentId: document.id, sourceId, error });
    }
  }

  private emit(event: Parameters<IndexEventCallback>[0]): void {
    for (const listener of this.listeners) listener(event);
  }
}
