import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';
import { textResult, errorResult } from './result.js';

export function registerDetectiveTools(server: McpServer, state: McpState): void {
  server.tool(
    'ask-detective',
    'AI Detective investigation with 4-layer adaptive reasoning',
    {
      question: z.string().describe('Question to investigate'),
      budget: z.enum(['fast', 'balanced', 'thorough']).optional().default('balanced')
        .describe('Investigation budget: fast (10 ops), balanced (30 ops), thorough (100 ops)'),
    },
    async (args) => {
      try {
        const result = await state.detective.investigate(args.question, { budget: args.budget });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
