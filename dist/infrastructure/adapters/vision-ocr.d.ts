/**
 * Vision OCR Adapter using AI multimodal models
 * Extracts text from images using AI vision capabilities
 */
import type { LanguageModel } from "ai";
import type { OcrParserPort, Page } from "../../ports/index.js";
export declare class VisionOcrAdapter implements OcrParserPort {
    private model;
    constructor(model: LanguageModel);
    extractText(image: ArrayBuffer): Promise<string>;
    extractPages(images: ArrayBuffer[]): Promise<Page[]>;
    private detectMimeType;
}
//# sourceMappingURL=vision-ocr.d.ts.map