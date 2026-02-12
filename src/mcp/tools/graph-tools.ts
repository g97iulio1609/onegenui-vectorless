import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';
import { textResult, errorResult } from './result.js';

export function registerGraphTools(server: McpServer, state: McpState): void {
  server.tool(
    'graph-neighbors',
    'Get neighbors of a graph node by ID',
    {
      nodeId: z.string().describe('ID of the graph node'),
      maxDepth: z.number().int().min(1).max(5).optional().default(1),
      limit: z.number().int().min(1).max(100).optional().default(20),
    },
    async (args) => {
      try {
        const node = state.graph.getNode(args.nodeId);
        if (!node) return errorResult(`Node not found: ${args.nodeId}`);
        const neighbors = state.graph.getNeighbors(args.nodeId, {
          maxDepth: args.maxDepth,
          limit: args.limit,
        });
        return textResult({ node, neighborCount: neighbors.length, neighbors });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'graph-communities',
    'Detect and list communities in the knowledge graph using Louvain algorithm',
    {},
    async () => {
      try {
        const communities = state.graph.detectCommunities();
        return textResult({ count: communities.length, communities });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'graph-path',
    'Find shortest path between two graph nodes',
    {
      from: z.string().describe('Source node ID'),
      to: z.string().describe('Target node ID'),
    },
    async (args) => {
      try {
        const path = state.graph.findShortestPath(args.from, args.to);
        const nodes = path.map((id) => state.graph.getNode(id)).filter(Boolean);
        return textResult({ length: path.length, path, nodes });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'graph-entities',
    'List entities in the knowledge graph, optionally filtered by type',
    {
      type: z.enum(['entity', 'document', 'section']).optional().default('entity'),
    },
    async (args) => {
      try {
        const nodes = state.graph.findNodesByType(args.type);
        return textResult({ count: nodes.length, entities: nodes });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
