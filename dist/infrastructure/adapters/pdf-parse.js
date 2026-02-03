// @ts-expect-error pdf-parse doesn't have types
import pdf from "pdf-parse";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_PAGES = 500;
/** Creates a promise that rejects after timeout */
function withTimeout(promise, timeoutMs, message) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timeoutId);
    });
}
export class PdfParseAdapter {
    timeoutMs;
    constructor(timeoutMs = DEFAULT_TIMEOUT_MS) {
        this.timeoutMs = timeoutMs;
    }
    async extractPages(pdfBuffer) {
        // Validate input
        if (!pdfBuffer || pdfBuffer.byteLength === 0) {
            throw new Error("PDF buffer is empty or invalid");
        }
        const buffer = Buffer.from(pdfBuffer);
        // pdf-parse doesn't give us per-page content directly,
        // but we can use the render_page option to collect pages
        const pages = [];
        let currentPage = 0;
        const options = {
            max: MAX_PAGES,
            pagerender: (pageData) => {
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
            await withTimeout(pdf(buffer, options), this.timeoutMs, `PDF parsing timed out after ${this.timeoutMs}ms`);
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`PDF parsing failed: ${error.message}`);
            }
            throw new Error("PDF parsing failed: Unknown error");
        }
        return pages;
    }
    async getTotalPages(pdfBuffer) {
        if (!pdfBuffer || pdfBuffer.byteLength === 0) {
            throw new Error("PDF buffer is empty or invalid");
        }
        const buffer = Buffer.from(pdfBuffer);
        try {
            const data = await withTimeout(pdf(buffer, { max: 1 }), this.timeoutMs, `PDF page count timed out after ${this.timeoutMs}ms`);
            return data.numpages;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get PDF page count: ${error.message}`);
            }
            throw new Error("Failed to get PDF page count: Unknown error");
        }
    }
}
//# sourceMappingURL=pdf-parse.js.map