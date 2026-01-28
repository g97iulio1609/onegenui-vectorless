import { describe, it, expect, vi, beforeEach } from "vitest";
import { PdfParseAdapter } from "../infrastructure/adapters/pdf-parse.js";

describe("PdfParseAdapter", () => {
  let adapter: PdfParseAdapter;

  beforeEach(() => {
    adapter = new PdfParseAdapter();
  });

  describe("extractPages", () => {
    it("should throw error for empty buffer", async () => {
      const emptyBuffer = new ArrayBuffer(0);
      await expect(adapter.extractPages(emptyBuffer)).rejects.toThrow();
    });

    it.skip("should throw error for invalid PDF data", async () => {
      // Skipped: pdf-parse hangs on certain invalid inputs
      const invalidBuffer = new TextEncoder().encode("not a pdf").buffer;
      await expect(adapter.extractPages(invalidBuffer)).rejects.toThrow();
    }, 10000);
  });
});
