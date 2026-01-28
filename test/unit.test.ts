/**
 * PageIndex v2 Unit Tests
 * Tests the core functionality without requiring LLM calls
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  TreeNodeSchema,
  TocEntrySchema,
  DocumentIndexSchema,
  SSEEventSchema,
} from "../src/domain/schemas.js";
import { MemoryCacheAdapter } from "../src/infrastructure/adapters/memory-cache.js";
import { SSEEmitterAdapter } from "../src/infrastructure/sse/emitter.js";
import type { Page } from "../src/ports/index.js";

describe("Domain Schemas", () => {
  describe("TreeNodeSchema", () => {
    it("should validate a valid tree node", () => {
      const node = {
        title: "Chapter 1",
        level: 1,
        pageStart: 1,
        pageEnd: 10,
      };
      const result = TreeNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
    });

    it("should validate nested children", () => {
      const node = {
        title: "Document",
        level: 0,
        pageStart: 1,
        pageEnd: 100,
        children: [
          {
            title: "Chapter 1",
            level: 1,
            pageStart: 1,
            pageEnd: 50,
          },
          {
            title: "Chapter 2",
            level: 1,
            pageStart: 51,
            pageEnd: 100,
          },
        ],
      };
      const result = TreeNodeSchema.safeParse(node);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.children).toHaveLength(2);
      }
    });

    it("should reject invalid level", () => {
      const node = {
        title: "Bad Node",
        level: -1,
        pageStart: 1,
        pageEnd: 10,
      };
      const result = TreeNodeSchema.safeParse(node);
      expect(result.success).toBe(false);
    });
  });

  describe("TocEntrySchema", () => {
    it("should validate a valid TOC entry", () => {
      const entry = {
        title: "Introduction",
        pageNumber: 5,
        level: 0,
      };
      const result = TocEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });
  });

  describe("SSEEventSchema", () => {
    it("should validate started event", () => {
      const event = {
        type: "started",
        timestamp: new Date().toISOString(),
        data: { step: "toc_detection" },
      };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should validate progress event", () => {
      const event = {
        type: "progress",
        timestamp: new Date().toISOString(),
        data: { step: "extraction", progress: 50 },
      };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it("should validate completed event", () => {
      const event = {
        type: "completed",
        timestamp: new Date().toISOString(),
        data: { documentId: "doc-123" },
      };
      const result = SSEEventSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });
});

describe("MemoryCacheAdapter", () => {
  let cache: MemoryCacheAdapter;

  beforeEach(() => {
    cache = new MemoryCacheAdapter();
  });

  it("should store and retrieve values", async () => {
    await cache.set("key1", { data: "test" });
    const result = await cache.get<{ data: string }>("key1");
    expect(result).toEqual({ data: "test" });
  });

  it("should return null for missing keys", async () => {
    const result = await cache.get("nonexistent");
    expect(result).toBeNull();
  });

  it("should check key existence", async () => {
    await cache.set("exists", "value");
    expect(await cache.has("exists")).toBe(true);
    expect(await cache.has("missing")).toBe(false);
  });

  it("should delete keys", async () => {
    await cache.set("toDelete", "value");
    expect(await cache.has("toDelete")).toBe(true);
    await cache.delete("toDelete");
    expect(await cache.has("toDelete")).toBe(false);
  });

  it("should handle TTL expiration", async () => {
    await cache.set("expiring", "value", 50); // 50ms TTL
    expect(await cache.get("expiring")).toBe("value");

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await cache.get("expiring")).toBeNull();
  });
});

describe("SSEEmitterAdapter", () => {
  it("should emit events", () => {
    const emitter = new SSEEmitterAdapter();

    emitter.emit({
      type: "started",
      timestamp: new Date().toISOString(),
      data: { test: true },
    });

    emitter.emit({
      type: "progress",
      timestamp: new Date().toISOString(),
      data: { step: 1 },
    });

    // Should not throw
    emitter.close();
  });

  it("should create readable stream", () => {
    const emitter = new SSEEmitterAdapter();
    const stream = emitter.getStream();

    expect(stream).toBeInstanceOf(ReadableStream);
  });
});

describe("Page Interface", () => {
  it("should correctly type page data", () => {
    const page: Page = {
      pageNumber: 1,
      content: "This is page content",
    };

    expect(page.pageNumber).toBe(1);
    expect(page.content).toBe("This is page content");
  });

  it("should support optional images", () => {
    const pageWithImages: Page = {
      pageNumber: 2,
      content: "Page with images",
      images: [new Uint8Array([1, 2, 3])],
    };

    expect(pageWithImages.images).toHaveLength(1);
  });
});
