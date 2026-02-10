/**
 * Type declarations for pdf-parse
 * @see https://www.npmjs.com/package/pdf-parse
 */
declare module "pdf-parse" {
  interface PdfParseOptions {
    /** Max number of pages to parse */
    max?: number;
    /** Custom page render function */
    pagerender?: (pageData: PdfPageData) => Promise<string> | string;
    /** PDF.js version */
    version?: string;
  }

  interface PdfPageData {
    getTextContent: () => Promise<PdfTextContent>;
  }

  interface PdfTextContent {
    items: PdfTextItem[];
  }

  interface PdfTextItem {
    str: string;
    dir?: string;
    width?: number;
    height?: number;
    transform?: number[];
  }

  interface PdfParseResult {
    /** Number of pages */
    numpages: number;
    /** Number of rendered pages */
    numrender: number;
    /** PDF info */
    info: Record<string, unknown>;
    /** PDF metadata */
    metadata: Record<string, unknown> | null;
    /** PDF version */
    version: string;
    /** Full text content */
    text: string;
  }

  function pdfParse(
    dataBuffer: Buffer | ArrayBuffer,
    options?: PdfParseOptions,
  ): Promise<PdfParseResult>;

  export = pdfParse;
}
