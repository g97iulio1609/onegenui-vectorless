/**
 * Agentic Retrieval Agent
 *
 * Implements the PageIndex agentic retrieval pattern:
 * 1. Agent sees document structure (tree)
 * 2. Agent decides which sections/pages to read
 * 3. Agent reads content on demand
 * 4. Agent generates answer with citations
 *
 * Uses ToolLoopAgent with tools:
 * - get_structure: View document tree structure
 * - read_section: Read content from a specific section (node)
 * - read_pages: Read content from specific pages (if pages provided)
 */
import { type LanguageModel } from "ai";
import type { Page } from "../ports/index.js";
import type { TreeNode, SSEEvent } from "../domain/schemas.js";
export interface AgenticRetrievalResult {
    answer: string;
    citations: Citation[];
    thinking: string;
    sectionsRead: string[];
    pagesRead: number[];
}
export interface Citation {
    id: number;
    pageNumber: number;
    excerpt: string;
    nodeTitle?: string;
}
export interface AgenticRetrievalOptions {
    maxSections?: number;
    maxPages?: number;
    maxSteps?: number;
    expertPreferences?: string;
}
export declare function agenticRetrieval(model: LanguageModel, query: string, tree: TreeNode, pages?: Page[], options?: AgenticRetrievalOptions): AsyncGenerator<{
    event: SSEEvent;
    result?: AgenticRetrievalResult;
}>;
//# sourceMappingURL=agentic-retrieval.d.ts.map