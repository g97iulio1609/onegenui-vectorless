import { type LanguageModel } from "ai";
import type { QuoteExtractorPort, Page } from "../ports/index.js";
import type { TreeNode, SSEEvent, Quote } from "../domain/schemas.js";
export declare class QuoteExtractorAgent implements QuoteExtractorPort {
    private model;
    constructor(model: LanguageModel);
    extractQuotes(pages: Page[], tree: TreeNode): AsyncGenerator<{
        event: SSEEvent;
        quote?: Quote;
    }>;
    private collectNodeTexts;
}
//# sourceMappingURL=quote-extractor.d.ts.map