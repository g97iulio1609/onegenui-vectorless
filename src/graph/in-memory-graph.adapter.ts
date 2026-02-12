import type { Entity, Relation } from '../domain/schemas.js';
import type {
  GraphStorePort,
  GraphNode,
  GraphEdge,
  Community,
  Subgraph,
  NeighborOptions,
  GraphStats,
} from '../ports/graph-store.port.js';
import { detectCommunitiesLouvain } from './louvain.js';
import { bfsNeighbors, findShortestPathBFS } from './traversal.js';

/** In-memory adjacency list graph with Louvain community detection */
export class InMemoryGraphAdapter implements GraphStorePort {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private adjacency = new Map<string, Set<string>>();
  private communities: Community[] = [];
  private nodeCommunity = new Map<string, string>();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, new Set());
    }
  }

  addEdge(edge: GraphEdge): void {
    this.edges.set(edge.id, edge);
    this.ensureAdjacency(edge.source).add(edge.id);
    this.ensureAdjacency(edge.target).add(edge.id);
  }

  removeNode(id: string): void {
    const edgeIds = this.adjacency.get(id);
    if (edgeIds) {
      for (const eid of [...edgeIds]) this.removeEdge(eid);
    }
    this.nodes.delete(id);
    this.adjacency.delete(id);
    this.nodeCommunity.delete(id);
  }

  removeEdge(id: string): void {
    const edge = this.edges.get(id);
    if (edge) {
      this.adjacency.get(edge.source)?.delete(id);
      this.adjacency.get(edge.target)?.delete(id);
      this.edges.delete(id);
    }
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.get(id);
  }

  getNeighbors(nodeId: string, options?: NeighborOptions): GraphNode[] {
    const maxDepth = options?.maxDepth ?? 1;
    const limit = options?.limit ?? 50;
    return bfsNeighbors(
      nodeId, maxDepth, options?.edgeTypes,
      this.adjacency, this.edges, this.nodes,
    ).slice(0, limit);
  }

  getEdgesOf(nodeId: string, options?: NeighborOptions): GraphEdge[] {
    const edgeIds = this.adjacency.get(nodeId);
    if (!edgeIds) return [];
    const result: GraphEdge[] = [];
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (!edge) continue;
      if (options?.edgeTypes && !options.edgeTypes.includes(edge.type)) continue;
      result.push(edge);
    }
    return result;
  }

  findShortestPath(from: string, to: string): string[] {
    return findShortestPathBFS(from, to, this.adjacency, this.edges);
  }

  extractSubgraph(nodeIds: string[]): Subgraph {
    const nodeSet = new Set(nodeIds);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const seenEdges = new Set<string>();

    for (const nid of nodeIds) {
      const node = this.nodes.get(nid);
      if (node) nodes.push(node);
      const edgeIds = this.adjacency.get(nid);
      if (!edgeIds) continue;
      for (const eid of edgeIds) {
        if (seenEdges.has(eid)) continue;
        const edge = this.edges.get(eid);
        if (edge && nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
          edges.push(edge);
          seenEdges.add(eid);
        }
      }
    }
    return { nodes, edges };
  }

  getStats(): GraphStats {
    const n = this.nodes.size;
    const e = this.edges.size;
    const maxEdges = n > 1 ? (n * (n - 1)) / 2 : 0;
    return {
      nodeCount: n,
      edgeCount: e,
      communityCount: this.communities.length,
      density: maxEdges > 0 ? e / maxEdges : 0,
    };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.communities = [];
    this.nodeCommunity.clear();
  }

  detectCommunities(): Community[] {
    const result = detectCommunitiesLouvain([...this.nodes.keys()], this.adjacency, this.edges);
    this.communities = result.communities;
    this.nodeCommunity = result.nodeCommunity;
    return this.communities;
  }

  getCommunity(nodeId: string): Community | undefined {
    const cid = this.nodeCommunity.get(nodeId);
    return cid ? this.communities.find((c) => c.id === cid) : undefined;
  }

  indexEntities(documentId: string, entities: Entity[]): void {
    for (const entity of entities) {
      this.addNode({
        id: entity.id,
        type: 'entity',
        label: entity.normalized ?? entity.value,
        properties: {
          entityType: entity.type,
          value: entity.value,
          confidence: entity.confidence,
        },
        documentId,
      });
    }
  }

  indexRelations(documentId: string, relations: Relation[]): void {
    for (const relation of relations) {
      this.addEdge({
        id: relation.id,
        source: relation.sourceNodeId,
        target: relation.targetNodeId,
        type: relation.type,
        weight: relation.confidence,
        properties: { evidence: relation.evidence, documentId },
      });
    }
  }

  findNodesByType(type: GraphNode['type']): GraphNode[] {
    const result: GraphNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.type === type) result.push(node);
    }
    return result;
  }

  findNodesByLabel(pattern: string): GraphNode[] {
    const lower = pattern.toLowerCase();
    const result: GraphNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.label.toLowerCase().includes(lower)) result.push(node);
    }
    return result;
  }

  // ─── Private ───────────────────────────────────────────

  private ensureAdjacency(nodeId: string): Set<string> {
    if (!this.adjacency.has(nodeId)) {
      this.adjacency.set(nodeId, new Set());
    }
    return this.adjacency.get(nodeId)!;
  }
}
