import type { GraphEdge, Community } from '../ports/graph-store.port.js';

/** Louvain-inspired community detection (simplified, single-level) */
export function detectCommunitiesLouvain(
  nodeIds: string[],
  adjacency: Map<string, Set<string>>,
  edges: Map<string, GraphEdge>,
): { communities: Community[]; nodeCommunity: Map<string, string> } {
  if (nodeIds.length === 0) return { communities: [], nodeCommunity: new Map() };

  // Phase 1: each node in its own community
  const assignment = new Map<string, number>();
  nodeIds.forEach((id, i) => assignment.set(id, i));

  // Phase 2: iteratively move nodes to best community
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 20) {
    changed = false;
    iterations++;
    for (const nodeId of nodeIds) {
      const best = findBestCommunity(nodeId, assignment, adjacency, edges);
      if (best !== assignment.get(nodeId)) {
        assignment.set(nodeId, best);
        changed = true;
      }
    }
  }

  // Build communities from assignments
  const communityMap = new Map<number, string[]>();
  for (const [nodeId, cid] of assignment) {
    if (!communityMap.has(cid)) communityMap.set(cid, []);
    communityMap.get(cid)!.push(nodeId);
  }

  const communities: Community[] = [];
  const nodeCommunity = new Map<string, string>();
  let idx = 0;
  for (const [, members] of communityMap) {
    const community: Community = {
      id: `community-${idx++}`,
      nodeIds: members,
      weight: members.length,
    };
    communities.push(community);
    for (const nid of members) nodeCommunity.set(nid, community.id);
  }

  return { communities, nodeCommunity };
}

/** Find community with max weighted edges for a node */
function findBestCommunity(
  nodeId: string,
  assignment: Map<string, number>,
  adjacency: Map<string, Set<string>>,
  edges: Map<string, GraphEdge>,
): number {
  const currentCom = assignment.get(nodeId)!;
  const edgeIds = adjacency.get(nodeId);
  if (!edgeIds || edgeIds.size === 0) return currentCom;

  const communityEdges = new Map<number, number>();
  for (const eid of edgeIds) {
    const edge = edges.get(eid);
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
