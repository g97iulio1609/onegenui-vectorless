import type { KnowledgeBaseRepositoryPort } from "../../ports/index.js";
import type { DocumentKnowledgeBase } from "../../domain/schemas.js";
export declare class MemoryKnowledgeBaseRepository implements KnowledgeBaseRepositoryPort {
    private store;
    private hashIndex;
    save(kb: DocumentKnowledgeBase): Promise<void>;
    findById(id: string): Promise<DocumentKnowledgeBase | null>;
    findByHash(hash: string): Promise<DocumentKnowledgeBase | null>;
    delete(id: string): Promise<void>;
    list(): Promise<{
        id: string;
        filename: string;
        processedAt: string;
    }[]>;
}
//# sourceMappingURL=memory-kb-repository.d.ts.map