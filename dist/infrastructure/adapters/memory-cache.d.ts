import type { CachePort } from "../../ports/index.js";
export declare class MemoryCacheAdapter implements CachePort {
    private cache;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): void;
    size(): number;
}
//# sourceMappingURL=memory-cache.d.ts.map