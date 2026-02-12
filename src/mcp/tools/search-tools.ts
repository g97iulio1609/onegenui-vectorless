import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';
import { textResult, errorResult } from './result.js';

export function registerSearchTools(server: McpServer, state: McpState): void {
  server.tool(
    'bm25-search',
    'Full-text BM25 search across all indexed documents',
    {
      query: z.string().describe('Search query'),
      limit: z.number().int().min(1).max(50).optional().default(10),
      fields: z.array(z.string()).optional().describe('Fields to search (title, summary, content, keywords)'),
      minScore: z.number().optional().default(0),
    },
    async (args) => {
      try {
        const results = state.bm25.search(args.query, {
          limit: args.limit,
          fields: args.fields,
          minScore: args.minScore,
        });
        return textResult({ count: results.length, results });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'hybrid-search',
    'Hybrid BM25 + Knowledge Graph search with RRF fusion',
    {
      query: z.string().describe('Search query'),
      limit: z.number().int().min(1).max(50).optional().default(10),
    },
    async (args) => {
      try {
        const results = await state.hybridSearch.search(args.query, { limit: args.limit });
        return textResult({ count: results.length, results });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
