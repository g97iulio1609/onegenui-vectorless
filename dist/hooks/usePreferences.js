/**
 * usePreferences Hook
 *
 * React hook for managing user preferences and domain templates.
 */
import { useState, useCallback, useEffect } from "react";
import { createMemoryPreferenceStore, } from "vectorless";
export function usePreferences(options) {
    const [store] = useState(() => options?.store ?? createMemoryPreferenceStore());
    const [state, setState] = useState({
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
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err : new Error(String(err)),
            }));
        }
    }, [store]);
    const loadPreference = useCallback(async (id) => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        try {
            const pref = await store.getPreference(id);
            setState((prev) => ({
                ...prev,
                currentPreference: pref,
                isLoading: false,
            }));
            return pref;
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err : new Error(String(err)),
            }));
            return null;
        }
    }, [store]);
    const savePreference = useCallback(async (preference) => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        try {
            await store.savePreference(preference);
            setState((prev) => ({
                ...prev,
                currentPreference: preference,
                isLoading: false,
            }));
        }
        catch (err) {
            setState((prev) => ({
                ...prev,
                isLoading: false,
                error: err instanceof Error ? err : new Error(String(err)),
            }));
        }
    }, [store]);
    const createFromTemplate = useCallback((templateId, userId) => {
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
    }, [options?.userId]);
    const getTemplate = useCallback(async (id) => {
        return store.getTemplate(id);
    }, [store]);
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
//# sourceMappingURL=usePreferences.js.map