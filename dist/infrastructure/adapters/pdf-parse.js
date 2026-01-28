// @ts-expect-error pdf-parse doesn't have types
import pdf from "pdf-parse";
export class PdfParseAdapter {
    async extractPages(pdfBuffer) {
        const buffer = Buffer.from(pdfBuffer);
        // pdf-parse doesn't give us per-page content directly,
        // but we can use the render_page option to collect pages
        const pages = [];
        let currentPage = 0;
        const options = {
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
        await pdf(buffer, options);
        return pages;
    }
    async getTotalPages(pdfBuffer) {
        const buffer = Buffer.from(pdfBuffer);
        const data = await pdf(buffer);
        return data.numpages;
    }
}
//# sourceMappingURL=pdf-parse.js.map