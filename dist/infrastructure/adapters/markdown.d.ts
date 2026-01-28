import type { MarkdownParserPort, Page } from "../../ports/index.js";
export declare class MarkdownAdapter implements MarkdownParserPort {
    extractPages(content: string): Promise<Page[]>;
    toHtml(content: string): Promise<string>;
}
//# sourceMappingURL=markdown.d.ts.map