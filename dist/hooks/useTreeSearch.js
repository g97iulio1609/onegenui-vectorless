/**
 * useTreeSearch Hook
 *
 * React hook for tree search with streaming results.
 */
import { useState, useCallback, useRef } from "react";
import { createTreeSearchOrchestrator, } from "vectorless";
export function useTreeSearch(model, options) {
    const [state, setState] = useState({
        isSearching: false,
        events: [],
        result: null,
        error: null,
        progress: { phase: "idle", nodesVisited: 0 },
    });
    const abortRef = useRef(null);
    const orchestratorRef = useRef(null);
    if (!orchestratorRef.current) {
        orchestratorRef.current = createTreeSearchOrchestrator(model, {
            defaultAlgorithm: options?.defaultAlgorithm ?? "auto",
            searchOptions: options?.searchOptions,
        });
    }
    const search = useCallback(async (query, tree, searchOpts, preferences) => {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        setState({
            isSearching: true,
            events: [],
            result: null,
            error: null,
            progress: { phase: "starting", nodesVisited: 0 },
        });
        try {
            const events = [];
            for await (const { event, result } of orchestratorRef.current.search(query, tree, searchOpts, preferences)) {
                if (abortRef.current?.signal.aborted)
                    break;
                events.push(event);
                setState((prev) => ({
                    ...prev,
                    events: [...events],
                    progress: {
                        phase: event.type,
                        nodesVisited: event.data?.nodesVisited ??
                            prev.progress.nodesVisited,
                        algorithm: event.data?.algorithm ?? prev.progress.algorithm,
                    },
                    result: result ?? prev.result,
                }));
            }
            setState((prev) => ({
                ...prev,
                isSearching: false,
                progress: { ...prev.progress, phase: "completed" },
            }));
        }
        catch (err) {
            if (err.name !== "AbortError") {
                setState((prev) => ({
                    ...prev,
                    isSearching: false,
                    error: err instanceof Error ? err : new Error(String(err)),
                    progress: { ...prev.progress, phase: "error" },
                }));
            }
        }
    }, [model]);
    const cancel = useCallback(() => {
        abortRef.current?.abort();
        setState((prev) => ({
            ...prev,
            isSearching: false,
            progress: { ...prev.progress, phase: "cancelled" },
        }));
    }, []);
    const reset = useCallback(() => {
        abortRef.current?.abort();
        setState({
            isSearching: false,
            events: [],
            result: null,
            error: null,
            progress: { phase: "idle", nodesVisited: 0 },
        });
    }, []);
    return {
        ...state,
        search,
        cancel,
        reset,
    };
}
//# sourceMappingURL=useTreeSearch.js.map