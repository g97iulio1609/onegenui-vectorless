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

import type {
  DomainTemplate,
  UserPreference,
  PreferenceStorePort,
} from "vectorless";

export interface PostgresClient {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  end(): Promise<void>;
}

export class PostgresPreferenceStore implements PreferenceStorePort {
  constructor(private client: PostgresClient) {}

  async getTemplate(id: string): Promise<DomainTemplate | null> {
    const sql = `SELECT * FROM domain_templates WHERE id = $1`;
    const result = await this.client.query<TemplateRow>(sql, [id]);

    if (result.rows.length === 0) return null;
    return this.rowToTemplate(result.rows[0]!);
  }

  async listTemplates(): Promise<DomainTemplate[]> {
    const sql = `SELECT * FROM domain_templates ORDER BY name`;
    const result = await this.client.query<TemplateRow>(sql);
    return result.rows.map((row) => this.rowToTemplate(row));
  }

  async saveTemplate(template: DomainTemplate): Promise<void> {
    const sql = `
      INSERT INTO domain_templates (
        id, name, domain, priority_keywords, section_weights,
        entity_preferences, extraction_rules, system_prompt, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        domain = EXCLUDED.domain,
        priority_keywords = EXCLUDED.priority_keywords,
        section_weights = EXCLUDED.section_weights,
        entity_preferences = EXCLUDED.entity_preferences,
        extraction_rules = EXCLUDED.extraction_rules,
        system_prompt = EXCLUDED.system_prompt,
        updated_at = NOW()
    `;

    await this.client.query(sql, [
      template.id,
      template.name,
      template.domain,
      JSON.stringify(template.priorityKeywords),
      JSON.stringify(template.sectionWeights),
      JSON.stringify(template.entityPreferences),
      JSON.stringify(template.extractionRules),
      template.systemPrompt,
    ]);
  }

  async getPreference(id: string): Promise<UserPreference | null> {
    const sql = `SELECT * FROM user_preferences WHERE id = $1`;
    const result = await this.client.query<PreferenceRow>(sql, [id]);

    if (result.rows.length === 0) return null;
    return this.rowToPreference(result.rows[0]!);
  }

  async savePreference(preference: UserPreference): Promise<void> {
    const sql = `
      INSERT INTO user_preferences (
        id, user_id, template_id, custom_keywords, custom_weights,
        custom_instructions, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        template_id = EXCLUDED.template_id,
        custom_keywords = EXCLUDED.custom_keywords,
        custom_weights = EXCLUDED.custom_weights,
        custom_instructions = EXCLUDED.custom_instructions,
        updated_at = NOW()
    `;

    await this.client.query(sql, [
      preference.id,
      preference.userId,
      preference.templateId,
      JSON.stringify(preference.customKeywords),
      JSON.stringify(preference.customWeights),
      preference.customInstructions,
      preference.createdAt,
    ]);
  }

  async deletePreference(id: string): Promise<void> {
    const sql = `DELETE FROM user_preferences WHERE id = $1`;
    await this.client.query(sql, [id]);
  }

  async getPreferencesByUser(userId: string): Promise<UserPreference[]> {
    const sql = `SELECT * FROM user_preferences WHERE user_id = $1 ORDER BY updated_at DESC`;
    const result = await this.client.query<PreferenceRow>(sql, [userId]);
    return result.rows.map((row) => this.rowToPreference(row));
  }

  private rowToTemplate(row: TemplateRow): DomainTemplate {
    return {
      id: row.id,
      name: row.name,
      domain: row.domain as DomainTemplate["domain"],
      priorityKeywords: parseJson(row.priority_keywords),
      sectionWeights: parseJson(row.section_weights),
      entityPreferences: parseJson(row.entity_preferences),
      extractionRules: parseJson(row.extraction_rules),
      systemPrompt: row.system_prompt,
    };
  }

  private rowToPreference(row: PreferenceRow): UserPreference {
    return {
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      customKeywords: parseJson(row.custom_keywords),
      customWeights: parseJson(row.custom_weights),
      customInstructions: row.custom_instructions,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function parseJson<T>(value: string | T): T {
  return typeof value === "string" ? JSON.parse(value) : value;
}

interface TemplateRow {
  id: string;
  name: string;
  domain: string;
  priority_keywords: string | string[];
  section_weights: string | Record<string, number>;
  entity_preferences: string | Record<string, number>;
  extraction_rules: string | string[];
  system_prompt: string | undefined;
}

interface PreferenceRow {
  id: string;
  user_id: string | undefined;
  template_id: string | undefined;
  custom_keywords: string | string[];
  custom_weights: string | Record<string, number>;
  custom_instructions: string | undefined;
  created_at: string;
  updated_at: string;
}

export const CREATE_PREFERENCE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS domain_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  priority_keywords JSONB NOT NULL,
  section_weights JSONB NOT NULL,
  entity_preferences JSONB NOT NULL,
  extraction_rules JSONB NOT NULL,
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  template_id TEXT REFERENCES domain_templates(id),
  custom_keywords JSONB NOT NULL,
  custom_weights JSONB NOT NULL,
  custom_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pref_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_pref_template ON user_preferences(template_id);
`;

export function createPostgresPreferenceStore(
  client: PostgresClient,
): PostgresPreferenceStore {
  return new PostgresPreferenceStore(client);
}
