/**
 * PostgreSQL Knowledge Base Repository
 *
 * Production adapter for storing knowledge bases in PostgreSQL.
 * Uses raw SQL for maximum compatibility (no Prisma dependency in core).
 *
 * Schema:
 * ```sql
 * CREATE TABLE knowledge_bases (
 *   id TEXT PRIMARY KEY,
 *   filename TEXT NOT NULL,
 *   mime_type TEXT NOT NULL,
 *   hash TEXT NOT NULL,
 *   processed_at TIMESTAMPTZ NOT NULL,
 *   total_pages INTEGER NOT NULL,
 *   total_tokens INTEGER NOT NULL,
 *   tree JSONB NOT NULL,
 *   entities JSONB NOT NULL,
 *   relations JSONB NOT NULL,
 *   keywords JSONB NOT NULL,
 *   quotes JSONB NOT NULL,
 *   citations JSONB NOT NULL,
 *   metrics JSONB NOT NULL,
 *   description TEXT NOT NULL,
 *   key_insights JSONB NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_kb_hash ON knowledge_bases(hash);
 * CREATE INDEX idx_kb_filename ON knowledge_bases(filename);
 * CREATE INDEX idx_kb_tree_gin ON knowledge_bases USING GIN(tree);
 * CREATE INDEX idx_kb_entities_gin ON knowledge_bases USING GIN(entities);
 * ```
 */
import type { DocumentKnowledgeBase } from "vectorless";
export interface PostgresClient {
    query<T = unknown>(sql: string, params?: unknown[]): Promise<{
        rows: T[];
    }>;
    end(): Promise<void>;
}
export interface KnowledgeBaseRepositoryPort {
    save(kb: DocumentKnowledgeBase): Promise<void>;
    get(id: string): Promise<DocumentKnowledgeBase | null>;
    getByHash(hash: string): Promise<DocumentKnowledgeBase | null>;
    list(options?: {
        limit?: number;
        offset?: number;
    }): Promise<DocumentKnowledgeBase[]>;
    delete(id: string): Promise<boolean>;
    search(query: string, limit?: number): Promise<DocumentKnowledgeBase[]>;
}
export declare class PostgresKBRepository implements KnowledgeBaseRepositoryPort {
    private client;
    constructor(client: PostgresClient);
    save(kb: DocumentKnowledgeBase): Promise<void>;
    get(id: string): Promise<DocumentKnowledgeBase | null>;
    getByHash(hash: string): Promise<DocumentKnowledgeBase | null>;
    list(options?: {
        limit?: number;
        offset?: number;
    }): Promise<DocumentKnowledgeBase[]>;
    delete(id: string): Promise<boolean>;
    search(query: string, limit?: number): Promise<DocumentKnowledgeBase[]>;
    private rowToKB;
}
export declare const CREATE_KB_TABLE_SQL = "\nCREATE TABLE IF NOT EXISTS knowledge_bases (\n  id TEXT PRIMARY KEY,\n  filename TEXT NOT NULL,\n  mime_type TEXT NOT NULL,\n  hash TEXT NOT NULL,\n  processed_at TIMESTAMPTZ NOT NULL,\n  total_pages INTEGER NOT NULL,\n  total_tokens INTEGER NOT NULL,\n  tree JSONB NOT NULL,\n  entities JSONB NOT NULL,\n  relations JSONB NOT NULL,\n  keywords JSONB NOT NULL,\n  quotes JSONB NOT NULL,\n  citations JSONB NOT NULL,\n  metrics JSONB NOT NULL,\n  description TEXT NOT NULL,\n  key_insights JSONB NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW(),\n  updated_at TIMESTAMPTZ DEFAULT NOW()\n);\n\nCREATE INDEX IF NOT EXISTS idx_kb_hash ON knowledge_bases(hash);\nCREATE INDEX IF NOT EXISTS idx_kb_filename ON knowledge_bases(filename);\nCREATE INDEX IF NOT EXISTS idx_kb_tree_gin ON knowledge_bases USING GIN(tree);\nCREATE INDEX IF NOT EXISTS idx_kb_entities_gin ON knowledge_bases USING GIN(entities);\n";
export declare function createPostgresKBRepository(client: PostgresClient): PostgresKBRepository;
//# sourceMappingURL=postgres-kb-repository.d.ts.map