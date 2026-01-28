import type { LanguageModel } from "ai";
import type { DocumentParserPort, CachePort, SSEEmitterPort, GenerateKnowledgeBaseRequest, GenerateKnowledgeBaseResult } from "../ports/index.js";
interface GenerateKnowledgeBaseUseCaseDeps {
    parser: DocumentParserPort;
    cache: CachePort;
    sseEmitter: SSEEmitterPort;
    model: LanguageModel;
}
export declare class GenerateKnowledgeBaseUseCase {
    private deps;
    constructor(deps: GenerateKnowledgeBaseUseCaseDeps);
    execute(request: GenerateKnowledgeBaseRequest): Promise<GenerateKnowledgeBaseResult>;
    private emit;
    private generateHash;
    private createSimpleTree;
    private extractKeyInsights;
    private convertToKnowledgeNode;
}
export {};
//# sourceMappingURL=generate-knowledge-base.d.ts.map