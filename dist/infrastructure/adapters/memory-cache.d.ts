import type { CachePort } from "../../ports/index.js";
export declare class MemoryCacheAdapter implements CachePort {
    private cache;
    private maxSize;
    private cleanupTimer;
    constructor(maxSize?: number);
    private startCleanupTimer;
    /** Remove expired entries */
    private evictExpired;
    /** Evict least recently accessed entries when at capacity */
    private evictLRU;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): void;
    size(): number;
    /** Stop cleanup timer (call on shutdown) */
    dispose(): void;
}
//# sourceMappingURL=memory-cache.d.ts.map