export class MemoryCacheAdapter {
    cache = new Map();
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    async set(key, value, ttlMs) {
        this.cache.set(key, {
            value,
            expiresAt: ttlMs ? Date.now() + ttlMs : null,
        });
    }
    async delete(key) {
        this.cache.delete(key);
    }
    async has(key) {
        const value = await this.get(key);
        return value !== null;
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
//# sourceMappingURL=memory-cache.js.map