/**
 * usePreferences Hook
 *
 * React hook for managing user preferences and domain templates.
 */
import { useState, useCallback, useEffect } from "react";
import {
  createMemoryPreferenceStore,
  type DomainTemplate,
  type UserPreference,
  type PreferenceStorePort,
} from "vectorless";

export interface PreferencesState {
  templates: DomainTemplate[];
  currentPreference: UserPreference | null;
  isLoading: boolean;
  error: Error | null;
}

export interface UsePreferencesOptions {
  store?: PreferenceStorePort;
  userId?: string;
  autoLoad?: boolean;
}

export function usePreferences(options?: UsePreferencesOptions) {
  const [store] = useState<PreferenceStorePort>(
    () => options?.store ?? createMemoryPreferenceStore(),
  );

  const [state, setState] = useState<PreferencesState>({
    templates: [],
    currentPreference: null,
    isLoading: false,
    error: null,
  });

  const loadTemplates = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const templates = await store.listTemplates();
      setState((prev) => ({ ...prev, templates, isLoading: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      }));
    }
  }, [store]);

  const loadPreference = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const pref = await store.getPreference(id);
        setState((prev) => ({
          ...prev,
          currentPreference: pref,
          isLoading: false,
        }));
        return pref;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
        return null;
      }
    },
    [store],
  );

  const savePreference = useCallback(
    async (preference: UserPreference) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        await store.savePreference(preference);
        setState((prev) => ({
          ...prev,
          currentPreference: preference,
          isLoading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      }
    },
    [store],
  );

  const createFromTemplate = useCallback(
    (templateId: string, userId?: string): UserPreference => {
      const now = new Date().toISOString();
      return {
        id: `pref-${Date.now()}`,
        userId: userId ?? options?.userId,
        templateId,
        customKeywords: [],
        customWeights: {},
        createdAt: now,
        updatedAt: now,
      };
    },
    [options?.userId],
  );

  const getTemplate = useCallback(
    async (id: string) => {
      return store.getTemplate(id);
    },
    [store],
  );

  useEffect(() => {
    if (options?.autoLoad !== false) {
      loadTemplates();
    }
  }, [loadTemplates, options?.autoLoad]);

  return {
    ...state,
    loadTemplates,
    loadPreference,
    savePreference,
    createFromTemplate,
    getTemplate,
  };
}
