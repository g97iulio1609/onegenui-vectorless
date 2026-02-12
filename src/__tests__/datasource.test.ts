import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryDataSourceAdapter } from '../datasource/memory-datasource.adapter.js';
import { IncrementalIndexer } from '../datasource/incremental-indexer.js';
import type { SourceDocument } from '../ports/datasource.port.js';
import type { MultiDocumentKBPort } from '../ports/multi-doc.port.js';

function makeSourceDoc(id: string, title: string, content: string): SourceDocument {
  return {
    id,
    sourceId: 'test-source',
    title,
    content,
    mimeType: 'text/plain',
    metadata: { category: 'test', priority: 1 },
    updatedAt: new Date().toISOString(),
  };
}

describe('MemoryDataSourceAdapter', () => {
  let source: MemoryDataSourceAdapter;

  beforeEach(() => {
    source = new MemoryDataSourceAdapter('src1', 'Test Source');
  });

  it('should have correct source info', () => {
    expect(source.sourceId).toBe('src1');
    expect(source.sourceName).toBe('Test Source');
  });

  it('should add and list documents', async () => {
    source.addDocument(makeSourceDoc('d1', 'Doc 1', 'Content 1'));
    source.addDocument(makeSourceDoc('d2', 'Doc 2', 'Content 2'));
    const docs = await source.listDocuments();
    expect(docs).toHaveLength(2);
  });

  it('should get document content', async () => {
    source.addDocument(makeSourceDoc('d1', 'Doc 1', 'Content 1'));
    const doc = await source.getDocumentContent('d1');
    expect(doc?.content).toBe('Content 1');
  });

  it('should return null for missing document', async () => {
    expect(await source.getDocumentContent('nope')).toBeNull();
  });

  it('should paginate documents', async () => {
    for (let i = 0; i < 10; i++) {
      source.addDocument(makeSourceDoc(`d${i}`, `Doc ${i}`, `Content ${i}`));
    }
    const page1 = await source.listDocuments({ limit: 3, offset: 0 });
    const page2 = await source.listDocuments({ limit: 3, offset: 3 });
    expect(page1).toHaveLength(3);
    expect(page2).toHaveLength(3);
    expect(page1[0]!.id).not.toBe(page2[0]!.id);
  });

  it('should filter by updatedAfter', async () => {
    const old = makeSourceDoc('d1', 'Old', 'content');
    old.updatedAt = '2020-01-01T00:00:00Z';
    source.addDocument(old);

    const recent = makeSourceDoc('d2', 'Recent', 'content');
    recent.updatedAt = '2025-01-01T00:00:00Z';
    source.addDocument(recent);

    const docs = await source.listDocuments({ updatedAfter: '2024-01-01T00:00:00Z' });
    expect(docs).toHaveLength(1);
    expect(docs[0]!.id).toBe('d2');
  });

  it('should notify watchers on add', async () => {
    const events: string[] = [];
    source.watchChanges((event) => events.push(`${event.type}:${event.document.id}`));
    source.addDocument(makeSourceDoc('d1', 'Doc', 'Content'));
    expect(events).toEqual(['added:d1']);
  });

  it('should notify watchers on modify', async () => {
    source.addDocument(makeSourceDoc('d1', 'Doc', 'Content'));
    const events: string[] = [];
    source.watchChanges((event) => events.push(`${event.type}:${event.document.id}`));
    source.addDocument(makeSourceDoc('d1', 'Doc Updated', 'New Content'));
    expect(events).toEqual(['modified:d1']);
  });

  it('should notify watchers on remove', async () => {
    source.addDocument(makeSourceDoc('d1', 'Doc', 'Content'));
    const events: string[] = [];
    source.watchChanges((event) => events.push(`${event.type}:${event.document.id}`));
    source.removeDocument('d1');
    expect(events).toEqual(['removed:d1']);
  });

  it('should unsubscribe watcher', async () => {
    const events: string[] = [];
    const unsub = source.watchChanges((event) => events.push(event.type));
    source.addDocument(makeSourceDoc('d1', 'Doc', 'Content'));
    expect(events).toHaveLength(1);
    unsub();
    source.addDocument(makeSourceDoc('d2', 'Doc2', 'Content'));
    expect(events).toHaveLength(1); // no new events
  });

  it('should discover schema', async () => {
    source.addDocument(makeSourceDoc('d1', 'Doc', 'Content'));
    source.addDocument(makeSourceDoc('d2', 'Doc2', 'Content'));
    const schema = await source.discoverSchema();
    expect(schema.find((f) => f.name === 'category')).toBeDefined();
    expect(schema.find((f) => f.name === 'priority')).toBeDefined();
  });

  it('should report as available', async () => {
    expect(await source.isAvailable()).toBe(true);
  });
});

