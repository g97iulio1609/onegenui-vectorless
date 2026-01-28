import { createTocDetectorAgent } from "./toc-detector.js";
import { createStructureExtractorAgent } from "./structure-extractor.js";
import { createSummarizerAgent } from "./summarizer.js";
import { createBatchSummarizerAgent } from "./batch-summarizer.js";
import { EntityExtractorAgent } from "./entity-extractor.js";
import { RelationExtractorAgent } from "./relation-extractor.js";
import { QuoteExtractorAgent } from "./quote-extractor.js";
import { KeywordExtractorAgent } from "./keyword-extractor.js";
import { MetricsCalculatorAgent } from "./metrics-calculator.js";
import { CitationResolverAgent } from "./citation-resolver.js";
import { QuestionAnswerAgent } from "./question-answer.js";
import { DeepDiveAgent } from "./deep-dive.js";
// Core agents
export { createTocDetectorAgent } from "./toc-detector.js";
export { createStructureExtractorAgent } from "./structure-extractor.js";
export { createSummarizerAgent } from "./summarizer.js";
export { createBatchSummarizerAgent } from "./batch-summarizer.js";
// v2.0 Extraction agents
export { EntityExtractorAgent } from "./entity-extractor.js";
export { RelationExtractorAgent } from "./relation-extractor.js";
export { QuoteExtractorAgent } from "./quote-extractor.js";
export { KeywordExtractorAgent } from "./keyword-extractor.js";
export { MetricsCalculatorAgent } from "./metrics-calculator.js";
export { CitationResolverAgent } from "./citation-resolver.js";
// v2.0 Q&A agents
export { QuestionAnswerAgent } from "./question-answer.js";
export { DeepDiveAgent } from "./deep-dive.js";
// Agentic Retrieval (PageIndex pattern)
export { agenticRetrieval, } from "./agentic-retrieval.js";
// TOC verification and fixing (from original PageIndex)
export { verifyTitleOnPage, verifyTitleAtPageStart, verifyTreeStructure, fixNodePageIndex, fixIncorrectNodes, } from "./toc-verifier.js";
// Large node processing (from original PageIndex)
export { processLargeNode, processLargeNodesInTree, } from "./large-node-processor.js";
// Node text extraction (from original PageIndex)
export { addNodeText, removeNodeText, getNodeText, addNodeTextWithProgress, validateNodePageRanges, addPrefaceIfNeeded, } from "./node-text-extractor.js";
export function createAgents(model, logger, options) {
    const useBatch = options?.useBatchSummarizer !== false; // Default true
    return {
        tocDetector: createTocDetectorAgent(model, logger),
        structureExtractor: createStructureExtractorAgent(model, logger),
        summarizer: useBatch
            ? createBatchSummarizerAgent(model)
            : createSummarizerAgent(model),
    };
}
export function createExtendedAgents(model) {
    return {
        ...createAgents(model),
        entityExtractor: new EntityExtractorAgent(model),
        relationExtractor: new RelationExtractorAgent(model),
        quoteExtractor: new QuoteExtractorAgent(model),
        keywordExtractor: new KeywordExtractorAgent(model),
        metricsCalculator: new MetricsCalculatorAgent(),
        citationResolver: new CitationResolverAgent(model),
        questionAnswer: new QuestionAnswerAgent(model),
        deepDive: new DeepDiveAgent(model),
    };
}
//# sourceMappingURL=index.js.map