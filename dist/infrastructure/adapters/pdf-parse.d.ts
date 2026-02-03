import type { PdfParserPort, Page } from "../../ports/index.js";
export declare class PdfParseAdapter implements PdfParserPort {
    private timeoutMs;
    constructor(timeoutMs?: number);
    extractPages(pdfBuffer: ArrayBuffer): Promise<Page[]>;
    getTotalPages(pdfBuffer: ArrayBuffer): Promise<number>;
}
//# sourceMappingURL=pdf-parse.d.ts.map