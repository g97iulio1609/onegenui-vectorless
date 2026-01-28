import mammoth from "mammoth";
import type { WordParserPort, Page } from "../../ports/index.js";

export class MammothAdapter implements WordParserPort {
  async extractPages(buffer: ArrayBuffer): Promise<Page[]> {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });

    const text = result.value;
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());

    // Word documents don't have natural page breaks, estimate ~500 words per page
    const wordsPerPage = 500;
    const words = text.split(/\s+/);
    const totalPages = Math.max(1, Math.ceil(words.length / wordsPerPage));

    const pages: Page[] = [];
    let currentPosition = 0;

    for (let i = 0; i < totalPages; i++) {
      const pageWords = words.slice(
        currentPosition,
        currentPosition + wordsPerPage,
      );
      pages.push({
        pageNumber: i + 1,
        content: pageWords.join(" "),
      });
      currentPosition += wordsPerPage;
    }

    return pages.length > 0 ? pages : [{ pageNumber: 1, content: text }];
  }
}
