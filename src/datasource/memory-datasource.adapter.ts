import type {
  DataSourcePort,
  SourceDocument,
  ListFilter,
  SchemaField,
  ChangeEvent,
  Unsubscribe,
} from '../ports/datasource.port.js';

/** In-memory data source for testing and development */
export class MemoryDataSourceAdapter implements DataSourcePort {
  readonly sourceId: string;
  readonly sourceName: string;
  private documents = new Map<string, SourceDocument>();
  private watchers: Array<(event: ChangeEvent) => void> = [];

  constructor(sourceId: string, sourceName: string) {
    this.sourceId = sourceId;
    this.sourceName = sourceName;
  }

  /** Add a document (triggers change events) */
  addDocument(doc: SourceDocument): void {
    const existing = this.documents.has(doc.id);
    this.documents.set(doc.id, doc);
    this.notifyWatchers({
      type: existing ? 'modified' : 'added',
      document: doc,
      timestamp: new Date().toISOString(),
    });
  }

  /** Remove a document (triggers change event) */
  removeDocument(id: string): void {
    const doc = this.documents.get(id);
    if (doc) {
      this.documents.delete(id);
      this.notifyWatchers({
        type: 'removed',
        document: doc,
        timestamp: new Date().toISOString(),
      });
    }
  }

  async listDocuments(filter?: ListFilter): Promise<SourceDocument[]> {
    let docs = [...this.documents.values()];
    if (filter?.updatedAfter) {
      const after = new Date(filter.updatedAfter).getTime();
      docs = docs.filter((d) => new Date(d.updatedAt).getTime() > after);
    }
    const offset = filter?.offset ?? 0;
    const limit = filter?.limit ?? 100;
    return docs.slice(offset, offset + limit);
  }

  async getDocumentContent(id: string): Promise<SourceDocument | null> {
    return this.documents.get(id) ?? null;
  }

  watchChanges(callback: (event: ChangeEvent) => void): Unsubscribe {
    this.watchers.push(callback);
    return () => {
      this.watchers = this.watchers.filter((w) => w !== callback);
    };
  }

  async discoverSchema(sampleSize = 100): Promise<SchemaField[]> {
    const fieldCounts = new Map<string, { type: string; count: number }>();
    const docs = [...this.documents.values()].slice(0, sampleSize);

    for (const doc of docs) {
      for (const [key, value] of Object.entries(doc.metadata)) {
        const type = typeof value;
        const existing = fieldCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          fieldCounts.set(key, { type, count: 1 });
        }
      }
    }

    return [...fieldCounts.entries()].map(([name, { type, count }]) => ({
      name,
      type,
      frequency: count / Math.max(docs.length, 1),
    }));
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  private notifyWatchers(event: ChangeEvent): void {
    for (const watcher of this.watchers) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        const result: unknown = watcher(event);
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => { /* handled by watcher */ });
        }
      } catch { /* watcher errors are non-fatal */ }
    }
  }
}
