import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text' as const, text: msg }], isError: true as const };
}

export function registerIndexTools(server: McpServer, state: McpState): void {
  server.tool(
    'pdf-index',
    'Analyze a PDF and generate a structured index with TOC and summaries',
    {
      pdfUrl: z.string().url().optional().describe('URL to fetch the PDF from'),
      pdfBase64: z.string().optional().describe('Base64-encoded PDF content'),
    },
    async (args) => {
      try {
        const { executePdfIndex } = await import('../../tools.js');
        const { setVectorlessModel } = await import('../../tools.js');
        setVectorlessModel(state.getModel());
        const result = await executePdfIndex({
          ...args,
          addSummaries: true,
          addDescription: true,
          verifyToc: true,
          fixIncorrectToc: true,
          processLargeNodes: true,
        });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'generate-knowledge-base',
    'Generate a knowledge base from a document (PDF, Word, Excel, Markdown)',
    {
      url: z.string().url().optional().describe('URL to fetch the document from'),
      base64Content: z.string().optional().describe('Base64-encoded document content'),
      filename: z.string().describe('Original filename with extension'),
      mimeType: z.string().default('application/pdf').describe('MIME type of the document'),
    },
    async (args) => {
      try {
        const { executeKnowledgeBase, setVectorlessModel } = await import('../../tools.js');
        setVectorlessModel(state.getModel());
        const result = await executeKnowledgeBase({
          ...args,
          extractEntities: true,
          extractRelations: true,
          extractQuotes: true,
          extractKeywords: true,
          extractCitations: true,
        });
        state.addKB(result.knowledgeBase);
        return textResult({ id: result.knowledgeBase.id, filename: result.knowledgeBase.filename, cached: result.cached });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'list-knowledge-bases',
    'List all indexed knowledge bases',
    {},
    async () => {
      try {
        const docs = state.multiDoc.listDocuments();
        return textResult({ count: docs.length, documents: docs });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'answer-question',
    'Answer a question using indexed knowledge bases with source citations',
    {
      question: z.string().describe('The question to answer'),
      knowledgeBaseId: z.string().describe('ID of the knowledge base to query'),
      maxSources: z.number().int().min(1).max(10).optional().default(5),
      minConfidence: z.number().min(0).max(1).optional().default(0.3),
    },
    async (args) => {
      try {
        const { executeQuestionAnswer, setVectorlessModel } = await import('../../tools.js');
        setVectorlessModel(state.getModel());
        const result = await executeQuestionAnswer(args);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
