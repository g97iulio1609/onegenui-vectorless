import type { LanguageModel } from "ai";
import { type DocumentKnowledgeBase, type SSEEvent, type UserPreference, type AggregatedResult, type MultiDocSearchOptions } from "vectorless";
export interface MultiDocSearchState {
    isSearching: boolean;
    events: SSEEvent[];
    result: AggregatedResult | null;
    error: Error | null;
    progress: {
        phase: string;
        documentsSearched: number;
        totalDocuments: number;
    };
}
export declare function useMultiDocSearch(model: LanguageModel): {
    search: (query: string, knowledgeBases: DocumentKnowledgeBase[], options?: MultiDocSearchOptions, preferences?: UserPreference) => Promise<void>;
    cancel: () => void;
    reset: () => void;
    isSearching: boolean;
    events: SSEEvent[];
    result: AggregatedResult | null;
    error: Error | null;
    progress: {
        phase: string;
        documentsSearched: number;
        totalDocuments: number;
    };
};
//# sourceMappingURL=useMultiDocSearch.d.ts.map