// @ts-expect-error pdf-parse doesn't have types
import pdf from "pdf-parse";
import type { PdfParserPort, Page } from "../../ports/index.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_PAGES = 500;

/** Creates a promise that rejects after timeout */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export class PdfParseAdapter implements PdfParserPort {
  private timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  async extractPages(pdfBuffer: ArrayBuffer): Promise<Page[]> {
    // Validate input
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      throw new Error("PDF buffer is empty or invalid");
    }

    const buffer = Buffer.from(pdfBuffer);

    // pdf-parse doesn't give us per-page content directly,
    // but we can use the render_page option to collect pages
    const pages: Page[] = [];
    let currentPage = 0;

    const options = {
      max: MAX_PAGES,
      pagerender: (pageData: {
        getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
      }) => {
        return pageData.getTextContent().then((textContent) => {
          currentPage++;
          const text = textContent.items
            .map((item) => item.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          pages.push({
            pageNumber: currentPage,
            content: text,
          });

          return text;
        });
      },
    };

    try {
      await withTimeout(
        pdf(buffer, options),
        this.timeoutMs,
        `PDF parsing timed out after ${this.timeoutMs}ms`,
      );
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`PDF parsing failed: ${error.message}`);
      }
      throw new Error("PDF parsing failed: Unknown error");
    }

    return pages;
  }

  async getTotalPages(pdfBuffer: ArrayBuffer): Promise<number> {
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      throw new Error("PDF buffer is empty or invalid");
    }

    const buffer = Buffer.from(pdfBuffer);

    try {
      const data = await withTimeout(
        pdf(buffer, { max: 1 }),
        this.timeoutMs,
        `PDF page count timed out after ${this.timeoutMs}ms`,
      ) as { numpages: number };
      return data.numpages;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get PDF page count: ${error.message}`);
      }
      throw new Error("Failed to get PDF page count: Unknown error");
    }
  }
}
