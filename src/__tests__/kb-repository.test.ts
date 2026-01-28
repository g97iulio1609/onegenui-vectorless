import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryKnowledgeBaseRepository } from "../infrastructure/adapters/memory-kb-repository.js";
import type { DocumentKnowledgeBase } from "../domain/schemas.js";

const createMockKnowledgeBase = (id: string): DocumentKnowledgeBase => ({
  id,
  filename: `document-${id}.pdf`,
  mimeType: "application/pdf",
  hash: `hash-${id}`,
  processedAt: new Date().toISOString(),
  totalPages: 10,
  totalTokens: 5000,
  tree: {
    id: "root",
    title: "Document",
    level: 0,
    pageStart: 1,
    pageEnd: 10,
    summary: "A test document",
    keyPoints: [],
    entities: [],
    keywords: [],
    quotes: [],
    internalRefs: [],
    externalRefs: [],
    children: [],
  },
  entities: [],
  relations: [],
  keywords: [],
  quotes: [],
  citations: [],
  metrics: {
    totalWords: 1000,
    totalCharacters: 5000,
    averageWordsPerPage: 100,
    readingTimeMinutes: 5,
    complexityScore: 50,
    vocabularyRichness: 0.6,
    sentenceCount: 50,
    averageSentenceLength: 20,
    paragraphCount: 10,
  },
  description: "A test document for unit testing",
  keyInsights: ["Insight 1", "Insight 2"],
});

describe("MemoryKnowledgeBaseRepository", () => {
  let repository: MemoryKnowledgeBaseRepository;

  beforeEach(() => {
    repository = new MemoryKnowledgeBaseRepository();
  });

  describe("save/findById", () => {
    it("should save and retrieve a knowledge base", async () => {
      const kb = createMockKnowledgeBase("kb-1");
      await repository.save(kb);

      const result = await repository.findById("kb-1");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("kb-1");
      expect(result?.filename).toBe("document-kb-1.pdf");
    });

    it("should return null for non-existent id", async () => {
      const result = await repository.findById("non-existent");
      expect(result).toBeNull();
    });

    it("should overwrite existing knowledge base", async () => {
      const kb1 = createMockKnowledgeBase("kb-1");
      await repository.save(kb1);

      const kb2 = { ...kb1, description: "Updated description" };
      await repository.save(kb2);

      const result = await repository.findById("kb-1");
      expect(result?.description).toBe("Updated description");
    });
  });

  describe("findByHash", () => {
    it("should retrieve knowledge base by hash", async () => {
      const kb = createMockKnowledgeBase("kb-1");
      await repository.save(kb);

      const result = await repository.findByHash("hash-kb-1");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("kb-1");
    });

    it("should return null for non-existent hash", async () => {
      const result = await repository.findByHash("missing-hash");
      expect(result).toBeNull();
    });
  });

  describe("list", () => {
    it("should return empty array when no items", async () => {
      const result = await repository.list();
      expect(result).toEqual([]);
    });

    it("should return all knowledge bases", async () => {
      await repository.save(createMockKnowledgeBase("kb-1"));
      await repository.save(createMockKnowledgeBase("kb-2"));
      await repository.save(createMockKnowledgeBase("kb-3"));

      const result = await repository.list();
      expect(result).toHaveLength(3);
      expect(result.map((kb) => kb.id).sort()).toEqual([
        "kb-1",
        "kb-2",
        "kb-3",
      ]);
    });
  });

  describe("delete", () => {
    it("should remove knowledge base", async () => {
      const kb = createMockKnowledgeBase("kb-1");
      await repository.save(kb);
      expect(await repository.findById("kb-1")).not.toBeNull();

      await repository.delete("kb-1");
      expect(await repository.findById("kb-1")).toBeNull();
    });

    it("should not throw for non-existent id", async () => {
      await expect(repository.delete("missing")).resolves.not.toThrow();
    });

    it("should also clear from hash index", async () => {
      const kb = createMockKnowledgeBase("kb-1");
      await repository.save(kb);

      await repository.delete("kb-1");
      expect(await repository.findByHash("hash-kb-1")).toBeNull();
    });
  });
});
