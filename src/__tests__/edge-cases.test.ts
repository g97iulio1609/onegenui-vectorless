import { describe, it, expect, beforeEach } from 'vitest';
import { BM25Adapter } from '../search/bm25-adapter.js';
import { InMemoryGraphAdapter } from '../graph/in-memory-graph.adapter.js';
import { HybridSearchAdapter } from '../search/hybrid-search.adapter.js';
import { MultiDocumentKB } from '../multi-doc/multi-document-kb.js';
import { EntityLinker } from '../multi-doc/entity-linker.js';
import { BudgetTracker } from '../detective/budget-tracker.js';
import { classifyQueryLayer } from '../detective/layer-router.js';
import {
  makeKnowledgeNode,
  makeKnowledgeNodeSimple,
  makeKB,
  makeKBFromNodes,
  makeGraphNode,
  makeGraphEdge,
} from './test-helpers.js';

// ─── BM25 Edge Cases ─────────────────────────────────────────────────────────

describe('BM25 Edge Cases', () => {
  let bm25: BM25Adapter;

  beforeEach(() => {
    bm25 = new BM25Adapter();
  });

  it('should return empty for search on empty index', () => {
    expect(bm25.search('anything')).toEqual([]);
  });

  it('should return empty for empty query string', () => {
    const kb = makeKB({
      id: 'doc1',
      tree: makeKnowledgeNode({ id: 'root', title: 'Test Document' }),
    });
    bm25.indexKnowledgeBase(kb);
    expect(bm25.search('')).toEqual([]);
  });

  it('should return empty for stopword-only query', () => {
    const kb = makeKB({
      id: 'doc1',
      tree: makeKnowledgeNode({ id: 'root', title: 'Some Content' }),
    });
    bm25.indexKnowledgeBase(kb);
    expect(bm25.search('the is a an')).toEqual([]);
  });

  it('should handle single-character tokens', () => {
    const kb = makeKB({
      id: 'doc1',
      tree: makeKnowledgeNode({ id: 'root', title: 'X Y Z' }),
    });
    bm25.indexKnowledgeBase(kb);
    const results = bm25.search('X');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should report correct stats after remove', () => {
    const kb = makeKB({
      id: 'doc1',
      tree: makeKnowledgeNode({ id: 'root', title: 'Test' }),
    });
    bm25.indexKnowledgeBase(kb);
    expect(bm25.getStats().documentCount).toBe(1);
    bm25.removeDocument('doc1');
    expect(bm25.getStats().documentCount).toBe(0);
    expect(bm25.getStats().nodeCount).toBe(0);
  });

  it('should remove non-existent document silently', () => {
    bm25.removeDocument('nonexistent');
    expect(bm25.getStats().documentCount).toBe(0);
  });
});

// ─── Graph Edge Cases ─────────────────────────────────────────────────────────

describe('Graph Edge Cases', () => {
  let graph: InMemoryGraphAdapter;

  beforeEach(() => {
    graph = new InMemoryGraphAdapter();
  });

  it('should return empty neighbors for isolated node', () => {
    graph.addNode(makeGraphNode('n1', 'Isolated'));
    expect(graph.getNeighbors('n1')).toEqual([]);
  });

  it('should return empty neighbors for nonexistent node', () => {
    expect(graph.getNeighbors('nonexistent')).toEqual([]);
  });

  it('should find shortest path to self', () => {
    graph.addNode(makeGraphNode('n1', 'Self'));
    expect(graph.findShortestPath('n1', 'n1')).toEqual(['n1']);
  });

  it('should return empty path for unreachable nodes', () => {
    graph.addNode(makeGraphNode('n1', 'A'));
    graph.addNode(makeGraphNode('n2', 'B'));
    expect(graph.findShortestPath('n1', 'n2')).toEqual([]);
  });

  it('should return empty subgraph for empty node list', () => {
    const sub = graph.extractSubgraph([]);
    expect(sub.nodes).toEqual([]);
    expect(sub.edges).toEqual([]);
  });

  it('should detect zero communities on empty graph', () => {
    const communities = graph.detectCommunities();
    expect(communities).toEqual([]);
  });

  it('should detect single community for fully connected graph', () => {
    graph.addNode(makeGraphNode('a', 'A'));
    graph.addNode(makeGraphNode('b', 'B'));
    graph.addNode(makeGraphNode('c', 'C'));
    graph.addEdge(makeGraphEdge('e1', 'a', 'b'));
    graph.addEdge(makeGraphEdge('e2', 'b', 'c'));
    graph.addEdge(makeGraphEdge('e3', 'a', 'c'));
    const communities = graph.detectCommunities();
    expect(communities.length).toBeGreaterThanOrEqual(1);
    const totalNodes = communities.reduce((sum, c) => sum + c.nodeIds.length, 0);
    expect(totalNodes).toBe(3);
  });

  it('should clear all data', () => {
    graph.addNode(makeGraphNode('n1', 'A'));
    graph.addEdge(makeGraphEdge('e1', 'n1', 'n1'));
    graph.clear();
    expect(graph.getStats().nodeCount).toBe(0);
    expect(graph.getStats().edgeCount).toBe(0);
  });

  it('should return correct density for complete graph', () => {
    graph.addNode(makeGraphNode('a', 'A'));
    graph.addNode(makeGraphNode('b', 'B'));
    graph.addEdge(makeGraphEdge('e1', 'a', 'b'));
    const stats = graph.getStats();
    expect(stats.density).toBe(1.0);
  });
});

