import type { DocumentParserPort, Page } from "../../ports/index.js";
import { PdfParseAdapter } from "./pdf-parse.js";
import { MammothAdapter } from "./mammoth.js";
import { XlsxAdapter } from "./xlsx.js";
import { MarkdownAdapter } from "./markdown.js";
import { PptxParserAdapter } from "./pptx.js";

const SUPPORTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/markdown",
  "text/plain",
] as const;

export class UnifiedDocumentParser implements DocumentParserPort {
  private pdfParser = new PdfParseAdapter();
  private wordParser = new MammothAdapter();
  private excelParser = new XlsxAdapter();
  private markdownParser = new MarkdownAdapter();
  private pptxParser = new PptxParserAdapter();

  async parse(buffer: ArrayBuffer, mimeType: string): Promise<Page[]> {
    switch (mimeType) {
      case "application/pdf":
        return this.pdfParser.extractPages(buffer);

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        return this.wordParser.extractPages(buffer);

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return this.excelParser.extractPages(buffer);

      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      case "application/vnd.ms-powerpoint":
        return this.pptxParser.extractPages(buffer);

      case "text/markdown":
      case "text/plain": {
        const decoder = new TextDecoder();
        const content = decoder.decode(buffer);
        return this.markdownParser.extractPages(content);
      }

      default:
        // Images are handled directly by multimodal AI models
        // No text extraction needed - pass image to model directly
        if (mimeType.startsWith("image/")) {
          return [
            { pageNumber: 1, content: "[Image - processed by AI vision]" },
          ];
        }
        throw new Error(`Unsupported MIME type: ${mimeType}`);
    }
  }

  getSupportedMimeTypes(): string[] {
    return [...SUPPORTED_MIME_TYPES];
  }
}
