import type { LanguageModel } from "ai";
import type { DocumentIndex, TreeNode, TocEntry, DocumentKnowledgeBase, KnowledgeNode, Entity, Relation, Quote, Keyword, Citation, Answer } from "./domain/schemas.js";
import type { Page } from "./ports/index.js";
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
export declare function generateDocumentIndex(buffer: Buffer | ArrayBuffer, options: VectorlessIndexOptions): Promise<VectorlessIndexResult>;
export declare function generateKnowledgeBase(buffer: Buffer | ArrayBuffer, filename: string, mimeType: string, options: KnowledgeBaseOptions): Promise<KnowledgeBaseResult>;
export type { DocumentIndex, TreeNode, TocEntry, DocumentKnowledgeBase, KnowledgeNode, Entity, Relation, Quote, Keyword, Citation, Answer, Page, };
export * from "./domain/schemas.js";
export * from "./ports/index.js";
export * from "./agents/index.js";
export * from "./infrastructure/index.js";
export * from "./use-cases/index.js";
export * from "./formatters/index.js";
export * from "./search/index.js";
export { PostgresKBRepository, createPostgresKBRepository, CREATE_KB_TABLE_SQL, PostgresPreferenceStore, createPostgresPreferenceStore, CREATE_PREFERENCE_TABLES_SQL, type PostgresClient, } from "./adapters/index.js";
export type { DocumentKnowledgeBase as VectorlessKnowledgeBase, KnowledgeNode as VectorlessKnowledgeNode, TreeSearchResult, TreeSearchOptions, QueryClassification, UserPreference, DomainTemplate, SSEEvent, AggregatedResult, } from "vectorless";
export { createTreeSearchOrchestrator, createMultiDocSearchAgent, createQueryClassifierAgent, createGreedySearchAgent, createMCTSSearchAgent, createContentExtractorAgent, createMultiNodeAggregatorAgent, createMemoryPreferenceStore, getDomainTemplate, listDomainTemplates, DOMAIN_TEMPLATES, LEGAL_TEMPLATE, MEDICAL_TEMPLATE, TECHNICAL_TEMPLATE, ACADEMIC_TEMPLATE, FINANCIAL_TEMPLATE, VERSION as VECTORLESS_VERSION, } from "vectorless";
//# sourceMappingURL=index.d.ts.map