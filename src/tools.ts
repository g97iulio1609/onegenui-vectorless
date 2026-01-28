// =============================================================================
// @onegenui/vectorless - MCP Tool Definitions
// =============================================================================
//
// This module provides MCP tool definitions for the Vectorless document indexing
// and knowledge extraction functionality.

import { z } from "zod";
import type { LanguageModel } from "ai";
import {
  generateDocumentIndex,
  generateKnowledgeBase,
  type VectorlessIndexResult,
  type KnowledgeBaseResult,
} from "./index.js";
import { AnswerQuestionUseCase } from "./use-cases/answer-question.js";
import {
  MemoryCacheAdapter,
  MemoryKnowledgeBaseRepository,
} from "./infrastructure/index.js";
import type { Answer } from "./domain/schemas.js";

// -----------------------------------------------------------------------------
// Model Configuration
// -----------------------------------------------------------------------------

let configuredModel: LanguageModel | null = null;
const globalCache = new MemoryCacheAdapter();
const globalKbRepository = new MemoryKnowledgeBaseRepository();

export function setVectorlessModel(model: LanguageModel): void {
  configuredModel = model;
}

function getModel(): LanguageModel {
  if (!configuredModel) {
    throw new Error(
      "Vectorless model not configured. Call setVectorlessModel() first.",
    );
  }
  return configuredModel;
}

// -----------------------------------------------------------------------------
// PDF Index Tool
// -----------------------------------------------------------------------------

export const pdfIndexParamsSchema = z.object({
  pdfUrl: z.string().url().optional(),
  pdfBase64: z.string().optional(),
  addSummaries: z.boolean().optional().default(true),
  addDescription: z.boolean().optional().default(true),
  verifyToc: z.boolean().optional().default(true),
  fixIncorrectToc: z.boolean().optional().default(true),
  processLargeNodes: z.boolean().optional().default(true),
});

export type PdfIndexParams = z.infer<typeof pdfIndexParamsSchema>;

export const pdfIndexToolDefinition = {
  name: "pdf-index" as const,
  description:
    "Analyze a PDF document and generate a structured index with TOC and summaries.",
  parameters: pdfIndexParamsSchema,
  domain: "document" as const,
  tags: ["pdf", "document", "index", "toc", "structure"],
};

export async function executePdfIndex(
  params: PdfIndexParams,
): Promise<VectorlessIndexResult> {
  const { pdfUrl, pdfBase64, ...options } = params;

  if (!pdfUrl && !pdfBase64) {
    throw new Error("Either pdfUrl or pdfBase64 must be provided");
  }

  const model = getModel();
  let pdfBuffer: ArrayBuffer;

  if (pdfUrl) {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status}`);
    }
    pdfBuffer = await response.arrayBuffer();
  } else {
    const binaryString = atob(pdfBase64!);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    pdfBuffer = bytes.buffer;
  }

  return generateDocumentIndex(pdfBuffer, { model, ...options });
}

// -----------------------------------------------------------------------------
// Knowledge Base Generation Tool
// -----------------------------------------------------------------------------

export const knowledgeBaseParamsSchema = z.object({
  url: z.string().url().optional(),
  base64Content: z.string().optional(),
  filename: z.string(),
  mimeType: z.string().default("application/pdf"),
  extractEntities: z.boolean().optional().default(true),
  extractRelations: z.boolean().optional().default(true),
  extractQuotes: z.boolean().optional().default(true),
  extractKeywords: z.boolean().optional().default(true),
  extractCitations: z.boolean().optional().default(true),
});

export type KnowledgeBaseParams = z.infer<typeof knowledgeBaseParamsSchema>;

export const knowledgeBaseToolDefinition = {
  name: "generate-knowledge-base" as const,
  description:
    "Generate a comprehensive knowledge base from a document. " +
    "Extracts entities, relations, quotes, keywords, and citations. " +
    "Supports PDF, Word, Excel, and Markdown files.",
  parameters: knowledgeBaseParamsSchema,
  domain: "document" as const,
  tags: ["knowledge-base", "extraction", "entities", "relations", "document"],
};

export async function executeKnowledgeBase(
  params: KnowledgeBaseParams,
): Promise<KnowledgeBaseResult> {
  const { url, base64Content, filename, mimeType, ...options } = params;

  if (!url && !base64Content) {
    throw new Error("Either url or base64Content must be provided");
  }

  const model = getModel();
  let buffer: ArrayBuffer;

  if (url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status}`);
    }
    buffer = await response.arrayBuffer();
  } else {
    const binaryString = atob(base64Content!);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    buffer = bytes.buffer;
  }

  const result = await generateKnowledgeBase(buffer, filename, mimeType, {
    model,
    ...options,
  });

  // Store in repository for later Q&A
  await globalKbRepository.save(result.knowledgeBase);

  return result;
}

