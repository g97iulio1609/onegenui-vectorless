import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createVectorlessMcpServer } from '../server.js';
import type { McpState } from '../state.js';

export async function startStdioTransport(state?: McpState): Promise<void> {
  const { server } = createVectorlessMcpServer(state);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
