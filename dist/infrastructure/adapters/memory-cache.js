const DEFAULT_MAX_SIZE = 1000;
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute
export class MemoryCacheAdapter {
    cache = new Map();
    maxSize;
    cleanupTimer = null;
    constructor(maxSize = DEFAULT_MAX_SIZE) {
        this.maxSize = maxSize;
        this.startCleanupTimer();
    }
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.evictExpired();
        }, CLEANUP_INTERVAL_MS);
    }
    /** Remove expired entries */
    evictExpired() {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (entry.expiresAt && now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
    /** Evict least recently accessed entries when at capacity */
    evictLRU() {
        if (this.cache.size < this.maxSize)
            return;
        // Sort by lastAccessed and remove oldest 10%
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
        const toRemove = Math.max(1, Math.floor(this.cache.size * 0.1));
        for (let i = 0; i < toRemove && i < entries.length; i++) {
            const entry = entries[i];
            if (entry) {
                this.cache.delete(entry[0]);
            }
        }
    }
    async get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        // Update last accessed for LRU
        entry.lastAccessed = Date.now();
        return entry.value;
    }
    async set(key, value, ttlMs) {
        // Evict if at capacity
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        this.cache.set(key, {
            value,
            expiresAt: ttlMs ? Date.now() + ttlMs : null,
            lastAccessed: Date.now(),
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
    /** Stop cleanup timer (call on shutdown) */
    dispose() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.cache.clear();
    }
}
//# sourceMappingURL=memory-cache.js.map