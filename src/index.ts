import type { LanguageModel } from "ai";
import { createAgents, createExtendedAgents } from "./agents/index.js";
import { GenerateIndexUseCase } from "./use-cases/generate-index.js";
import { GenerateKnowledgeBaseUseCase } from "./use-cases/generate-knowledge-base.js";
import {
  PdfParseAdapter,
  MemoryCacheAdapter,
  SSEEmitterAdapter,
  UnifiedDocumentParser,
  createSessionLogger,
} from "./infrastructure/index.js";
import type {
  DocumentIndex,
  TreeNode,
  TocEntry,
  DocumentKnowledgeBase,
  KnowledgeNode,
  Entity,
  Relation,
  Quote,
  Keyword,
  Citation,
  Answer,
} from "./domain/schemas.js";
import type { Page, GenerateIndexRequest } from "./ports/index.js";

export interface VectorlessIndexOptions {
  model: LanguageModel;
  addSummaries?: boolean;
  addDescription?: boolean;
  addNodeText?: boolean;
  maxTocCheckPages?: number;
  maxPagesPerNode?: number;
  maxTokensPerNode?: number;
  verifyToc?: boolean;
  fixIncorrectToc?: boolean;
  processLargeNodes?: boolean;
}

export interface VectorlessIndexResult {
  documentId: string;
  title: string;
  description?: string;
  totalPages: number;
  hasToc: boolean;
  tocEndPage?: number;
  tree: TreeNode;
  pages: Page[];
  cached: boolean;
}

export interface KnowledgeBaseOptions {
  model: LanguageModel;
  extractEntities?: boolean;
  extractRelations?: boolean;
  extractQuotes?: boolean;
  extractKeywords?: boolean;
  extractCitations?: boolean;
  generateSummaries?: boolean;
  generateKeyInsights?: boolean;
}

export interface KnowledgeBaseResult {
  knowledgeBase: DocumentKnowledgeBase;
  cached: boolean;
}

// Singleton instances
const globalCache = new MemoryCacheAdapter();
const globalParser = new UnifiedDocumentParser();

export async function generateDocumentIndex(
  buffer: Buffer | ArrayBuffer,
  options: VectorlessIndexOptions,
): Promise<VectorlessIndexResult> {
  const {
    model,
    addSummaries = true,
    addDescription = true,
    addNodeText = false,
    maxTocCheckPages = 20,
    maxPagesPerNode = 15,
    maxTokensPerNode = 20000,
    verifyToc = true,
    fixIncorrectToc = true,
    processLargeNodes = true,
  } = options;

  const pdfBuffer: ArrayBuffer =
    buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer;

  // Create session logger for this document processing
  const sessionId = `doc-${Date.now()}`;
  const logger = createSessionLogger(sessionId);
  logger.info("VECTORLESS", "Starting document index generation", {
    sessionId,
    bufferSize: pdfBuffer.byteLength,
    addSummaries,
    addDescription,
  });

  const agents = createAgents(model, logger);
  const pdfParser = new PdfParseAdapter();
  const sseEmitter = new SSEEmitterAdapter();

  const useCase = new GenerateIndexUseCase({
    pdfParser,
    tocDetector: agents.tocDetector,
    structureExtractor: agents.structureExtractor,
    summarizer: agents.summarizer,
    cache: globalCache,
    sseEmitter,
    model,
  });

  const request: GenerateIndexRequest = {
    pdfBuffer,
    options: {
      addSummaries,
      addDescription,
      addNodeText,
      maxTocCheckPages,
      maxPagesPerNode,
      maxTokensPerNode,
      verifyToc,
      fixIncorrectToc,
      processLargeNodes,
    },
  };

  const result = await useCase.execute(request);

  return {
    documentId: result.index.documentId,
    title: result.index.title,
    description: result.index.description,
    totalPages: result.index.totalPages,
    hasToc: result.index.hasToc,
    tocEndPage: result.index.tocEndPage,
    tree: result.index.tree,
    pages: result.pages,
    cached: result.cached,
  };
}

export async function generateKnowledgeBase(
  buffer: Buffer | ArrayBuffer,
  filename: string,
  mimeType: string,
  options: KnowledgeBaseOptions,
): Promise<KnowledgeBaseResult> {
  const docBuffer: ArrayBuffer =
    buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer).buffer;

  const sseEmitter = new SSEEmitterAdapter();

  const useCase = new GenerateKnowledgeBaseUseCase({
    parser: globalParser,
    cache: globalCache,
    sseEmitter,
    model: options.model,
  });

  return useCase.execute({
    buffer: docBuffer,
    filename,
    mimeType,
    options: {
      extractEntities: options.extractEntities,
      extractRelations: options.extractRelations,
      extractQuotes: options.extractQuotes,
      extractKeywords: options.extractKeywords,
      extractCitations: options.extractCitations,
      generateSummaries: options.generateSummaries,
      generateKeyInsights: options.generateKeyInsights,
    },
  });
}

// Re-export types for convenience
export type {
  DocumentIndex,
  TreeNode,
  TocEntry,
  DocumentKnowledgeBase,
  KnowledgeNode,
  Entity,
  Relation,
  Quote,
  Keyword,
  Citation,
  Answer,
  Page,
};
export * from "./domain/schemas.js";
export * from "./ports/index.js";
export * from "./agents/index.js";
export * from "./infrastructure/index.js";
export * from "./use-cases/index.js";

// PostgreSQL adapters for production
export {
  PostgresKBRepository,
  createPostgresKBRepository,
  CREATE_KB_TABLE_SQL,
  PostgresPreferenceStore,
  createPostgresPreferenceStore,
  CREATE_PREFERENCE_TABLES_SQL,
  type PostgresClient,
} from "./adapters/index.js";

// React hooks (for users with React)
export * from "./hooks/index.js";

// Re-export core types from vectorless
export type {
  // Domain types
  DocumentKnowledgeBase as VectorlessKnowledgeBase,
  KnowledgeNode as VectorlessKnowledgeNode,
  TreeSearchResult,
  TreeSearchOptions,
  QueryClassification,
  UserPreference,
  DomainTemplate,
  SSEEvent,
  // Agent exports
  AggregatedResult,
} from "vectorless";

// Re-export core factories
export {
  createTreeSearchOrchestrator,
  createMultiDocSearchAgent,
  createQueryClassifierAgent,
  createGreedySearchAgent,
  createMCTSSearchAgent,
  createContentExtractorAgent,
  createMultiNodeAggregatorAgent,
  createMemoryPreferenceStore,
  getDomainTemplate,
  listDomainTemplates,
  DOMAIN_TEMPLATES,
  LEGAL_TEMPLATE,
  MEDICAL_TEMPLATE,
  TECHNICAL_TEMPLATE,
  ACADEMIC_TEMPLATE,
  FINANCIAL_TEMPLATE,
  VERSION as VECTORLESS_VERSION,
} from "vectorless";
