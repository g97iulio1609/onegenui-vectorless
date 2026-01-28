import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryCacheAdapter } from "../infrastructure/adapters/memory-cache.js";

describe("MemoryCacheAdapter", () => {
  let cache: MemoryCacheAdapter;

  beforeEach(() => {
    cache = new MemoryCacheAdapter();
  });

  describe("get/set", () => {
    it("should return null for non-existent key", async () => {
      const result = await cache.get("non-existent");
      expect(result).toBeNull();
    });

    it("should store and retrieve values", async () => {
      const value = { test: "data", nested: { value: 123 } };
      await cache.set("test-key", value);
      const result = await cache.get("test-key");
      expect(result).toEqual(value);
    });

    it("should handle multiple keys", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");

      expect(await cache.get("key1")).toBe("value1");
      expect(await cache.get("key2")).toBe("value2");
      expect(await cache.get("key3")).toBe("value3");
    });

    it("should overwrite existing values", async () => {
      await cache.set("key", "original");
      await cache.set("key", "updated");
      expect(await cache.get("key")).toBe("updated");
    });
  });

  describe("has", () => {
    it("should return false for non-existent key", async () => {
      const result = await cache.has("missing");
      expect(result).toBe(false);
    });

    it("should return true for existing key", async () => {
      await cache.set("exists", "value");
      const result = await cache.has("exists");
      expect(result).toBe(true);
    });
  });

  describe("delete", () => {
    it("should remove existing key", async () => {
      await cache.set("to-delete", "value");
      expect(await cache.has("to-delete")).toBe(true);

      await cache.delete("to-delete");
      expect(await cache.has("to-delete")).toBe(false);
      expect(await cache.get("to-delete")).toBeNull();
    });

    it("should not throw for non-existent key", async () => {
      await expect(cache.delete("missing")).resolves.not.toThrow();
    });
  });

  describe("clear", () => {
    it("should remove all entries", async () => {
      await cache.set("key1", "value1");
      await cache.set("key2", "value2");
      await cache.set("key3", "value3");

      await cache.clear();

      expect(await cache.has("key1")).toBe(false);
      expect(await cache.has("key2")).toBe(false);
      expect(await cache.has("key3")).toBe(false);
    });
  });

  describe("complex values", () => {
    it("should handle arrays", async () => {
      const arr = [1, 2, 3, { nested: true }];
      await cache.set("array", arr);
      expect(await cache.get("array")).toEqual(arr);
    });

    it("should handle deeply nested objects", async () => {
      const deep = {
        level1: {
          level2: {
            level3: {
              value: "deep",
            },
          },
        },
      };
      await cache.set("deep", deep);
      expect(await cache.get("deep")).toEqual(deep);
    });
  });
});
