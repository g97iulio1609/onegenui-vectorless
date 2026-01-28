import type { WordParserPort, Page } from "../../ports/index.js";
export declare class MammothAdapter implements WordParserPort {
    extractPages(buffer: ArrayBuffer): Promise<Page[]>;
}
//# sourceMappingURL=mammoth.d.ts.map