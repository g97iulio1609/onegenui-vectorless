import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text' as const, text: msg }], isError: true as const };
}

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