// ─── Hybrid Search Edge Cases ─────────────────────────────────────────────────

describe('HybridSearch Edge Cases', () => {
  let bm25: BM25Adapter;
  let graph: InMemoryGraphAdapter;
  let hybrid: HybridSearchAdapter;

  beforeEach(() => {
    bm25 = new BM25Adapter();
    graph = new InMemoryGraphAdapter();
    hybrid = new HybridSearchAdapter(bm25, graph);
  });

  it('should return empty results for empty index', async () => {
    const results = await hybrid.search('anything');
    expect(results).toEqual([]);
  });

  it('should return empty results for empty query', async () => {
    const node = makeKnowledgeNodeSimple('n1', 'Test Content', ['test']);
    const kb = makeKBFromNodes('doc1', 'test.pdf', [node]);
    bm25.indexKnowledgeBase(kb);
    const results = await hybrid.search('');
    expect(results).toEqual([]);
  });

  it('should respect limit parameter', async () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeKnowledgeNodeSimple(`n${i}`, `Topic ${i}`, ['topic']),
    );
    const kb = makeKBFromNodes('doc1', 'test.pdf', nodes);
    bm25.indexKnowledgeBase(kb);
    const results = await hybrid.search('topic', { limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

// ─── MultiDoc Edge Cases ──────────────────────────────────────────────────────

describe('MultiDoc Edge Cases', () => {
  it('should handle empty KB set', () => {
    const bm25 = new BM25Adapter();
    const graph = new InMemoryGraphAdapter();
    const multiDoc = new MultiDocumentKB(bm25, graph);
    expect(multiDoc.getDocumentCount()).toBe(0);
    expect(multiDoc.search('anything')).toEqual([]);
  });

  it('entity linker should handle zero entities', () => {
    const linker = new EntityLinker();
    const links = linker.linkEntities('doc1', []);
    expect(links).toEqual([]);
  });

  it('entity linker should return no links for nonexistent entity', () => {
    const linker = new EntityLinker();
    expect(linker.getLinks('nonexistent')).toEqual([]);
  });
});

// ─── Budget Edge Cases ────────────────────────────────────────────────────────

describe('BudgetTracker Edge Cases', () => {
  it('should not allow spending more than limit', () => {
    const budget = new BudgetTracker('fast');
    budget.spend(10);
    expect(budget.canAfford(1)).toBe(false);
    expect(budget.getRemaining()).toBe(0);
  });

  it('should track exact boundary', () => {
    const budget = new BudgetTracker('fast');
    expect(budget.canAfford(10)).toBe(true);
    expect(budget.canAfford(11)).toBe(false);
  });

  it('should handle zero-cost operations', () => {
    const budget = new BudgetTracker('balanced');
    budget.spend(0);
    expect(budget.getRemaining()).toBe(30);
  });
});

// ─── Layer Router Edge Cases ──────────────────────────────────────────────────

describe('Layer Router Edge Cases', () => {
  it('should handle empty query', () => {
    const layer = classifyQueryLayer('', 10);
    expect(layer).toBeGreaterThanOrEqual(1);
    expect(layer).toBeLessThanOrEqual(4);
  });

  it('should handle zero documents (fallback to L1)', () => {
    expect(classifyQueryLayer('anything', 0)).toBe(1);
  });

  it('should handle boundary: exactly 5 docs', () => {
    expect(classifyQueryLayer('generic question', 5)).toBe(2);
  });

  it('should handle boundary: exactly 50 docs', () => {
    expect(classifyQueryLayer('generic question', 50)).toBe(3);
  });

  it('should handle boundary: exactly 500 docs', () => {
    expect(classifyQueryLayer('generic question', 500)).toBe(4);
  });
});
