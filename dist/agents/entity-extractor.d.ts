import { type LanguageModel } from "ai";
import type { EntityExtractorPort, Page } from "../ports/index.js";
import type { TreeNode, SSEEvent, Entity } from "../domain/schemas.js";
export declare class EntityExtractorAgent implements EntityExtractorPort {
    private model;
    constructor(model: LanguageModel);
    extractEntities(pages: Page[], tree: TreeNode): AsyncGenerator<{
        event: SSEEvent;
        entity?: Entity;
    }>;
    private collectNodeTexts;
}
//# sourceMappingURL=entity-extractor.d.ts.map