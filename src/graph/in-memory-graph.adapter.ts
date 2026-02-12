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
    const visited = new Set<string>();
    const result: GraphNode[] = [];
    const maxDepth = options?.maxDepth ?? 1;
    const limit = options?.limit ?? 50;

    this.bfsNeighbors(nodeId, maxDepth, options?.edgeTypes, visited, result);
    return result.slice(0, limit);
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
    if (from === to) return [from];
    const parent = new Map<string, string>();
    const queue = [from];
    parent.set(from, '');

    while (queue.length > 0) {
      const current = queue.shift()!;
      const edgeIds = this.adjacency.get(current);
      if (!edgeIds) continue;

      for (const eid of edgeIds) {
        const edge = this.edges.get(eid);
        if (!edge) continue;
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (parent.has(neighbor)) continue;
        parent.set(neighbor, current);
        if (neighbor === to) return this.reconstructPath(parent, to);
        queue.push(neighbor);
      }
    }
    return [];
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
    const maxEdges = n > 1 ? (n * (n - 1)) / 2 : 1;
    return {
      nodeCount: n,
      edgeCount: e,
      communityCount: this.communities.length,
      density: e / maxEdges,
    };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.communities = [];
    this.nodeCommunity.clear();
  }

  /** Louvain-inspired community detection */
  detectCommunities(): Community[] {
    const nodeIds = [...this.nodes.keys()];
    if (nodeIds.length === 0) return [];

    const assignment = new Map<string, number>();
    nodeIds.forEach((id, i) => assignment.set(id, i));

    let changed = true;
    let iterations = 0;
    while (changed && iterations < 20) {
      changed = false;
      iterations++;
      for (const nodeId of nodeIds) {
        const best = this.findBestCommunity(nodeId, assignment);
        if (best !== assignment.get(nodeId)) {
          assignment.set(nodeId, best);
          changed = true;
        }
      }
    }

    const communityMap = new Map<number, string[]>();
    for (const [nodeId, cid] of assignment) {
      if (!communityMap.has(cid)) communityMap.set(cid, []);
      communityMap.get(cid)!.push(nodeId);
    }

    this.communities = [];
    this.nodeCommunity.clear();
    let idx = 0;
    for (const [, members] of communityMap) {
      const community: Community = {
        id: `community-${idx++}`,
        nodeIds: members,
        weight: members.length,
      };
      this.communities.push(community);
      for (const nid of members) {
        this.nodeCommunity.set(nid, community.id);
      }
    }
    return this.communities;
  }

  getCommunity(nodeId: string): Community | undefined {
    const cid = this.nodeCommunity.get(nodeId);
    if (!cid) return undefined;
    return this.communities.find((c) => c.id === cid);
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

  private bfsNeighbors(
    startId: string,
    maxDepth: number,
    edgeTypes: string[] | undefined,
    visited: Set<string>,
    result: GraphNode[],
  ): void {
    const queue: [string, number][] = [[startId, 0]];
    visited.add(startId);

    while (queue.length > 0) {
      const [current, depth] = queue.shift()!;
      if (depth >= maxDepth) continue;

      const edgeIds = this.adjacency.get(current);
      if (!edgeIds) continue;

      for (const eid of edgeIds) {
        const edge = this.edges.get(eid);
        if (!edge) continue;
        if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        const node = this.nodes.get(neighbor);
        if (node) {
          result.push(node);
          queue.push([neighbor, depth + 1]);
        }
      }
    }
  }

  private reconstructPath(parent: Map<string, string>, to: string): string[] {
    const path: string[] = [];
    let current = to;
    while (current !== '') {
      path.unshift(current);
      current = parent.get(current) ?? '';
    }
    return path;
  }

  private findBestCommunity(
    nodeId: string,
    assignment: Map<string, number>,
  ): number {
    const currentCom = assignment.get(nodeId)!;
    const edgeIds = this.adjacency.get(nodeId);
    if (!edgeIds || edgeIds.size === 0) return currentCom;

    const communityEdges = new Map<number, number>();
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (!edge) continue;
      const neighbor = edge.source === nodeId ? edge.target : edge.source;
      const nCom = assignment.get(neighbor);
      if (nCom === undefined) continue;
      communityEdges.set(nCom, (communityEdges.get(nCom) ?? 0) + edge.weight);
    }

    let bestCom = currentCom;
    let bestWeight = communityEdges.get(currentCom) ?? 0;
    for (const [com, w] of communityEdges) {
      if (w > bestWeight) {
        bestWeight = w;
        bestCom = com;
      }
    }
    return bestCom;
  }
}
