/**
 * useMultiDocSearch Hook
 *
 * React hook for multi-document search with aggregated results.
 */
import { useState, useCallback, useRef } from "react";
import type { LanguageModel } from "ai";
import {
  createMultiDocSearchAgent,
  type DocumentKnowledgeBase,
  type SSEEvent,
  type UserPreference,
  type AggregatedResult,
  type MultiDocSearchOptions,
} from "vectorless";

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

export function useMultiDocSearch(model: LanguageModel) {
  const [state, setState] = useState<MultiDocSearchState>({
    isSearching: false,
    events: [],
    result: null,
    error: null,
    progress: { phase: "idle", documentsSearched: 0, totalDocuments: 0 },
  });

  const abortRef = useRef<AbortController | null>(null);
  const agentRef = useRef<ReturnType<typeof createMultiDocSearchAgent> | null>(
    null,
  );

  if (!agentRef.current) {
    agentRef.current = createMultiDocSearchAgent(model);
  }

  const search = useCallback(
    async (
      query: string,
      knowledgeBases: DocumentKnowledgeBase[],
      options?: MultiDocSearchOptions,
      preferences?: UserPreference,
    ) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState({
        isSearching: true,
        events: [],
        result: null,
        error: null,
        progress: {
          phase: "starting",
          documentsSearched: 0,
          totalDocuments: knowledgeBases.length,
        },
      });

      try {
        const events: SSEEvent[] = [];
        let docsSearched = 0;

        for await (const { event, result } of agentRef.current!.searchAcross(
          query,
          knowledgeBases,
          options,
          preferences,
        )) {
          if (abortRef.current?.signal.aborted) break;

          events.push(event);

          if (
            event.type === "progress" &&
            event.data?.phase === "document_complete"
          ) {
            docsSearched++;
          }

          setState((prev) => ({
            ...prev,
            events: [...events],
            progress: {
              phase: event.type,
              documentsSearched: docsSearched,
              totalDocuments: knowledgeBases.length,
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
      progress: { phase: "idle", documentsSearched: 0, totalDocuments: 0 },
    });
  }, []);

  return {
    ...state,
    search,
    cancel,
    reset,
  };
}
