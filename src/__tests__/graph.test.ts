import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryGraphAdapter } from '../graph/in-memory-graph.adapter.js';
import type { GraphNode, GraphEdge } from '../ports/graph-store.port.js';
import type { Entity, Relation } from '../domain/schemas.js';

function makeNode(id: string, label: string, type: GraphNode['type'] = 'entity'): GraphNode {
  return { id, type, label, properties: {} };
}

function makeEdge(id: string, source: string, target: string, type = 'references', weight = 0.8): GraphEdge {
  return { id, source, target, type, weight, properties: {} };
}

describe('InMemoryGraphAdapter', () => {
  let graph: InMemoryGraphAdapter;

  beforeEach(() => {
    graph = new InMemoryGraphAdapter();
  });

  describe('Node CRUD', () => {
    it('should add and retrieve a node', () => {
      graph.addNode(makeNode('n1', 'ACME Corp'));
      expect(graph.getNode('n1')?.label).toBe('ACME Corp');
    });

    it('should return undefined for missing node', () => {
      expect(graph.getNode('nope')).toBeUndefined();
    });

    it('should remove a node and its edges', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2'));
      graph.removeNode('n1');
      expect(graph.getNode('n1')).toBeUndefined();
      expect(graph.getEdge('e1')).toBeUndefined();
      expect(graph.getStats().nodeCount).toBe(1);
    });
  });

  describe('Edge CRUD', () => {
    it('should add and retrieve an edge', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2', 'supports'));
      expect(graph.getEdge('e1')?.type).toBe('supports');
    });

    it('should remove an edge', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2'));
      graph.removeEdge('e1');
      expect(graph.getEdge('e1')).toBeUndefined();
    });

    it('should get edges of a node', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addNode(makeNode('n3', 'C'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2', 'supports'));
      graph.addEdge(makeEdge('e2', 'n1', 'n3', 'contradicts'));
      const edges = graph.getEdgesOf('n1');
      expect(edges).toHaveLength(2);
    });

    it('should filter edges by type', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addNode(makeNode('n3', 'C'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2', 'supports'));
      graph.addEdge(makeEdge('e2', 'n1', 'n3', 'contradicts'));
      const edges = graph.getEdgesOf('n1', { edgeTypes: ['supports'] });
      expect(edges).toHaveLength(1);
      expect(edges[0].type).toBe('supports');
    });
  });

  describe('Neighbors', () => {
    it('should find direct neighbors', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addNode(makeNode('n3', 'C'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2'));
      graph.addEdge(makeEdge('e2', 'n2', 'n3'));

      const neighbors = graph.getNeighbors('n1');
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe('n2');
    });

    it('should find 2-hop neighbors', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addNode(makeNode('n3', 'C'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2'));
      graph.addEdge(makeEdge('e2', 'n2', 'n3'));

      const neighbors = graph.getNeighbors('n1', { maxDepth: 2 });
      expect(neighbors).toHaveLength(2);
    });

    it('should respect limit', () => {
      graph.addNode(makeNode('n1', 'A'));
      for (let i = 0; i < 10; i++) {
        graph.addNode(makeNode(`n${i + 2}`, `Node ${i}`));
        graph.addEdge(makeEdge(`e${i}`, 'n1', `n${i + 2}`));
      }
      const neighbors = graph.getNeighbors('n1', { limit: 3 });
      expect(neighbors).toHaveLength(3);
    });

    it('should filter by edge type', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addNode(makeNode('n3', 'C'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2', 'supports'));
      graph.addEdge(makeEdge('e2', 'n1', 'n3', 'contradicts'));

      const neighbors = graph.getNeighbors('n1', { edgeTypes: ['supports'] });
      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe('n2');
    });
  });

  describe('Shortest Path', () => {
    it('should find shortest path', () => {
      graph.addNode(makeNode('a', 'A'));
      graph.addNode(makeNode('b', 'B'));
      graph.addNode(makeNode('c', 'C'));
      graph.addNode(makeNode('d', 'D'));
      graph.addEdge(makeEdge('e1', 'a', 'b'));
      graph.addEdge(makeEdge('e2', 'b', 'c'));
      graph.addEdge(makeEdge('e3', 'c', 'd'));
      graph.addEdge(makeEdge('e4', 'a', 'd')); // shortcut

      const path = graph.findShortestPath('a', 'd');
      expect(path).toEqual(['a', 'd']);
    });

    it('should return empty for disconnected nodes', () => {
      graph.addNode(makeNode('a', 'A'));
      graph.addNode(makeNode('b', 'B'));
      expect(graph.findShortestPath('a', 'b')).toEqual([]);
    });

    it('should return single node for same source and target', () => {
      graph.addNode(makeNode('a', 'A'));
      expect(graph.findShortestPath('a', 'a')).toEqual(['a']);
    });
  });

  describe('Subgraph', () => {
    it('should extract subgraph with internal edges only', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addNode(makeNode('n3', 'C'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2'));
      graph.addEdge(makeEdge('e2', 'n2', 'n3'));

      const sub = graph.extractSubgraph(['n1', 'n2']);
      expect(sub.nodes).toHaveLength(2);
      expect(sub.edges).toHaveLength(1);
      expect(sub.edges[0].id).toBe('e1');
    });
  });

  describe('Community Detection', () => {
    it('should detect communities in a connected graph', () => {
      // Create two cliques connected by one edge
      for (let i = 1; i <= 3; i++) {
        graph.addNode(makeNode(`a${i}`, `GroupA-${i}`));
      }
      for (let i = 1; i <= 3; i++) {
        graph.addNode(makeNode(`b${i}`, `GroupB-${i}`));
      }
      // Clique A
      graph.addEdge(makeEdge('ea12', 'a1', 'a2', 'supports', 1.0));
      graph.addEdge(makeEdge('ea13', 'a1', 'a3', 'supports', 1.0));
      graph.addEdge(makeEdge('ea23', 'a2', 'a3', 'supports', 1.0));
      // Clique B
      graph.addEdge(makeEdge('eb12', 'b1', 'b2', 'supports', 1.0));
      graph.addEdge(makeEdge('eb13', 'b1', 'b3', 'supports', 1.0));
      graph.addEdge(makeEdge('eb23', 'b2', 'b3', 'supports', 1.0));
      // Bridge
      graph.addEdge(makeEdge('bridge', 'a1', 'b1', 'references', 0.1));

      const communities = graph.detectCommunities();
      expect(communities.length).toBeGreaterThanOrEqual(2);
    });

    it('should assign community to each node', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2', 'supports', 1.0));
      graph.detectCommunities();

      const c1 = graph.getCommunity('n1');
      const c2 = graph.getCommunity('n2');
      expect(c1).toBeDefined();
      expect(c2).toBeDefined();
    });

    it('should return undefined community for unknown node', () => {
      expect(graph.getCommunity('nope')).toBeUndefined();
    });
  });

  describe('Index from KB', () => {
    it('should index entities as graph nodes', () => {
      const entities: Entity[] = [
        {
          id: 'ent1',
          type: 'organization',
          value: 'ACME Corp',
          normalized: 'ACME Corporation',
          occurrences: [{ nodeId: 'sec1', pageNumber: 1 }],
        },
        {
          id: 'ent2',
          type: 'person',
          value: 'John Doe',
          occurrences: [{ nodeId: 'sec2', pageNumber: 3 }],
        },
      ];

      graph.indexEntities('doc1', entities);
      expect(graph.getStats().nodeCount).toBe(2);
      expect(graph.getNode('ent1')?.label).toBe('ACME Corporation');
      expect(graph.getNode('ent2')?.label).toBe('John Doe');
      expect(graph.getNode('ent1')?.documentId).toBe('doc1');
    });

    it('should index relations as graph edges', () => {
      graph.addNode(makeNode('sec1', 'Section 1', 'section'));
      graph.addNode(makeNode('sec2', 'Section 2', 'section'));
      const relations: Relation[] = [
        {
          id: 'rel1',
          sourceNodeId: 'sec1',
          targetNodeId: 'sec2',
          type: 'supports',
          confidence: 0.9,
          evidence: 'Section 1 supports Section 2',
        },
      ];

      graph.indexRelations('doc1', relations);
      expect(graph.getStats().edgeCount).toBe(1);
      expect(graph.getEdge('rel1')?.weight).toBe(0.9);
    });
  });

  describe('Find by type/label', () => {
    it('should find nodes by type', () => {
      graph.addNode(makeNode('n1', 'A', 'entity'));
      graph.addNode(makeNode('n2', 'B', 'document'));
      graph.addNode(makeNode('n3', 'C', 'entity'));
      expect(graph.findNodesByType('entity')).toHaveLength(2);
    });

    it('should find nodes by label pattern', () => {
      graph.addNode(makeNode('n1', 'ACME Corp'));
      graph.addNode(makeNode('n2', 'Beta Inc'));
      graph.addNode(makeNode('n3', 'ACME Foundation'));
      expect(graph.findNodesByLabel('acme')).toHaveLength(2);
    });
  });

  describe('Stats & Clear', () => {
    it('should return correct stats', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addNode(makeNode('n2', 'B'));
      graph.addEdge(makeEdge('e1', 'n1', 'n2'));
      const stats = graph.getStats();
      expect(stats.nodeCount).toBe(2);
      expect(stats.edgeCount).toBe(1);
      expect(stats.density).toBe(1); // 1 edge / 1 max edge
    });

    it('should clear all data', () => {
      graph.addNode(makeNode('n1', 'A'));
      graph.addEdge(makeEdge('e1', 'n1', 'n1'));
      graph.clear();
      expect(graph.getStats().nodeCount).toBe(0);
      expect(graph.getStats().edgeCount).toBe(0);
    });
  });
});
