/**
 * PostgreSQL Preference Store
 *
 * Production adapter for storing user preferences and domain templates.
 *
 * Schema:
 * ```sql
 * CREATE TABLE domain_templates (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   domain TEXT NOT NULL,
 *   priority_keywords JSONB NOT NULL,
 *   section_weights JSONB NOT NULL,
 *   entity_preferences JSONB NOT NULL,
 *   extraction_rules JSONB NOT NULL,
 *   system_prompt TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE TABLE user_preferences (
 *   id TEXT PRIMARY KEY,
 *   user_id TEXT,
 *   template_id TEXT REFERENCES domain_templates(id),
 *   custom_keywords JSONB NOT NULL,
 *   custom_weights JSONB NOT NULL,
 *   custom_instructions TEXT,
 *   created_at TIMESTAMPTZ NOT NULL,
 *   updated_at TIMESTAMPTZ NOT NULL
 * );
 *
 * CREATE INDEX idx_pref_user ON user_preferences(user_id);
 * CREATE INDEX idx_pref_template ON user_preferences(template_id);
 * ```
 */
import type { DomainTemplate, UserPreference, PreferenceStorePort } from "vectorless";
export interface PostgresClient {
    query<T = unknown>(sql: string, params?: unknown[]): Promise<{
        rows: T[];
    }>;
    end(): Promise<void>;
}
export declare class PostgresPreferenceStore implements PreferenceStorePort {
    private client;
    constructor(client: PostgresClient);
    getTemplate(id: string): Promise<DomainTemplate | null>;
    listTemplates(): Promise<DomainTemplate[]>;
    saveTemplate(template: DomainTemplate): Promise<void>;
    getPreference(id: string): Promise<UserPreference | null>;
    savePreference(preference: UserPreference): Promise<void>;
    deletePreference(id: string): Promise<void>;
    getPreferencesByUser(userId: string): Promise<UserPreference[]>;
    private rowToTemplate;
    private rowToPreference;
}
export declare const CREATE_PREFERENCE_TABLES_SQL = "\nCREATE TABLE IF NOT EXISTS domain_templates (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  domain TEXT NOT NULL,\n  priority_keywords JSONB NOT NULL,\n  section_weights JSONB NOT NULL,\n  entity_preferences JSONB NOT NULL,\n  extraction_rules JSONB NOT NULL,\n  system_prompt TEXT,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE TABLE IF NOT EXISTS user_preferences (\n  id TEXT PRIMARY KEY,\n  user_id TEXT,\n  template_id TEXT REFERENCES domain_templates(id),\n  custom_keywords JSONB NOT NULL,\n  custom_weights JSONB NOT NULL,\n  custom_instructions TEXT,\n  created_at TIMESTAMPTZ NOT NULL,\n  updated_at TIMESTAMPTZ NOT NULL\n);\n\nCREATE INDEX IF NOT EXISTS idx_pref_user ON user_preferences(user_id);\nCREATE INDEX IF NOT EXISTS idx_pref_template ON user_preferences(template_id);\n";
export declare function createPostgresPreferenceStore(client: PostgresClient): PostgresPreferenceStore;
//# sourceMappingURL=postgres-preference-store.d.ts.map