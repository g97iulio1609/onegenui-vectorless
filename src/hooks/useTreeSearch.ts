/**
 * useTreeSearch Hook
 *
 * React hook for tree search with streaming results.
 */
import { useState, useCallback, useRef } from "react";
import type { LanguageModel } from "ai";
import {
  createTreeSearchOrchestrator,
  type TreeSearchResult,
  type TreeSearchOptions,
  type KnowledgeNode,
  type SSEEvent,
  type UserPreference,
} from "vectorless";

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

export function useTreeSearch(
  model: LanguageModel,
  options?: UseTreeSearchOptions,
) {
  const [state, setState] = useState<TreeSearchState>({
    isSearching: false,
    events: [],
    result: null,
    error: null,
    progress: { phase: "idle", nodesVisited: 0 },
  });

  const abortRef = useRef<AbortController | null>(null);
  const orchestratorRef = useRef<ReturnType<
    typeof createTreeSearchOrchestrator
  > | null>(null);

  if (!orchestratorRef.current) {
    orchestratorRef.current = createTreeSearchOrchestrator(model, {
      defaultAlgorithm: options?.defaultAlgorithm ?? "auto",
      searchOptions: options?.searchOptions,
    });
  }

  const search = useCallback(
    async (
      query: string,
      tree: KnowledgeNode,
      searchOpts?: TreeSearchOptions,
      preferences?: UserPreference,
    ) => {
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
        const events: SSEEvent[] = [];

        for await (const { event, result } of orchestratorRef.current!.search(
          query,
          tree,
          searchOpts,
          preferences,
        )) {
          if (abortRef.current?.signal.aborted) break;

          events.push(event);

          setState((prev) => ({
            ...prev,
            events: [...events],
            progress: {
              phase: event.type,
              nodesVisited:
                (event.data?.nodesVisited as number) ??
                prev.progress.nodesVisited,
              algorithm:
                (event.data?.algorithm as string) ?? prev.progress.algorithm,
            },
            result: result ?? prev.result,
          }));
        }

        setState((prev) => ({
          ...prev,
          isSearching: false,
          progress: { ...prev.progress, phase: "completed" },
        }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setState((prev) => ({
            ...prev,
            isSearching: false,
            error: err instanceof Error ? err : new Error(String(err)),
            progress: { ...prev.progress, phase: "error" },
          }));
        }
      }
    },
    [model],
  );

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
