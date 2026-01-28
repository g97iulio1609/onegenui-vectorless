import type { LanguageModel } from "ai";
import { type TreeSearchResult, type TreeSearchOptions, type KnowledgeNode, type SSEEvent, type UserPreference } from "vectorless";
export interface TreeSearchState {
    isSearching: boolean;
    events: SSEEvent[];
    result: TreeSearchResult | null;
    error: Error | null;
    progress: {
        phase: string;
        nodesVisited: number;
        algorithm?: string;
    };
}
export interface UseTreeSearchOptions {
    defaultAlgorithm?: "greedy" | "mcts" | "auto";
    searchOptions?: TreeSearchOptions;
}
export declare function useTreeSearch(model: LanguageModel, options?: UseTreeSearchOptions): {
    search: (query: string, tree: KnowledgeNode, searchOpts?: TreeSearchOptions, preferences?: UserPreference) => Promise<void>;
    cancel: () => void;
    reset: () => void;
    isSearching: boolean;
    events: SSEEvent[];
    result: TreeSearchResult | null;
    error: Error | null;
    progress: {
        phase: string;
        nodesVisited: number;
        algorithm?: string;
    };
};
//# sourceMappingURL=useTreeSearch.d.ts.map