/**
 * OCR Adapter using Tesseract.js
 * Extracts text from images (PNG, JPG, TIFF, etc.)
 */
export class TesseractOcrAdapter {
    language;
    constructor(language = "eng") {
        this.language = language;
    }
    async extractText(image) {
        const Tesseract = await import("tesseract.js");
        const buffer = Buffer.from(image);
        const result = await Tesseract.recognize(buffer, this.language, {
            logger: () => { }, // Suppress logging
        });
        return result.data.text;
    }
    async extractPages(images) {
        const pages = [];
        for (let i = 0; i < images.length; i++) {
            const text = await this.extractText(images[i]);
            pages.push({
                pageNumber: i + 1,
                content: text,
            });
        }
        return pages;
    }
}
//# sourceMappingURL=tesseract.js.map