describe('IncrementalIndexer', () => {
  let source: MemoryDataSourceAdapter;
  let mockMultiDoc: MultiDocumentKBPort;
  let indexer: IncrementalIndexer;
  let addedKBs: string[];
  let removedKBs: string[];

  beforeEach(() => {
    source = new MemoryDataSourceAdapter('src1', 'Test Source');
    addedKBs = [];
    removedKBs = [];
    mockMultiDoc = {
      addKnowledgeBase: vi.fn((kb) => addedKBs.push(kb.id)),
      removeKnowledgeBase: vi.fn((id) => removedKBs.push(id)),
      getKnowledgeBase: vi.fn(),
      listDocuments: vi.fn(() => []),
      search: vi.fn(() => []),
      getEntityLinks: vi.fn(() => []),
      getDocumentCount: vi.fn(() => addedKBs.length),
    };

    // Mock KB builder
    const buildKB = vi.fn(async (content: string, filename: string) => ({
      id: filename,
      filename,
      mimeType: 'text/plain',
      hash: 'h1',
      processedAt: new Date().toISOString(),
      totalPages: 1,
      totalTokens: 100,
      tree: { id: 'root', title: filename, level: 0, pageStart: 1, pageEnd: 1, summary: '', keyPoints: [], entities: [], keywords: [], quotes: [], internalRefs: [], externalRefs: [], children: [] },
      entities: [],
      relations: [],
      keywords: [],
      quotes: [],
      citations: [],
      metrics: { totalWords: 100, totalCharacters: 500, averageWordsPerPage: 100, readingTimeMinutes: 1, complexityScore: 30, vocabularyRichness: 0.5, sentenceCount: 10, averageSentenceLength: 10, paragraphCount: 3 },
      description: 'test',
      keyInsights: [],
      processingMetadata: { version: '2.0.0' },
    }));

    indexer = new IncrementalIndexer(mockMultiDoc, buildKB);
  });

  it('should index all documents from source', async () => {
    source.addDocument(makeSourceDoc('d1', 'Doc1', 'Content 1'));
    source.addDocument(makeSourceDoc('d2', 'Doc2', 'Content 2'));

    const count = await indexer.indexAll(source);
    expect(count).toBe(2);
    expect(mockMultiDoc.addKnowledgeBase).toHaveBeenCalledTimes(2);
  });

  it('should watch and index new documents', async () => {
    indexer.watch(source);
    const events: string[] = [];
    indexer.onEvent((e) => events.push(`${e.type}:${e.documentId}`));

    source.addDocument(makeSourceDoc('d1', 'Doc1', 'Content'));

    // Wait for async handler
    await new Promise((r) => setTimeout(r, 50));
    expect(events).toContain('indexed:d1');
  });

  it('should watch and handle removals', async () => {
    source.addDocument(makeSourceDoc('d1', 'Doc1', 'Content'));
    indexer.watch(source);
    const events: string[] = [];
    indexer.onEvent((e) => events.push(`${e.type}:${e.documentId}`));

    source.removeDocument('d1');

    await new Promise((r) => setTimeout(r, 50));
    expect(events).toContain('removed:d1');
    expect(mockMultiDoc.removeKnowledgeBase).toHaveBeenCalledWith('d1');
  });

  it('should stop all watchers', async () => {
    indexer.watch(source);
    indexer.stopAll();

    const events: string[] = [];
    indexer.onEvent((e) => events.push(e.type));
    source.addDocument(makeSourceDoc('d1', 'Doc1', 'Content'));

    await new Promise((r) => setTimeout(r, 50));
    expect(events).toHaveLength(0);
  });
});
