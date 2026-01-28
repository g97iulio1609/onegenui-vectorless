import { type LanguageModel } from "ai";
import type { CitationResolverPort, Page } from "../ports/index.js";
import type { TreeNode, SSEEvent, Citation } from "../domain/schemas.js";
export declare class CitationResolverAgent implements CitationResolverPort {
    private model;
    constructor(model: LanguageModel);
    resolveCitations(pages: Page[], tree: TreeNode): AsyncGenerator<{
        event: SSEEvent;
        citation?: Citation;
    }>;
    private collectNodeTexts;
}
//# sourceMappingURL=citation-resolver.d.ts.map