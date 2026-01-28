import { type LanguageModel } from "ai";
import type { Page } from "../../ports/index.js";
import type { TreeNode, SSEEvent } from "../../domain/schemas.js";
import type { VerificationResult } from "./types";
/**
 * Fix incorrect node page indices by searching in a range.
 */
export declare function fixNodePageIndex(model: LanguageModel, title: string, pages: Page[], searchRange: {
    start: number;
    end: number;
}): Promise<{
    pageNumber: number;
    confidence: number;
} | null>;
/**
 * Fix all incorrect nodes with automatic retry.
 */
export declare function fixIncorrectNodes(model: LanguageModel, tree: TreeNode, incorrectNodes: VerificationResult[], pages: Page[], options?: {
    maxRetries?: number;
    verifyAfterFix?: boolean;
}): AsyncGenerator<{
    event: SSEEvent;
    fixedNode?: {
        nodeId: string;
        oldPage: number;
        newPage: number;
    };
    summary?: {
        fixed: number;
        stillIncorrect: number;
        attempts: number;
    };
}>;
//# sourceMappingURL=fix-nodes.d.ts.map