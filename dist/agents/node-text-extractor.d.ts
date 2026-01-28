import type { Page } from "../ports/index.js";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";
/**
 * Add text content from pages to each node.
 * Implements add_node_text from original PageIndex.
 */
export declare function addNodeText(tree: TreeNode, pages: Page[]): void;
/**
 * Remove text from structure (for when we only needed it temporarily for summarization).
 * Implements remove_structure_text from original PageIndex.
 */
export declare function removeNodeText(tree: TreeNode): void;
/**
 * Get text for a specific node without modifying the tree.
 */
export declare function getNodeText(node: TreeNode, pages: Page[]): string;
/**
 * Add text to nodes with streaming progress events.
 */
export declare function addNodeTextWithProgress(tree: TreeNode, pages: Page[]): AsyncGenerator<{
    event: SSEEvent;
    tree?: TreeNode;
}>;
/**
 * Validate and truncate physical indices that exceed document length.
 * Implements validate_and_truncate_physical_indices from original PageIndex.
 */
export declare function validateNodePageRanges(tree: TreeNode, totalPages: number): {
    truncated: number;
    invalidNodes: string[];
};
/**
 * Add a preface/introduction node if the first content doesn't start on page 1.
 * Implements add_preface_if_needed from original PageIndex.
 */
export declare function addPrefaceIfNeeded(tree: TreeNode): boolean;
//# sourceMappingURL=node-text-extractor.d.ts.map