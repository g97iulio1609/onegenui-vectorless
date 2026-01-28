import type { ExcelParserPort, Page } from "../../ports/index.js";
export declare class XlsxAdapter implements ExcelParserPort {
    extractPages(buffer: ArrayBuffer): Promise<Page[]>;
}
//# sourceMappingURL=xlsx.d.ts.map