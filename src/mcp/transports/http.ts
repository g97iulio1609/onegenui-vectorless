import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createVectorlessMcpServer } from '../server.js';
import { McpState } from '../state.js';

/** Per-session transport storage */
const sessions = new Map<string, StreamableHTTPServerTransport>();
const MAX_SESSIONS = 100;

async function handleMcpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  sharedState: McpState,
): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    await sessions.get(sessionId)!.handleRequest(req, res);
    return;
  }

  // Evict oldest session if at capacity
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value;
    if (oldest) {
      const old = sessions.get(oldest);
      sessions.delete(oldest);
      await old?.close().catch(() => {});
    }
  }

  // New session: create fresh transport + server pair sharing state
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  const { server } = createVectorlessMcpServer(sharedState);
  await server.connect(transport);

  transport.onclose = () => {
    const sid = transport.sessionId;
    if (sid) sessions.delete(sid);
  };

  await transport.handleRequest(req, res);
  if (transport.sessionId) sessions.set(transport.sessionId, transport);
}

export async function startHttpTransport(
  port: number,
  state?: McpState,
): Promise<http.Server> {
  const sharedState = state ?? new McpState();

  const httpServer = http.createServer(async (req, res) => {
    if (req.url === '/mcp') {
      await handleMcpRequest(req, res, sharedState);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  httpServer.listen(port);
  return httpServer;
}
