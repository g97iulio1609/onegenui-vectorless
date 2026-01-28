import type { KnowledgeBaseRepositoryPort } from "../../ports/index.js";
import type { DocumentKnowledgeBase } from "../../domain/schemas.js";

export class MemoryKnowledgeBaseRepository implements KnowledgeBaseRepositoryPort {
  private store = new Map<string, DocumentKnowledgeBase>();
  private hashIndex = new Map<string, string>();

  async save(kb: DocumentKnowledgeBase): Promise<void> {
    this.store.set(kb.id, kb);
    this.hashIndex.set(kb.hash, kb.id);
  }

  async findById(id: string): Promise<DocumentKnowledgeBase | null> {
    return this.store.get(id) || null;
  }

  async findByHash(hash: string): Promise<DocumentKnowledgeBase | null> {
    const id = this.hashIndex.get(hash);
    if (!id) return null;
    return this.store.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    const kb = this.store.get(id);
    if (kb) {
      this.hashIndex.delete(kb.hash);
      this.store.delete(id);
    }
  }

  async list(): Promise<
    { id: string; filename: string; processedAt: string }[]
  > {
    return Array.from(this.store.values()).map((kb) => ({
      id: kb.id,
      filename: kb.filename,
      processedAt: kb.processedAt,
    }));
  }
}
