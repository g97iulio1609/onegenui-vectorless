import type { Entity, Relation } from '../domain/schemas.js';

/** A node in the knowledge graph */
export interface GraphNode {
  id: string;
  type: 'entity' | 'document' | 'section';
  label: string;
  properties: Record<string, unknown>;
  documentId?: string;
}

/** An edge in the knowledge graph */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

/** A community of related nodes */
export interface Community {
  id: string;
  nodeIds: string[];
  summary?: string;
  label?: string;
  weight: number;
}

/** Subgraph extraction result */
export interface Subgraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/** Options for neighbor queries */
export interface NeighborOptions {
  maxDepth?: number;
  edgeTypes?: string[];
  limit?: number;
}

/** Graph statistics */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  communityCount: number;
  density: number;
}

/** Port interface for the knowledge graph store */
export interface GraphStorePort {
  addNode(node: GraphNode): void;
  addEdge(edge: GraphEdge): void;
  removeNode(id: string): void;
  removeEdge(id: string): void;
  getNode(id: string): GraphNode | undefined;
  getEdge(id: string): GraphEdge | undefined;
  getNeighbors(nodeId: string, options?: NeighborOptions): GraphNode[];
  getEdgesOf(nodeId: string, options?: NeighborOptions): GraphEdge[];
  findShortestPath(from: string, to: string): string[];
  extractSubgraph(nodeIds: string[]): Subgraph;
  getStats(): GraphStats;
  clear(): void;

  /** Community detection */
  detectCommunities(): Community[];
  getCommunity(nodeId: string): Community | undefined;

  /** Populate graph from KB entities and relations */
  indexEntities(documentId: string, entities: Entity[]): void;
  indexRelations(documentId: string, relations: Relation[]): void;

  /** Query by entity properties */
  findNodesByType(type: GraphNode['type']): GraphNode[];
  findNodesByLabel(pattern: string): GraphNode[];
}
