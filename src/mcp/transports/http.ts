import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createVectorlessMcpServer } from '../server.js';
import type { McpState } from '../state.js';

export async function startHttpTransport(
  port: number,
  state?: McpState,
): Promise<http.Server> {
  const { server } = createVectorlessMcpServer(state);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const httpServer = http.createServer(async (req, res) => {
    if (req.url === '/mcp') {
      await transport.handleRequest(req, res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  httpServer.listen(port);
  return httpServer;
}
