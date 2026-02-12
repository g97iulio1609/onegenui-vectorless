import { z } from 'zod';
import nodePath from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpState } from '../state.js';
import { isPrivateUrl } from './url-guard.js';
import { textResult, errorResult } from './result.js';

const MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.html': 'text/html',
  '.csv': 'text/csv',
};

function getMimeType(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return MIME_MAP[ext] ?? 'application/octet-stream';
}

/** Convert Node.js Buffer to a proper ArrayBuffer (avoids pool sharing) */
function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  const view = new Uint8Array(ab);
  view.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  return ab;
}

/** Validate file path: must be absolute, no traversal */
function validateFilePath(filePath: string): string | null {
  const resolved = nodePath.resolve(filePath);
  if (resolved.includes('\0')) return 'Path contains null byte';
  if (filePath !== resolved && filePath.includes('..')) return 'Path traversal not allowed';
  return null;
}

export function registerDatasourceTools(server: McpServer, state: McpState): void {
  server.tool(
    'index-file',
    'Index a local file into the knowledge base',
    {
      path: z.string().describe('Absolute path to the file'),
    },
    async (args) => {
      try {
        const pathError = validateFilePath(args.path);
        if (pathError) return errorResult(pathError);

        const fs = await import('node:fs/promises');
        const buffer = await fs.readFile(args.path);
        const filename = nodePath.basename(args.path);
        const mimeType = getMimeType(args.path);

        const { generateKnowledgeBase } = await import('../../index.js');
        const { knowledgeBase } = await generateKnowledgeBase(
          bufferToArrayBuffer(buffer), filename, mimeType,
          { model: state.getModel(), extractEntities: true, extractRelations: true, extractKeywords: true },
        );
        state.addKB(knowledgeBase);
        return textResult({
          id: knowledgeBase.id, filename,
          entities: knowledgeBase.entities.length,
          relations: knowledgeBase.relations.length,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.tool(
    'index-url',
    'Fetch and index a web URL into the knowledge base',
    {
      url: z.string().url().describe('Public URL to fetch and index'),
    },
    async (args) => {
      try {
        if (isPrivateUrl(args.url)) return errorResult('Private/internal URLs are not allowed.');

        const response = await fetch(args.url, { redirect: 'manual' });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location && isPrivateUrl(new URL(location, args.url).href)) {
            return errorResult('Redirect to private/internal URL is not allowed.');
          }
          return errorResult(`Redirect to ${location ?? 'unknown'} — follow manually.`);
        }
        if (!response.ok) return errorResult(`HTTP ${response.status}: ${response.statusText}`);

        const MAX_BODY = 50 * 1024 * 1024; // 50 MB
        const cl = parseInt(response.headers.get('content-length') ?? '0', 10);
        if (cl > MAX_BODY) return errorResult(`Response too large: ${cl} bytes (max 50MB).`);

        const contentType = response.headers.get('content-type') ?? '';
        const rawContent = await response.text();
        if (rawContent.length > MAX_BODY) return errorResult('Response exceeds 50MB limit.');
        const isHtml = contentType.includes('text/html') || rawContent.trimStart().startsWith('<');
        const textContent = isHtml ? stripHtml(rawContent) : rawContent;
        if (!textContent.trim()) return errorResult('No text content extracted from URL.');

        const encoded = new TextEncoder().encode(textContent);
        const ab = bufferToArrayBuffer(Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength));
        const { generateKnowledgeBase } = await import('../../index.js');
        const parsed = new URL(args.url);
        const filename = parsed.hostname + parsed.pathname.replace(/\//g, '_');

        const { knowledgeBase } = await generateKnowledgeBase(
          ab, filename, isHtml ? 'text/html' : 'text/plain',
          { model: state.getModel(), extractEntities: true, extractRelations: true, extractKeywords: true },
        );
        state.addKB(knowledgeBase);
        return textResult({
          id: knowledgeBase.id, filename,
          entities: knowledgeBase.entities.length,
          relations: knowledgeBase.relations.length,
        });
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
