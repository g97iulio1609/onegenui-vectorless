/**
 * PowerPoint Parser Adapter
 * Extracts text content from .pptx files using JSZip
 */
import type { PowerPointParserPort, Page } from "../../ports/index.js";
export declare class PptxParserAdapter implements PowerPointParserPort {
    extractPages(buffer: ArrayBuffer): Promise<Page[]>;
    private extractTextFromXml;
}
//# sourceMappingURL=pptx.d.ts.map