import type { CachePort } from "../../ports/index.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
  lastAccessed: number;
}

const DEFAULT_MAX_SIZE = 1000;
const CLEANUP_INTERVAL_MS = 60_000; // 1 minute

export class MemoryCacheAdapter implements CachePort {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
    this.startCleanupTimer();
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.evictExpired();
    }, CLEANUP_INTERVAL_MS);
  }

  /** Remove expired entries */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /** Evict least recently accessed entries when at capacity */
  private evictLRU(): void {
    if (this.cache.size < this.maxSize) return;

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

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update last accessed for LRU
    entry.lastAccessed = Date.now();
    return entry.value;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
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

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  /** Stop cleanup timer (call on shutdown) */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}