// -----------------------------------------------------------------------------
// Question-Answer Tool
// -----------------------------------------------------------------------------

export const questionAnswerParamsSchema = z.object({
  question: z.string().describe("The question to answer"),
  knowledgeBaseId: z.string().describe("ID of the knowledge base to query"),
  maxSources: z.number().int().min(1).max(10).optional().default(5),
  minConfidence: z.number().min(0).max(1).optional().default(0.3),
});

export type QuestionAnswerParams = z.infer<typeof questionAnswerParamsSchema>;

export const questionAnswerToolDefinition = {
  name: "answer-question" as const,
  description:
    "Answer a question using a previously generated knowledge base. " +
    "Returns the answer with source citations and confidence scores.",
  parameters: questionAnswerParamsSchema,
  domain: "document" as const,
  tags: ["qa", "question", "answer", "knowledge-base", "citation"],
};

export async function executeQuestionAnswer(
  params: QuestionAnswerParams,
): Promise<{ answer: Answer }> {
  const model = getModel();

  const useCase = new AnswerQuestionUseCase({
    cache: globalCache,
    kbRepository: globalKbRepository,
    model,
  });

  return useCase.execute(params);
}

// -----------------------------------------------------------------------------
// List Knowledge Bases Tool
// -----------------------------------------------------------------------------

export const listKnowledgeBasesParamsSchema = z.object({});

export const listKnowledgeBasesToolDefinition = {
  name: "list-knowledge-bases" as const,
  description: "List all available knowledge bases that can be queried.",
  parameters: listKnowledgeBasesParamsSchema,
  domain: "document" as const,
  tags: ["knowledge-base", "list"],
};

export async function executeListKnowledgeBases(): Promise<{
  knowledgeBases: { id: string; filename: string; processedAt: string }[];
}> {
  const list = await globalKbRepository.list();
  return { knowledgeBases: list };
}

// -----------------------------------------------------------------------------
// MCP Tool Factory
// -----------------------------------------------------------------------------

export function createPdfIndexMcpTool<T>(
  defineMcpTool: (opts: {
    name: string;
    description: string;
    parameters: z.ZodType;
    domain?: string;
    tags?: string[];
    execute: (params: PdfIndexParams) => Promise<VectorlessIndexResult>;
  }) => T,
): T {
  return defineMcpTool({
    ...pdfIndexToolDefinition,
    execute: executePdfIndex,
  });
}

export function createKnowledgeBaseMcpTool<T>(
  defineMcpTool: (opts: {
    name: string;
    description: string;
    parameters: z.ZodType;
    domain?: string;
    tags?: string[];
    execute: (params: KnowledgeBaseParams) => Promise<KnowledgeBaseResult>;
  }) => T,
): T {
  return defineMcpTool({
    ...knowledgeBaseToolDefinition,
    execute: executeKnowledgeBase,
  });
}

export function createQuestionAnswerMcpTool<T>(
  defineMcpTool: (opts: {
    name: string;
    description: string;
    parameters: z.ZodType;
    domain?: string;
    tags?: string[];
    execute: (params: QuestionAnswerParams) => Promise<{ answer: Answer }>;
  }) => T,
): T {
  return defineMcpTool({
    ...questionAnswerToolDefinition,
    execute: executeQuestionAnswer,
  });
}

// -----------------------------------------------------------------------------
// All Tools Export
// -----------------------------------------------------------------------------

export const vectorlessTools = {
  "pdf-index": {
    ...pdfIndexToolDefinition,
    execute: executePdfIndex,
  },
  "generate-knowledge-base": {
    ...knowledgeBaseToolDefinition,
    execute: executeKnowledgeBase,
  },
  "answer-question": {
    ...questionAnswerToolDefinition,
    execute: executeQuestionAnswer,
  },
  "list-knowledge-bases": {
    ...listKnowledgeBasesToolDefinition,
    execute: executeListKnowledgeBases,
  },
};
