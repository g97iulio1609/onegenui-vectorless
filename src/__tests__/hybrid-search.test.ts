import { describe, it, expect, beforeEach } from 'vitest';
import { HybridSearchAdapter } from '../search/hybrid-search.adapter.js';
import { BM25Adapter } from '../search/bm25-adapter.js';
import { InMemoryGraphAdapter } from '../graph/in-memory-graph.adapter.js';
import type { DocumentKnowledgeBase, KnowledgeNode, Entity, Relation } from '../domain/schemas.js';

function makeNode(id: string, title: string, keywords: string[] = [], summary = ''): KnowledgeNode {
  return {
    id, title, level: 1, pageStart: 1, pageEnd: 2,
    summary: summary || `Summary of ${title}`,
    keyPoints: [], entities: [], keywords, quotes: [],
    internalRefs: [], externalRefs: [], children: [],
  };
}

function makeKB(id: string, filename: string, nodes: KnowledgeNode[], entities: Entity[] = [], relations: Relation[] = []): DocumentKnowledgeBase {
  return {
    id, filename, mimeType: 'application/pdf', hash: `hash-${id}`,
    processedAt: new Date().toISOString(), totalPages: 10, totalTokens: 5000,
    tree: {
      id: `${id}-root`, title: filename, level: 0, pageStart: 1, pageEnd: 10,
      summary: `Root of ${filename}`, keyPoints: [], entities: [], keywords: [],
      quotes: [], internalRefs: [], externalRefs: [], children: nodes,
    },
    entities, relations, keywords: [], quotes: [], citations: [],
    metrics: {
      totalWords: 5000, totalCharacters: 30000, averageWordsPerPage: 500,
      readingTimeMinutes: 20, complexityScore: 50, vocabularyRichness: 0.6,
      sentenceCount: 200, averageSentenceLength: 15, paragraphCount: 40,
    },
    description: `Description of ${filename}`, keyInsights: [],
    processingMetadata: { version: '2.0.0' },
  };
}

describe('HybridSearchAdapter', () => {
  let bm25: BM25Adapter;
  let graph: InMemoryGraphAdapter;
  let hybrid: HybridSearchAdapter;

  beforeEach(() => {
    bm25 = new BM25Adapter();
    graph = new InMemoryGraphAdapter();
    hybrid = new HybridSearchAdapter(bm25, graph);
  });

  it('should return BM25 results', async () => {
    const kb = makeKB('doc1', 'Contract.pdf', [
      makeNode('s1', 'Penalty Clause', ['penalty', 'clause'], 'The penalty clause specifies a 5% fee for delays'),
      makeNode('s2', 'Delivery Terms', ['delivery', 'timeline'], 'Delivery must occur within 30 days'),
    ]);
    bm25.indexKnowledgeBase(kb);

    const results = await hybrid.search('penalty clause', { channels: ['bm25'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].nodeId).toContain('s1');
    expect(results[0].channels[0].channel).toBe('bm25');
  });

  it('should return graph results', async () => {
    const entities: Entity[] = [
      { id: 'ent1', type: 'organization', value: 'ACME Corp', normalized: 'ACME Corp',
        occurrences: [{ nodeId: 's1', pageNumber: 1 }] },
      { id: 'ent2', type: 'concept', value: 'penalty clause', normalized: 'penalty clause',
        occurrences: [{ nodeId: 's1', pageNumber: 1 }] },
    ];
    const relations: Relation[] = [
      { id: 'rel1', sourceNodeId: 'ent1', targetNodeId: 'ent2', type: 'references', confidence: 0.9 },
    ];

    graph.indexEntities('doc1', entities);
    graph.indexRelations('doc1', relations);

    const results = await hybrid.search('ACME', { channels: ['graph'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].channels[0].channel).toBe('graph');
  });

  it('should fuse BM25 + Graph results with RRF', async () => {
    const entities: Entity[] = [
      { id: 'ent1', type: 'organization', value: 'ACME Corp', normalized: 'ACME Corp',
        occurrences: [{ nodeId: 's1', pageNumber: 1 }] },
    ];

    const kb = makeKB('doc1', 'Contract.pdf', [
      makeNode('s1', 'ACME Contract', ['acme', 'contract'], 'ACME Corp signed a contract with penalties'),
    ], entities);

    bm25.indexKnowledgeBase(kb);
    graph.indexEntities('doc1', entities);

    const results = await hybrid.search('ACME contract');
    expect(results.length).toBeGreaterThan(0);
    // Results that appear in multiple channels should have higher fused scores
    const topResult = results[0];
    expect(topResult.fusedScore).toBeGreaterThan(0);
  });

  it('should respect limit', async () => {
    const nodes: KnowledgeNode[] = [];
    for (let i = 0; i < 20; i++) {
      nodes.push(makeNode(`s${i}`, `Section ${i}`, ['contract', 'term']));
    }
    bm25.indexKnowledgeBase(makeKB('doc1', 'Big.pdf', nodes));

    const results = await hybrid.search('contract term', { limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should expand query terms from graph', async () => {
    // ACME is connected to "penalty" entity
    graph.addNode({ id: 'acme', type: 'entity', label: 'ACME Corp', properties: { value: 'ACME Corporation' }, documentId: 'doc1' });
    graph.addNode({ id: 'penalty', type: 'entity', label: 'penalty clause', properties: {}, documentId: 'doc1' });
    graph.addEdge({ id: 'e1', source: 'acme', target: 'penalty', type: 'references', weight: 0.9, properties: {} });

    const kb = makeKB('doc1', 'Contract.pdf', [
      makeNode('s1', 'Penalty Details', ['penalty'], 'The penalty clause is 5% per month'),
    ]);
    bm25.indexKnowledgeBase(kb);

    // Searching for "ACME" should also find "penalty" results due to graph expansion
    const results = await hybrid.search('ACME');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should handle empty results gracefully', async () => {
    const results = await hybrid.search('nonexistent');
    expect(results).toEqual([]);
  });

  it('should deduplicate graph results by nodeId', async () => {
    graph.addNode({ id: 'n1', type: 'entity', label: 'contract', properties: {}, documentId: 'doc1' });
    graph.addNode({ id: 'n2', type: 'entity', label: 'contract terms', properties: {}, documentId: 'doc1' });
    graph.addEdge({ id: 'e1', source: 'n1', target: 'n2', type: 'references', weight: 0.5, properties: {} });

    const results = await hybrid.search('contract', { channels: ['graph'] });
    const nodeIds = results.map((r) => r.nodeId);
    const uniqueNodeIds = new Set(nodeIds);
    expect(nodeIds.length).toBe(uniqueNodeIds.size);
  });

  it('should show channels in fused results', async () => {
    graph.addNode({ id: 'n1', type: 'entity', label: 'penalty', properties: {}, documentId: 'doc1' });
    bm25.indexKnowledgeBase(makeKB('doc1', 'File.pdf', [
      makeNode('n1', 'Penalty', ['penalty']),
    ]));

    const results = await hybrid.search('penalty');
    expect(results.length).toBeGreaterThan(0);
    // The top result should appear in at least one channel
    expect(results[0].channels.length).toBeGreaterThan(0);
  });
});
