import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';
import { textResult, errorResult } from './result.js';

export function registerSessionTools(server: McpServer, state: McpState): void {
  server.tool(
    'stats',
    'Get index statistics: document count, graph nodes/edges, BM25 terms',
    {},
    async () => {
      try {
        const stats = state.getStats();
        return textResult(stats);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
