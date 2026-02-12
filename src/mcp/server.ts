import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpState } from './state.js';
import { registerIndexTools } from './tools/index-tools.js';
import { registerSearchTools } from './tools/search-tools.js';
import { registerGraphTools } from './tools/graph-tools.js';
import { registerDetectiveTools } from './tools/detective-tools.js';
import { registerDatasourceTools } from './tools/datasource-tools.js';
import { registerSessionTools } from './tools/session-tools.js';

export function createVectorlessMcpServer(
  state?: McpState,
): { server: McpServer; state: McpState } {
  const mcpState = state ?? new McpState();

  const server = new McpServer(
    { name: 'vectorless', version: '3.0.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'AI Detective MCP server. ' +
        'Index documents, search with BM25/hybrid, explore knowledge graphs, ' +
        'and investigate with 4-layer AI Detective.',
    },
  );

  registerIndexTools(server, mcpState);
  registerSearchTools(server, mcpState);
  registerGraphTools(server, mcpState);
  registerDetectiveTools(server, mcpState);
  registerDatasourceTools(server, mcpState);
  registerSessionTools(server, mcpState);

  return { server, state: mcpState };
}

export { McpState };
