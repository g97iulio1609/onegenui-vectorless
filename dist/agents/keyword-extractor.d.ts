import { type LanguageModel } from "ai";
import type { KeywordExtractorPort, Page } from "../ports/index.js";
import type { TreeNode, SSEEvent, Keyword } from "../domain/schemas.js";
export declare class KeywordExtractorAgent implements KeywordExtractorPort {
    private model;
    constructor(model: LanguageModel);
    extractKeywords(pages: Page[], tree: TreeNode): AsyncGenerator<{
        event: SSEEvent;
        keyword?: Keyword;
    }>;
    private collectNodeTexts;
}
//# sourceMappingURL=keyword-extractor.d.ts.map