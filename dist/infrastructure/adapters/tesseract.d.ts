/**
 * OCR Adapter using Tesseract.js
 * Extracts text from images (PNG, JPG, TIFF, etc.)
 */
import type { OcrParserPort, Page } from "../../ports/index.js";
export declare class TesseractOcrAdapter implements OcrParserPort {
    private language;
    constructor(language?: string);
    extractText(image: ArrayBuffer): Promise<string>;
    extractPages(images: ArrayBuffer[]): Promise<Page[]>;
}
//# sourceMappingURL=tesseract.d.ts.map