import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';
import { isPrivateUrl } from './url-guard.js';

function textResult(data: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: 'text' as const, text: msg }], isError: true as const };
}

async function fetchSafe(url: string): Promise<ArrayBuffer> {
  if (isPrivateUrl(url)) throw new Error('Private/internal URLs are not allowed.');
  const res = await fetch(url, { redirect: 'manual' });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    if (loc && isPrivateUrl(new URL(loc, url).href)) {
      throw new Error('Redirect to private/internal URL is not allowed.');
    }
    throw new Error(`Redirect to ${loc ?? 'unknown'} — follow manually.`);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const MAX_BODY = 100 * 1024 * 1024; // 100 MB for documents
  const cl = parseInt(res.headers.get('content-length') ?? '0', 10);
  if (cl > MAX_BODY) throw new Error(`Response too large: ${cl} bytes (max 100MB).`);
  return res.arrayBuffer();
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
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
        if (!args.pdfUrl && !args.pdfBase64) return errorResult('Either pdfUrl or pdfBase64 required.');
        const { generateDocumentIndex } = await import('../../index.js');
        const model = state.getModel();
        const buffer = args.pdfUrl ? await fetchSafe(args.pdfUrl) : base64ToArrayBuffer(args.pdfBase64!);
        const result = await generateDocumentIndex(buffer, { model });
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
        if (!args.url && !args.base64Content) return errorResult('Either url or base64Content required.');
        const { generateKnowledgeBase } = await import('../../index.js');
        const model = state.getModel();
        const buffer = args.url ? await fetchSafe(args.url) : base64ToArrayBuffer(args.base64Content!);
        const { knowledgeBase } = await generateKnowledgeBase(
          buffer, args.filename, args.mimeType,
          { model, extractEntities: true, extractRelations: true, extractKeywords: true },
        );
        state.addKB(knowledgeBase);
        return textResult({ id: knowledgeBase.id, filename: knowledgeBase.filename });
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
        const { AnswerQuestionUseCase } = await import('../../use-cases/answer-question.js');
        const { MemoryCacheAdapter, MemoryKnowledgeBaseRepository } = await import('../../infrastructure/index.js');
        const model = state.getModel();
        const repo = new MemoryKnowledgeBaseRepository();
        const kb = state.multiDoc.getKnowledgeBase(args.knowledgeBaseId);
        if (!kb) return errorResult(`Knowledge base not found: ${args.knowledgeBaseId}`);
        await repo.save(kb);
        const useCase = new AnswerQuestionUseCase({ cache: new MemoryCacheAdapter(), kbRepository: repo, model });
        const result = await useCase.execute(args);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
