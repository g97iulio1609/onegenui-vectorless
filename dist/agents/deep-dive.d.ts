import { type LanguageModel } from "ai";
import type { DeepDivePort, Page } from "../ports/index.js";
import type { DocumentKnowledgeBase, SSEEvent, KnowledgeNode } from "../domain/schemas.js";
export declare class DeepDiveAgent implements DeepDivePort {
    private model;
    constructor(model: LanguageModel);
    deepDive(nodeId: string, knowledgeBase: DocumentKnowledgeBase, pages: Page[]): AsyncGenerator<{
        event: SSEEvent;
        node?: KnowledgeNode;
    }>;
    private findNode;
}
//# sourceMappingURL=deep-dive.d.ts.map