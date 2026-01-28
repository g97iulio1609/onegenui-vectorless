import type {
  TreeNode,
  TocEntry,
  DocumentIndex,
  SSEEvent,
  KnowledgeNode,
  DocumentKnowledgeBase,
  Answer,
  Entity,
  Relation,
  Quote,
  Keyword,
  DocumentMetrics,
  Citation,
} from "../domain/schemas.js";

export interface Page {
  pageNumber: number;
  content: string;
  images?: Uint8Array[];
}

// Document parser ports
export interface PdfParserPort {
  extractPages(pdfBuffer: ArrayBuffer): Promise<Page[]>;
  getTotalPages(pdfBuffer: ArrayBuffer): Promise<number>;
}

export interface WordParserPort {
  extractPages(buffer: ArrayBuffer): Promise<Page[]>;
}

export interface ExcelParserPort {
  extractPages(buffer: ArrayBuffer): Promise<Page[]>;
}

export interface PowerPointParserPort {
  extractPages(buffer: ArrayBuffer): Promise<Page[]>;
}

export interface MarkdownParserPort {
  extractPages(content: string): Promise<Page[]>;
}

export interface OcrParserPort {
  extractText(image: ArrayBuffer): Promise<string>;
  extractPages(images: ArrayBuffer[]): Promise<Page[]>;
}

// Unified parser port
export interface DocumentParserPort {
  parse(buffer: ArrayBuffer, mimeType: string): Promise<Page[]>;
  getSupportedMimeTypes(): string[];
}

export interface TocDetectorPort {
  detectToc(pages: Page[]): AsyncGenerator<{
    event: SSEEvent;
    entries?: TocEntry[];
    tocEndPage?: number;
  }>;
}

export interface StructureExtractorPort {
  extractStructure(
    pages: Page[],
    tocEntries: TocEntry[] | null,
    tocEndPage: number | null,
  ): AsyncGenerator<{
    event: SSEEvent;
    node?: TreeNode;
  }>;
}

export interface SummarizerPort {
  generateSummaries(
    tree: TreeNode,
    pages: Page[],
  ): AsyncGenerator<{
    event: SSEEvent;
    nodeId?: string;
    summary?: string;
  }>;
  generateDocumentDescription(tree: TreeNode): Promise<string>;
}

// New extraction ports for v2.0
export interface EntityExtractorPort {
  extractEntities(
    pages: Page[],
    tree: TreeNode,
  ): AsyncGenerator<{
    event: SSEEvent;
    entity?: Entity;
  }>;
}

export interface RelationExtractorPort {
  extractRelations(
    tree: TreeNode,
    entities: Entity[],
  ): AsyncGenerator<{
    event: SSEEvent;
    relation?: Relation;
  }>;
}

export interface QuoteExtractorPort {
  extractQuotes(
    pages: Page[],
    tree: TreeNode,
  ): AsyncGenerator<{
    event: SSEEvent;
    quote?: Quote;
  }>;
}

export interface KeywordExtractorPort {
  extractKeywords(
    pages: Page[],
    tree: TreeNode,
  ): AsyncGenerator<{
    event: SSEEvent;
    keyword?: Keyword;
  }>;
}

export interface MetricsCalculatorPort {
  calculateMetrics(pages: Page[], tree: TreeNode): Promise<DocumentMetrics>;
}

export interface CitationResolverPort {
  resolveCitations(
    pages: Page[],
    tree: TreeNode,
  ): AsyncGenerator<{
    event: SSEEvent;
    citation?: Citation;
  }>;
}

// Q&A Ports
export interface QuestionAnswerPort {
  answerQuestion(
    question: string,
    knowledgeBase: DocumentKnowledgeBase,
  ): AsyncGenerator<{
    event: SSEEvent;
    answer?: Answer;
  }>;
}

export interface DeepDivePort {
  deepDive(
    nodeId: string,
    knowledgeBase: DocumentKnowledgeBase,
    pages: Page[],
  ): AsyncGenerator<{
    event: SSEEvent;
    node?: KnowledgeNode;
  }>;
}

// Infrastructure ports
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

export interface SSEEmitterPort {
  emit(event: SSEEvent): void;
  flush(): Promise<void>;
  close(): void;
  getStream(): ReadableStream<Uint8Array>;
}

export interface IndexRepositoryPort {
  save(index: DocumentIndex): Promise<void>;
  findById(documentId: string): Promise<DocumentIndex | null>;
  findByHash(contentHash: string): Promise<DocumentIndex | null>;
  delete(documentId: string): Promise<void>;
}

export interface KnowledgeBaseRepositoryPort {
  save(kb: DocumentKnowledgeBase): Promise<void>;
  findById(id: string): Promise<DocumentKnowledgeBase | null>;
  findByHash(hash: string): Promise<DocumentKnowledgeBase | null>;
  delete(id: string): Promise<void>;
  list(): Promise<{ id: string; filename: string; processedAt: string }[]>;
}

export interface StoragePort {
  write(key: string, data: Uint8Array): Promise<void>;
  read(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// LLM Port for generic LLM operations
export interface LLMPort {
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
  generateStructured<T>(
    prompt: string,
    schema: unknown,
    options?: LLMOptions,
  ): Promise<T>;
  streamText(
    prompt: string,
    options?: LLMOptions,
  ): AsyncGenerator<string, void, unknown>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// Request/Response types
export interface GenerateIndexRequest {
  pdfBuffer: ArrayBuffer;
  options?: {
    model?: string;
    addSummaries?: boolean;
    addDescription?: boolean;
    addNodeText?: boolean;
    maxTocCheckPages?: number;
    maxPagesPerNode?: number;
    maxTokensPerNode?: number;
    verifyToc?: boolean;
    fixIncorrectToc?: boolean;
    processLargeNodes?: boolean;
  };
}

export interface GenerateIndexResult {
  index: DocumentIndex;
  pages: Page[];
  cached: boolean;
}

export interface GenerateKnowledgeBaseRequest {
  buffer: ArrayBuffer;
  filename: string;
  mimeType: string;
  options?: {
    extractEntities?: boolean;
    extractRelations?: boolean;
    extractQuotes?: boolean;
    extractKeywords?: boolean;
    extractCitations?: boolean;
    generateSummaries?: boolean;
    generateKeyInsights?: boolean;
  };
}

export interface GenerateKnowledgeBaseResult {
  knowledgeBase: DocumentKnowledgeBase;
  cached: boolean;
}

export interface AnswerQuestionRequest {
  question: string;
  knowledgeBaseId: string;
  options?: {
    maxSources?: number;
    minConfidence?: number;
  };
}

export interface AnswerQuestionResult {
  answer: Answer;
}

export interface DeepDiveRequest {
  nodeId: string;
  knowledgeBaseId: string;
  options?: {
    extractAdditionalQuotes?: boolean;
    generateDetailedSummary?: boolean;
  };
}

export interface DeepDiveResult {
  node: KnowledgeNode;
}
