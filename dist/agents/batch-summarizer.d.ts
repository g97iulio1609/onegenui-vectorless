/**
 * Batch Summarizer Agent
 *
 * Optimized summarizer that generates summaries for ALL nodes in a single LLM call,
 * reducing N calls to 1 call. For very large documents, chunks nodes into batches.
 *
 * Performance improvement: 90% reduction in LLM calls for summarization.
 */
import { type LanguageModel } from "ai";
import type { SummarizerPort } from "../ports/index.js";
export declare function createBatchSummarizerAgent(model: LanguageModel): SummarizerPort;
//# sourceMappingURL=batch-summarizer.d.ts.map