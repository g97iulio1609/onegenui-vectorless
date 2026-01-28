import type { LanguageModel } from "ai";
import type { TocDetectorPort, StructureExtractorPort, SummarizerPort, EntityExtractorPort, RelationExtractorPort, QuoteExtractorPort, KeywordExtractorPort, MetricsCalculatorPort, CitationResolverPort, QuestionAnswerPort, DeepDivePort } from "../ports/index.js";
import type { VectorlessLogger } from "../infrastructure/logger.js";
export { createTocDetectorAgent } from "./toc-detector.js";
export { createStructureExtractorAgent } from "./structure-extractor.js";
export { createSummarizerAgent } from "./summarizer.js";
export { createBatchSummarizerAgent } from "./batch-summarizer.js";
export { EntityExtractorAgent } from "./entity-extractor.js";
export { RelationExtractorAgent } from "./relation-extractor.js";
export { QuoteExtractorAgent } from "./quote-extractor.js";
export { KeywordExtractorAgent } from "./keyword-extractor.js";
export { MetricsCalculatorAgent } from "./metrics-calculator.js";
export { CitationResolverAgent } from "./citation-resolver.js";
export { QuestionAnswerAgent } from "./question-answer.js";
export { DeepDiveAgent } from "./deep-dive.js";
export { agenticRetrieval, type AgenticRetrievalResult, type AgenticRetrievalOptions, type Citation as AgenticCitation, } from "./agentic-retrieval.js";
export { verifyTitleOnPage, verifyTitleAtPageStart, verifyTreeStructure, fixNodePageIndex, fixIncorrectNodes, type VerificationResult, } from "./toc-verifier.js";
export { processLargeNode, processLargeNodesInTree, type LargeNodeOptions, } from "./large-node-processor.js";
export { addNodeText, removeNodeText, getNodeText, addNodeTextWithProgress, validateNodePageRanges, addPrefaceIfNeeded, } from "./node-text-extractor.js";
export interface AgentFactory {
    tocDetector: TocDetectorPort;
    structureExtractor: StructureExtractorPort;
    summarizer: SummarizerPort;
}
export interface CreateAgentsOptions {
    /** Use batch summarizer for 90% fewer LLM calls (default: true) */
    useBatchSummarizer?: boolean;
}
export interface ExtendedAgentFactory extends AgentFactory {
    entityExtractor: EntityExtractorPort;
    relationExtractor: RelationExtractorPort;
    quoteExtractor: QuoteExtractorPort;
    keywordExtractor: KeywordExtractorPort;
    metricsCalculator: MetricsCalculatorPort;
    citationResolver: CitationResolverPort;
    questionAnswer: QuestionAnswerPort;
    deepDive: DeepDivePort;
}
export declare function createAgents(model: LanguageModel, logger?: VectorlessLogger, options?: CreateAgentsOptions): AgentFactory;
export declare function createExtendedAgents(model: LanguageModel): ExtendedAgentFactory;
//# sourceMappingURL=index.d.ts.map