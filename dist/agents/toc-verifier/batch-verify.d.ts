/**
 * Batch TOC Verifier
 *
 * Verifies multiple TOC entries in a single LLM call for efficiency.
 * Reduces N verification calls to 1 call.
 */
import { type LanguageModel } from "ai";
export interface VerifyRequest {
    title: string;
    pageContent: string;
    pageNumber: number;
}
export interface BatchVerifyResult {
    appears: boolean;
    confidence: number;
    pageNumber: number;
    title: string;
}
/**
 * Verify multiple TOC entries in a single LLM call.
 * Much more efficient than individual calls.
 */
export declare function batchVerifyTitlesOnPages(model: LanguageModel, requests: VerifyRequest[]): Promise<BatchVerifyResult[]>;
/**
 * Batch verify if titles start at the beginning of pages.
 */
export declare function batchVerifyTitlesAtStart(model: LanguageModel, requests: VerifyRequest[]): Promise<Map<number, boolean>>;
//# sourceMappingURL=batch-verify.d.ts.map