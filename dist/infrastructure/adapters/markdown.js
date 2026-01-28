import { marked } from "marked";
export class MarkdownAdapter {
    async extractPages(content) {
        // Split by heading sections for page-like structure
        const sections = content.split(/(?=^#{1,2}\s)/m).filter((s) => s.trim());
        if (sections.length === 0) {
            return [{ pageNumber: 1, content }];
        }
        // Group small sections, target ~500 words per page
        const pages = [];
        let currentContent = "";
        let currentWordCount = 0;
        const wordsPerPage = 500;
        for (const section of sections) {
            const sectionWords = section.split(/\s+/).length;
            if (currentWordCount + sectionWords > wordsPerPage && currentContent) {
                pages.push({
                    pageNumber: pages.length + 1,
                    content: currentContent.trim(),
                });
                currentContent = section;
                currentWordCount = sectionWords;
            }
            else {
                currentContent += "\n\n" + section;
                currentWordCount += sectionWords;
            }
        }
        if (currentContent.trim()) {
            pages.push({
                pageNumber: pages.length + 1,
                content: currentContent.trim(),
            });
        }
        return pages;
    }
    async toHtml(content) {
        return await marked(content);
    }
}
//# sourceMappingURL=markdown.js.map