import { type LanguageModel } from "ai";
import type { Page } from "../ports/index.js";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";
export interface LargeNodeOptions {
    maxPagesPerNode: number;
    maxTokensPerNode: number;
    model: LanguageModel;
}
/**
 * Process a potentially large node, splitting it recursively if needed.
 * This is the TypeScript equivalent of process_large_node_recursively.
 */
export declare function processLargeNode(node: TreeNode, pages: Page[], options: LargeNodeOptions): AsyncGenerator<{
    event: SSEEvent;
    updatedNode?: TreeNode;
}>;
/**
 * Process all large nodes in the tree recursively.
 * Main entry point for large node processing.
 */
export declare function processLargeNodesInTree(tree: TreeNode, pages: Page[], options: Partial<LargeNodeOptions> & {
    model: LanguageModel;
}): AsyncGenerator<{
    event: SSEEvent;
    tree?: TreeNode;
}>;
//# sourceMappingURL=large-node-processor.d.ts.map