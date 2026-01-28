import type { CachePort, GenerateIndexRequest, GenerateIndexResult, PdfParserPort, SSEEmitterPort, StructureExtractorPort, SummarizerPort, TocDetectorPort } from "../ports/index.js";
import type { LanguageModel } from "ai";
export interface GenerateIndexUseCaseDeps {
    pdfParser: PdfParserPort;
    tocDetector: TocDetectorPort;
    structureExtractor: StructureExtractorPort;
    summarizer: SummarizerPort;
    cache: CachePort;
    sseEmitter: SSEEmitterPort;
    model: LanguageModel;
}
export interface GenerateIndexOptions {
    model?: string;
    /** Generate summaries for all nodes (default: true, uses batch for efficiency) */
    addSummaries?: boolean;
    /** Generate document description (default: true) */
    addDescription?: boolean;
    /** Include raw text in nodes (default: false) */
    addNodeText?: boolean;
    /** Max pages to check for TOC (default: 20) */
    maxTocCheckPages?: number;
    /** Max pages per node before splitting (default: 15) */
    maxPagesPerNode?: number;
    /** Max tokens per node (default: 20000) */
    maxTokensPerNode?: number;
    /** Verify TOC accuracy with sampling (default: true) */
    verifyToc?: boolean;
    /** Fix incorrect TOC entries (default: true) */
    fixIncorrectToc?: boolean;
    /** Process large nodes recursively (default: true) */
    processLargeNodes?: boolean;
    /** Summarize only top N levels (0 = all, default: 0) */
    summaryDepth?: number;
}
export declare class GenerateIndexUseCase {
    private deps;
    constructor(deps: GenerateIndexUseCaseDeps);
    execute(request: GenerateIndexRequest): Promise<GenerateIndexResult>;
    private hashContent;
    private emitEvent;
    private applySummaries;
}
//# sourceMappingURL=generate-index.d.ts.map