import type { DocumentParserPort, Page } from "../../ports/index.js";
export declare class UnifiedDocumentParser implements DocumentParserPort {
    private pdfParser;
    private wordParser;
    private excelParser;
    private markdownParser;
    private pptxParser;
    parse(buffer: ArrayBuffer, mimeType: string): Promise<Page[]>;
    getSupportedMimeTypes(): string[];
}
//# sourceMappingURL=unified-parser.d.ts.map