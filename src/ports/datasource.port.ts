/** A document from any data source */
export interface SourceDocument {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  mimeType: string;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

/** Pagination filter for listing documents */
export interface ListFilter {
  limit?: number;
  offset?: number;
  query?: Record<string, unknown>;
  updatedAfter?: string;
}

/** Schema field discovered from a data source */
export interface SchemaField {
  name: string;
  type: string;
  frequency: number;
}

/** Change event from a data source */
export interface ChangeEvent {
  type: 'added' | 'modified' | 'removed';
  document: SourceDocument;
  timestamp: string;
}

/** Unsubscribe function */
export type Unsubscribe = () => void;

/** Universal interface for all data sources (files, Firestore, MongoDB, APIs) */
export interface DataSourcePort {
  readonly sourceId: string;
  readonly sourceName: string;

  /** List documents with pagination and optional filters */
  listDocuments(filter?: ListFilter): Promise<SourceDocument[]>;

  /** Get full content of a document */
  getDocumentContent(id: string): Promise<SourceDocument | null>;

  /** Watch for real-time changes (returns unsubscribe function) */
  watchChanges(callback: (event: ChangeEvent) => void): Unsubscribe;

  /** Auto-discover schema by sampling documents */
  discoverSchema(sampleSize?: number): Promise<SchemaField[]>;

  /** Check if data source is available */
  isAvailable(): Promise<boolean>;
}
