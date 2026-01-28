import { type LanguageModel } from "ai";
/**
 * Verify that a section title appears on the indicated page.
 */
export declare function verifyTitleOnPage(model: LanguageModel, title: string, pageContent: string): Promise<{
    appears: boolean;
    confidence: number;
}>;
/**
 * Check if a section starts at the beginning of a page.
 */
export declare function verifyTitleAtPageStart(model: LanguageModel, title: string, pageContent: string): Promise<boolean>;
//# sourceMappingURL=verify-title.d.ts.map