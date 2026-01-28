import type { LanguageModel } from "ai";
import type { CachePort, KnowledgeBaseRepositoryPort, Page, DeepDiveRequest, DeepDiveResult } from "../ports/index.js";
interface DeepDiveUseCaseDeps {
    cache: CachePort;
    kbRepository: KnowledgeBaseRepositoryPort;
    model: LanguageModel;
    getPages: (kbId: string) => Promise<Page[]>;
}
export declare class DeepDiveUseCase {
    private deps;
    constructor(deps: DeepDiveUseCaseDeps);
    execute(request: DeepDiveRequest): Promise<DeepDiveResult>;
}
export {};
//# sourceMappingURL=deep-dive.d.ts.map