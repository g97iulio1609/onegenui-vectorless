import type { GraphNode, GraphEdge } from '../ports/graph-store.port.js';

/** BFS neighbor traversal on adjacency list */
export function bfsNeighbors(
  startId: string,
  maxDepth: number,
  edgeTypes: string[] | undefined,
  adjacency: Map<string, Set<string>>,
  edges: Map<string, GraphEdge>,
  nodes: Map<string, GraphNode>,
): GraphNode[] {
  const visited = new Set<string>([startId]);
  const result: GraphNode[] = [];
  const queue: [string, number][] = [[startId, 0]];

  while (queue.length > 0) {
    const [current, depth] = queue.shift()!;
    if (depth >= maxDepth) continue;

    const edgeIds = adjacency.get(current);
    if (!edgeIds) continue;

    for (const eid of edgeIds) {
      const edge = edges.get(eid);
      if (!edge) continue;
      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
      const neighbor = edge.source === current ? edge.target : edge.source;
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      const node = nodes.get(neighbor);
      if (node) {
        result.push(node);
        queue.push([neighbor, depth + 1]);
      }
    }
  }
  return result;
}

/** BFS shortest path between two nodes */
export function findShortestPathBFS(
  from: string,
  to: string,
  adjacency: Map<string, Set<string>>,
  edges: Map<string, GraphEdge>,
): string[] {
  if (from === to) return [from];
  const parent = new Map<string, string>();
  const queue = [from];
  parent.set(from, '');

  while (queue.length > 0) {
    const current = queue.shift()!;
    const edgeIds = adjacency.get(current);
    if (!edgeIds) continue;

    for (const eid of edgeIds) {
      const edge = edges.get(eid);
      if (!edge) continue;
      const neighbor = edge.source === current ? edge.target : edge.source;
      if (parent.has(neighbor)) continue;
      parent.set(neighbor, current);
      if (neighbor === to) return reconstructPath(parent, to);
      queue.push(neighbor);
    }
  }
  return [];
}

function reconstructPath(parent: Map<string, string>, to: string): string[] {
  const path: string[] = [];
  let current = to;
  while (current !== '') {
    path.unshift(current);
    current = parent.get(current) ?? '';
  }
  return path;
}
