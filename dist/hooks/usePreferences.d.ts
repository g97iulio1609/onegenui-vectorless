import { type DomainTemplate, type UserPreference, type PreferenceStorePort } from "vectorless";
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
export declare function usePreferences(options?: UsePreferencesOptions): {
    loadTemplates: () => Promise<void>;
    loadPreference: (id: string) => Promise<UserPreference | null>;
    savePreference: (preference: UserPreference) => Promise<void>;
    createFromTemplate: (templateId: string, userId?: string) => UserPreference;
    getTemplate: (id: string) => Promise<DomainTemplate | null>;
    templates: DomainTemplate[];
    currentPreference: UserPreference | null;
    isLoading: boolean;
    error: Error | null;
};
//# sourceMappingURL=usePreferences.d.ts.map