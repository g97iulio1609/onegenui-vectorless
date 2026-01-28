/**
 * Vision OCR Adapter using AI multimodal models
 * Extracts text from images using AI vision capabilities
 */
import { generateText } from "ai";
export class VisionOcrAdapter {
    model;
    constructor(model) {
        this.model = model;
    }
    async extractText(image) {
        const base64 = Buffer.from(image).toString("base64");
        const mimeType = this.detectMimeType(image);
        const { text } = await generateText({
            model: this.model,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            image: `data:${mimeType};base64,${base64}`,
                        },
                        {
                            type: "text",
                            text: "Extract all text from this image. Return only the extracted text, preserving the original structure and formatting as much as possible. If there are tables, preserve their structure. If there are headings, preserve them.",
                        },
                    ],
                },
            ],
        });
        return text;
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
    detectMimeType(buffer) {
        const arr = new Uint8Array(buffer.slice(0, 4));
        const header = arr.reduce((acc, byte) => acc + byte.toString(16), "");
        if (header.startsWith("89504e47"))
            return "image/png";
        if (header.startsWith("ffd8ff"))
            return "image/jpeg";
        if (header.startsWith("47494638"))
            return "image/gif";
        if (header.startsWith("52494646"))
            return "image/webp";
        return "image/png"; // default
    }
}
//# sourceMappingURL=vision-ocr.js.map