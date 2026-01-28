/**
 * PowerPoint Parser Adapter
 * Extracts text content from .pptx files using JSZip
 */
export class PptxParserAdapter {
    async extractPages(buffer) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(buffer);
        const slides = [];
        const slideFiles = Object.keys(zip.files)
            .filter((f) => f.match(/ppt\/slides\/slide\d+\.xml$/))
            .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
            const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
            return numA - numB;
        });
        for (let i = 0; i < slideFiles.length; i++) {
            const slideFile = slideFiles[i];
            const file = zip.files[slideFile];
            if (!file)
                continue;
            const content = await file.async("string");
            const text = this.extractTextFromXml(content);
            slides.push({
                pageNumber: i + 1,
                content: text.trim(),
            });
        }
        return slides;
    }
    extractTextFromXml(xml) {
        // Extract text from <a:t> tags (PowerPoint text elements)
        const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        const texts = textMatches.map((match) => {
            const text = match.replace(/<[^>]+>/g, "");
            return text;
        });
        // Group by paragraphs (rough heuristic based on </a:p>)
        const paragraphs = [];
        let currentParagraph = "";
        for (const text of texts) {
            currentParagraph += text;
            if (text.endsWith(".") || text.endsWith("?") || text.endsWith("!")) {
                paragraphs.push(currentParagraph.trim());
                currentParagraph = "";
            }
        }
        if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
        }
        return paragraphs.join("\n");
    }
}
//# sourceMappingURL=pptx.js.map