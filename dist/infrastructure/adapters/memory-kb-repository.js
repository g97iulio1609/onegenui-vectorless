export class MemoryKnowledgeBaseRepository {
    store = new Map();
    hashIndex = new Map();
    async save(kb) {
        this.store.set(kb.id, kb);
        this.hashIndex.set(kb.hash, kb.id);
    }
    async findById(id) {
        return this.store.get(id) || null;
    }
    async findByHash(hash) {
        const id = this.hashIndex.get(hash);
        if (!id)
            return null;
        return this.store.get(id) || null;
    }
    async delete(id) {
        const kb = this.store.get(id);
        if (kb) {
            this.hashIndex.delete(kb.hash);
            this.store.delete(id);
        }
    }
    async list() {
        return Array.from(this.store.values()).map((kb) => ({
            id: kb.id,
            filename: kb.filename,
            processedAt: kb.processedAt,
        }));
    }
}
//# sourceMappingURL=memory-kb-repository.js.map