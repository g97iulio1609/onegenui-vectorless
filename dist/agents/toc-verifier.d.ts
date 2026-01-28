import { type LanguageModel } from "ai";
import type { Page } from "../ports/index.js";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";
import { type VerificationResult } from "./toc-verifier/index.js";
export { verifyTitleOnPage, verifyTitleAtPageStart, } from "./toc-verifier/index.js";
export { batchVerifyTitlesOnPages, batchVerifyTitlesAtStart, } from "./toc-verifier/index.js";
export { fixNodePageIndex, fixIncorrectNodes } from "./toc-verifier/index.js";
export type { VerificationResult } from "./toc-verifier/index.js";
/**
 * Verify all nodes in the tree structure against actual page content.
 * OPTIMIZED: Uses batch verification (1 LLM call instead of N calls).
 */
export declare function verifyTreeStructure(model: LanguageModel, tree: TreeNode, pages: Page[], options?: {
    sampleSize?: number;
    checkPageStart?: boolean;
}): AsyncGenerator<{
    event: SSEEvent;
    result?: VerificationResult;
    summary?: {
        accuracy: number;
        verified: number;
        failed: number;
        incorrectNodes: VerificationResult[];
    };
}>;
//# sourceMappingURL=toc-verifier.d.ts.map