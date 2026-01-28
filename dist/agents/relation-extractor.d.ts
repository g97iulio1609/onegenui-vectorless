import { type LanguageModel } from "ai";
import type { RelationExtractorPort } from "../ports/index.js";
import type { TreeNode, SSEEvent, Relation, Entity } from "../domain/schemas.js";
export declare class RelationExtractorAgent implements RelationExtractorPort {
    private model;
    constructor(model: LanguageModel);
    extractRelations(tree: TreeNode, entities: Entity[]): AsyncGenerator<{
        event: SSEEvent;
        relation?: Relation;
    }>;
    private flattenNodes;
}
//# sourceMappingURL=relation-extractor.d.ts.map